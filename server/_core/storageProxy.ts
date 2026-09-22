import type { Express } from "express";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GENERIC_CONTENT_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
]);

/**
 * The private storage origin historically reports several public Wren files as
 * generic binary data. Chromium sniffs those files, while iOS Safari honors
 * the declared type (especially with nosniff) and rejects otherwise-valid
 * H.264 MP4 or PNG media. Preserve authoritative types, but correct generic
 * responses from known file extensions at the app-domain proxy boundary.
 */
export function resolveStorageContentType(key: string, upstreamContentType: string | null): string {
  const normalized = upstreamContentType?.split(";", 1)[0].trim().toLowerCase() ?? "";
  if (normalized && !GENERIC_CONTENT_TYPES.has(normalized)) return upstreamContentType ?? "application/octet-stream";

  const path = key.toLowerCase();
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return upstreamContentType || "application/octet-stream";
}

/**
 * Member-owned storage carries its owner id in the second key segment.
 * `captures/` remains protected as a legacy private namespace so historical
 * recordings cannot become public while new recordings live under `vault/`.
 */
export function privateStorageOwnerId(key: string): number | null {
  const match = /^(?:vault|captures)\/(\d+)(?:\/|$)/.exec(key);
  if (!match) return null;
  const userId = Number(match[1]);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
}

export function isPrivateStorageKey(key: string): boolean {
  return key.startsWith("vault/") || key.startsWith("captures/");
}

/**
 * Storage proxy — serves Manus private storage files to the browser.
 *
 * Streams bytes server-side instead of redirecting to the signed CloudFront URL.
 * A redirect causes 403 in production because CloudFront rejects requests that
 * arrive via Cloudflare (different IP than the one that generated the signed URL).
 * By fetching server-side and piping the response, we avoid this entirely.
 *
 * Supports HTTP Range requests so browsers can seek/scrub videos.
 *
 * SECURITY: keys that start with "vault/" or legacy "captures/" are private user files.
 * The request must carry a valid session cookie and the userId embedded
 * in the key must match the authenticated user. Public app assets
 * (Wren SVG/webp/mp4, etc.) have neither private prefix and are served
 * without authentication so unauthenticated users see the landing page.
 */
export function registerStorageProxy(app: Express) {
  const serveStorageKey = async (req: any, res: any) => {
    const key = req.params[0] as string | undefined;
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // SECURITY: vault and legacy capture files are private — require auth and
    // verify ownership. Public app assets (Wren SVG/webp/mp4, etc.) have no
    // private prefix and
    // are served freely so unauthenticated users see the landing page correctly.
    const isPrivateFile = isPrivateStorageKey(key);
    if (isPrivateFile) {
      try {
        const user = await sdk.authenticateRequest(req);
        const keyUserId = privateStorageOwnerId(key);
        if (keyUserId === null || keyUserId !== user.id) {
          res.status(403).send("Forbidden");
          return;
        }
      } catch {
        res.status(401).send("Unauthorized");
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      // Step 1: get the signed URL from Forge
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Step 2: fetch the actual file from CloudFront server-side,
      // forwarding the Range header so video seeking works
      const fetchHeaders: Record<string, string> = {};
      if (req.headers.range) {
        fetchHeaders["Range"] = req.headers.range as string;
      }
      const fileResp = await fetch(url, {
        method: req.method === "HEAD" ? "HEAD" : "GET",
        headers: fetchHeaders,
      });
      if (!fileResp.ok && fileResp.status !== 206) {
        console.error(`[StorageProxy] CDN error: ${fileResp.status} for key=${key}`);
        res.status(fileResp.status).send("CDN fetch error");
        return;
      }

      // Step 3: pipe headers and body to the browser
      const contentType = resolveStorageContentType(key, fileResp.headers.get("content-type"));
      const contentLength = fileResp.headers.get("content-length");
      const contentRange = fileResp.headers.get("content-range");
      const acceptRanges = fileResp.headers.get("accept-ranges");

      res.status(fileResp.status); // 200 or 206
      res.set("Content-Type", contentType);
      // Member-owned files are never cached or made readable cross-origin.
      // The app only uses same-origin media, so no `/api/media/*` response needs
      // a permissive Access-Control-Allow-Origin header.
      if (isPrivateFile) {
        res.set("Cache-Control", "private, no-store");
      } else {
        res.set("Cache-Control", "public, max-age=3600");
      }
      if (contentLength) res.set("Content-Length", contentLength);
      if (contentRange) res.set("Content-Range", contentRange);
      if (acceptRanges) res.set("Accept-Ranges", acceptRanges);
      else res.set("Accept-Ranges", "bytes");

      if (req.method === "HEAD") { res.end(); return; }
      if (!fileResp.body) { res.end(); return; }

      // Stream the response body with back-pressure handling
      const reader = fileResp.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            const canContinue = res.write(value);
            if (!canContinue) {
              await new Promise<void>(resolve => res.once("drain", resolve));
            }
          }
        } catch (err) {
          console.error("[StorageProxy] stream error:", err);
          if (!res.headersSent) res.status(502).end();
          else res.end();
        }
      };
      pump();
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      if (!res.headersSent) res.status(502).send("Storage proxy error");
    }
  };

  // `/manus-storage/*` remains available for existing app links. Public iOS Wren
  // media uses `/api/media/*` instead: the hosting edge intercepts the former and
  // returns a signed 307 before Express can stream it. The API path is not
  // intercepted, so Safari receives one same-origin response with the correct
  // video/image MIME type and byte-range headers.
  app.get("/manus-storage/*", serveStorageKey);
  app.head("/manus-storage/*", serveStorageKey);
  app.get("/api/media/*", serveStorageKey);
  app.head("/api/media/*", serveStorageKey);
}
