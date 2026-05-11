import type { Express } from "express";
import { ENV } from "./env";

/**
 * Storage proxy — serves Manus private storage files to the browser.
 *
 * Streams bytes server-side instead of redirecting to the signed CloudFront URL.
 * A redirect causes 403 in production because CloudFront rejects requests that
 * arrive via Cloudflare (different IP than the one that generated the signed URL).
 * By fetching server-side and piping the response, we avoid this entirely.
 *
 * Supports HTTP Range requests so browsers can seek/scrub videos.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: any, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
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
      const fileResp = await fetch(url, { headers: fetchHeaders });
      if (!fileResp.ok && fileResp.status !== 206) {
        console.error(`[StorageProxy] CDN error: ${fileResp.status} for key=${key}`);
        res.status(fileResp.status).send("CDN fetch error");
        return;
      }

      // Step 3: pipe headers and body to the browser
      const contentType = fileResp.headers.get("content-type") || "application/octet-stream";
      const contentLength = fileResp.headers.get("content-length");
      const contentRange = fileResp.headers.get("content-range");
      const acceptRanges = fileResp.headers.get("accept-ranges");

      res.status(fileResp.status); // 200 or 206
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600");
      res.set("Access-Control-Allow-Origin", "*");
      if (contentLength) res.set("Content-Length", contentLength);
      if (contentRange) res.set("Content-Range", contentRange);
      if (acceptRanges) res.set("Accept-Ranges", acceptRanges);
      else res.set("Accept-Ranges", "bytes");

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
  });
}
