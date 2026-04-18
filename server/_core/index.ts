import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startNotificationCron } from "../pushNotifications";
import { paypalRouter } from "../paypal";
import { startWeeklyDigestCron } from "../weeklyDigest";
import { getUserByOpenId } from "../db";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust the reverse proxy (Manus platform sits behind a load balancer that sets X-Forwarded-For)
  // This allows express-rate-limit to use the real client IP rather than the proxy IP.
  app.set("trust proxy", 1);

  // ── Domain redirect ──────────────────────────────────────────────────────────
  // Permanently redirect all traffic arriving via the manus.space domain to the
  // canonical personal domain. This ensures the Manus share card URL and any
  // old bookmarks automatically land on the correct address.
  const CANONICAL_DOMAIN = "continuary.soulengineer.online";
  const MANUS_DOMAINS = ["continuary.manus.space", "projcontinuity-vnvnaojz.manus.space"];
  app.use((req, res, next) => {
    const host = (req.headers["x-forwarded-host"] as string) || req.hostname;
    if (MANUS_DOMAINS.some((d) => host === d || host.endsWith("." + d))) {
      const redirectUrl = `https://${CANONICAL_DOMAIN}${req.originalUrl}`;
      return res.redirect(301, redirectUrl);
    }
    next();
  });

  // CDN domain used for all uploaded static assets (icons, OG images, vault files)
  const CDN_ORIGIN = "https://d2xsxph8kpxj0f.cloudfront.net";
  // Manus built-in API used for LLM, storage, and push services
  const FORGE_API_ORIGIN = process.env.BUILT_IN_FORGE_API_URL
    ? new URL(process.env.BUILT_IN_FORGE_API_URL).origin
    : "https://api.manus.im";

  // Security headers via Helmet
  app.use(
    helmet({
      // Explicit Content Security Policy — lock down to known origins only.
      // In development we allow 'unsafe-inline' and 'unsafe-eval' for Vite HMR;
      // in production every directive is tightly scoped.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: process.env.NODE_ENV === "production"
            ? ["'self'", CDN_ORIGIN]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'", CDN_ORIGIN],
          // SECURITY NOTE (Fix 4): 'unsafe-inline' is present in styleSrc for BOTH
          // development and production because Tailwind CSS-in-JS and shadcn/ui inject
          // styles at runtime via <style> tags that cannot be attributed to a nonce.
          //
          // Migration path to eliminate this:
          // 1. Switch from Tailwind JIT/CSS-in-JS to a build-time CSS extraction step
          //    (e.g. Tailwind CLI with --output, or Vite's postcss plugin) so all styles
          //    are in static .css files served from 'self'.
          // 2. For any remaining inline styles injected by shadcn/ui primitives (Radix),
          //    generate a per-request nonce in Express middleware, attach it to res.locals,
          //    and pass it to Helmet's contentSecurityPolicy.directives.styleSrc via a
          //    function: (req, res) => ["'self'", `'nonce-${res.locals.cspNonce}'`].
          // 3. Until step 1 is complete, 'unsafe-inline' in styleSrc is the accepted
          //    trade-off — it allows style injection but NOT script execution, so the
          //    XSS risk surface is limited to CSS-based attacks (e.g. data exfiltration
          //    via attribute selectors), not arbitrary JS execution.
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Tailwind CSS-in-JS and shadcn/ui (see note above)
            "https://fonts.googleapis.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            CDN_ORIGIN,
          ],
          imgSrc: [
            "'self'",
            "data:",           // Inline base64 images (canvas exports, avatars)
            "blob:",           // Canvas-generated share card blobs
            CDN_ORIGIN,
          ],
          mediaSrc: [
            "'self'",
            "blob:",           // Audio blobs from voice recording
            CDN_ORIGIN,
          ],
          connectSrc: [
            "'self'",
            CDN_ORIGIN,
            FORGE_API_ORIGIN,
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
            "https://www.paypal.com",
            "https://api-m.sandbox.paypal.com",
            "https://api-m.paypal.com",
            // Vite HMR websocket in development
            ...(process.env.NODE_ENV !== "production" ? ["ws://localhost:*", "wss://localhost:*"] : []),
          ],
          workerSrc: ["'self'", "blob:"], // Service worker + audio worklets
          childSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          // Prevent this page from being embedded in iframes (belt-and-suspenders with frameguard)
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
        },
      },
      // Prevent clickjacking
      frameguard: { action: "deny" },
      // Disable MIME sniffing
      noSniff: true,
      // Force HTTPS (only meaningful behind a TLS-terminating proxy)
      hsts: process.env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      // Prevent browsers from sending the Referer header to cross-origin destinations
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // Default body limit: 10 MB covers all JSON payloads.
  // Voice transcription uploads (audio blobs) are scoped to a higher 50 MB limit on their specific path.
  app.use("/api/trpc/vault.uploadAudio", express.json({ limit: "50mb" }));
  app.use("/api/trpc/vault.uploadAudio", express.urlencoded({ limit: "50mb", extended: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // ── Rate limiting ────────────────────────────────────────────────────────────
  //
  // SECURITY WARNING (Fix 2 & 5 — SINGLE-INSTANCE ONLY):
  // Both limiters below use express-rate-limit's default in-memory store.
  // This works correctly ONLY on a single-process, single-instance deployment.
  //
  // ⚠️  HORIZONTAL SCALING RISK: If this app is ever deployed behind a load balancer
  // with multiple Node.js processes or containers, each instance maintains its own
  // independent counter. The effective rate limit becomes (max * number_of_instances),
  // completely defeating the protection.
  //
  // BEFORE scaling horizontally, replace the default store with a shared Redis store:
  //   1. Install: pnpm add rate-limit-redis ioredis
  //   2. Import:  import RedisStore from "rate-limit-redis";
  //              import Redis from "ioredis";
  //   3. Replace: store: new RedisStore({ sendCommand: (...args) => redis.call(...args) })
  //      in BOTH oauthLimiter and apiLimiter configs below.
  //   4. Set REDIS_URL in environment secrets via webdev_request_secrets.
  //
  // Strict limit on the OAuth callback: 10 requests per 15 minutes per IP.
  // This prevents brute-force code enumeration and replay attacks.
  const oauthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    // trust proxy is set above — suppress the false-positive X-Forwarded-For warning
    validate: { xForwardedForHeader: false },
    message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
    // TODO (horizontal scaling): add store: new RedisStore(...) here
  });

  // Broader limit on the tRPC API: 300 requests per minute per IP.
  // Prevents automated scraping and runaway clients without affecting normal usage.
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    // trust proxy is set above — suppress the false-positive X-Forwarded-For warning
    validate: { xForwardedForHeader: false },
    message: { error: "Too many requests. Please slow down." },
    // TODO (horizontal scaling): add store: new RedisStore(...) here
  });

  // PayPal webhook
  app.use("/api/paypal", paypalRouter);
  // OAuth callback under /api/oauth/callback
  app.use("/api/oauth", oauthLimiter);
  registerOAuthRoutes(app);

  // ── Content-Type enforcement ────────────────────────────────────────────────
  // Reject POST/PUT/PATCH requests to the tRPC API that don't declare application/json.
  // This prevents content-type confusion attacks (e.g. multipart smuggling) and ensures
  // all mutation payloads are parsed by the JSON body parser above.
  // GET requests (tRPC queries) and the audio upload path are exempt.
  app.use("/api/trpc", (req, res, next) => {
    const method = req.method;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      // Audio upload path sends base64 JSON — already handled by the 50mb parser above, allow through
      if (req.path.includes("vault.uploadAudio") || req.path.includes("vault.addFile")) {
        return next();
      }
      const ct = req.headers["content-type"] ?? "";
      if (!ct.includes("application/json")) {
        res.status(415).json({ error: "Unsupported Media Type. Content-Type must be application/json." });
        return;
      }
    }
    next();
  });

  // tRPC API
  app.use(
    "/api/trpc",
    apiLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start push notification cron (fires every minute, aligned to wall-clock minutes)
    startNotificationCron();
    // Start weekly digest cron — sends Monday 8 AM summary to owner
    if (ENV.ownerOpenId) {
      getUserByOpenId(ENV.ownerOpenId).then((owner) => {
        if (owner) startWeeklyDigestCron(owner.id);
      }).catch(console.error);
    }
  });
}

startServer().catch(console.error);
