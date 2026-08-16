import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("public-surface audit regressions", () => {
  it("keeps the home-only splash brief and silent before user interaction", () => {
    const splash = projectFile("client", "src", "components", "AnimatedSplash.tsx");
    const app = projectFile("client", "src", "App.tsx");
    expect(splash).not.toContain("AudioContext");
    expect(splash).toContain("setTimeout(onComplete, 980)");
    expect(app).toContain("!splashDone && isHomeGate");
  });

  it("keeps executable inline scripts out of the CSP-protected HTML shell", () => {
    const html = projectFile("client", "index.html");
    const welcome = projectFile("client", "src", "pages", "WelcomePage.tsx");
    expect(html).not.toMatch(/<script>\s*\(function/);
    expect(welcome).not.toContain("<style>{`");
  });

  it("preserves title de-duplication and mobile-safe pricing layout", () => {
    const meta = projectFile("client", "src", "components", "PageMeta.tsx");
    const pricing = projectFile("client", "src", "pages", "ProPage.tsx");
    expect(meta).toContain('title.includes("Continuary")');
    expect(pricing).toContain('flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between');
    expect(pricing).not.toContain("whitespace-nowrap");
    expect(pricing).toContain('aria-label="Back to Continuary home"');
  });
});
