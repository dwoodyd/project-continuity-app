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
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Tailwind CSS-in-JS and shadcn/ui
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

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Rate limiting ────────────────────────────────────────────────────────────
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
  });

  // OAuth callback under /api/oauth/callback
  app.use("/api/oauth", oauthLimiter);
  registerOAuthRoutes(app);

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
  });
}

startServer().catch(console.error);
