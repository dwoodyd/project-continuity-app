/**
 * Playwright configuration for Continuary E2E tests.
 *
 * Design decisions:
 *  - Single project (chromium) — keeps CI fast; add webkit/firefox when needed.
 *  - globalSetup seeds the test user + mints a JWT cookie before any test runs.
 *  - globalTeardown deletes today's check-ins so re-runs start clean.
 *  - storageState is written by globalSetup and consumed per-test via
 *    `test.use({ storageState })` in the spec file.
 *  - baseURL points at the local dev server (must be running: `pnpm dev`).
 *  - webServer block auto-starts the dev server if it isn't already up.
 */

import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",

  /* Fail fast on CI; keep going locally for easier debugging */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // check-in tests are sequential (morning → midday → evening)

  /* Reporter: pretty for local, GitHub-friendly for CI */
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "on-failure" }]],

  use: {
    baseURL: "http://localhost:3000",
    /* Capture artifacts on failure for debugging */
    screenshot: "only-on-failure",
    video:      "retain-on-failure",
    trace:      "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup:    path.join(__dirname, "e2e/global-setup.ts"),
  globalTeardown: path.join(__dirname, "e2e/global-teardown.ts"),

  /* Auto-start the dev server if not already running */
  webServer: {
    command: "pnpm dev",
    url:     "http://localhost:3000",
    reuseExistingServer: true, // don't restart if already up
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
