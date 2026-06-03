import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

/**
 * Build a runtime config script tag that injects server-side env vars into
 * the HTML before the React bundle loads. This is the correct pattern for
 * vars that are only available at server runtime (not at Vite build time).
 *
 * The frontend reads these via window.__RUNTIME_CONFIG__.KEY.
 */
function buildRuntimeConfigScript(): string {
  const config = {
    VITE_CLERK_PUBLISHABLE_KEY:
      process.env.VITE_CLERK_PUBLISHABLE_KEY ??
      process.env.CLERK_PUBLISHABLE_KEY ??
      "",
  };
  return `<script>window.__RUNTIME_CONFIG__ = ${JSON.stringify(config)};</script>`;
}

/**
 * Inject the runtime config script into the HTML just before </head>.
 */
function injectRuntimeConfig(html: string): string {
  return html.replace("</head>", `${buildRuntimeConfigScript()}</head>`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      // Inject runtime config before the app bundle
      template = injectRuntimeConfig(template);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html — inject runtime config on every request
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    try {
      let html = fs.readFileSync(indexPath, "utf-8");
      html = injectRuntimeConfig(html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch {
      res.sendFile(indexPath);
    }
  });
}
