import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("mobile navigation and polish", () => {
  it("reuses the grouped sidebar in a dismissible mobile drawer with core bottom tabs", () => {
    const layout = source("client", "src", "components", "AppLayout.tsx");
    expect(layout).toContain('const [mobileNavOpen, setMobileNavOpen] = useState(false)');
    expect(layout).toContain('id="mobile-navigation-drawer"');
    expect(layout).toContain('aria-label="Open navigation"');
    expect(layout).toContain('aria-label="Close navigation"');
    expect(layout).toContain('NAV_GROUPS.map((group)');
    expect(layout).toContain('href: "__more__",  label: "More"');
    expect(layout).toContain('paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)"');
    expect(layout).toContain('min-h-[52px]');
  });

  it("uses opaque theme-matched navigation and reserves clear space for the mobile FAB", () => {
    const layout = source("client", "src", "components", "AppLayout.tsx");
    expect(layout).toContain('background: "var(--sidebar)"');
    expect(layout).toContain('color: "var(--sidebar-foreground)"');
    expect(layout).toContain('overscroll-contain pb-24 pr-16');
    expect(layout).toContain('bottom: "calc(max(env(safe-area-inset-bottom, 0px), 8px) + 52px + 16px)"');
  });

  it("uses readable Welcome surfaces and an unwatermarked managed clip", () => {
    const welcome = source("client", "src", "pages", "WelcomePage.tsx");
    const css = source("client", "src", "index.css");
    expect(welcome).toContain('clip="evidenceClean"');
    expect(welcome).toContain('fallbackStill="evidenceCleanPoster"');
    expect(welcome).not.toContain('clip="popsHead" size="hero"');
    expect(welcome).toContain('text-foreground leading-[1.1]');
    expect(welcome).toContain('bg-muted');
    expect(css).toContain('.public-theme-surface .text-\\[\\#6B6F68\\]');
  });

  it("does not render an app-owned media player over pricing tiers", () => {
    const pricing = source("client", "src", "pages", "ProPage.tsx");
    expect(pricing).not.toContain("WrenPlayer");
    expect(pricing).not.toContain("<audio");
    expect(pricing).not.toContain("<video");
  });

  it("keeps app entry actions reachable and vertically centers the sign-in surface", () => {
    const layout = source("client", "src", "components", "AppLayout.tsx");
    expect(layout).toContain('min-h-[100dvh]');
    expect(layout).toContain('Claim your founding seat');
    expect(layout).toContain('href="/apply"');
    expect(layout).toContain('href="/tour"');
    expect(layout).toContain('Take the tour');
  });
});
