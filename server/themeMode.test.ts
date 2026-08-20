import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("permanent dual-theme contract", () => {
  it("enables persisted theme switching at the application root", () => {
    expect(source("client/src/App.tsx")).toContain('<ThemeProvider defaultTheme="dark" switchable>');
    const context = source("client/src/contexts/ThemeContext.tsx");
    expect(context).toContain('localStorage.getItem("theme")');
    expect(context).toContain('localStorage.setItem("theme", theme)');
    expect(context).toContain('prev === "light" ? "dark" : "light"');
  });

  it("keeps intentional Studio Wall tokens for both light and dark modes", () => {
    const css = source("client/src/index.css");
    expect(css).toContain("--background: #F4F5F2");
    expect(css).toContain(".dark {");
    expect(css).toContain("--background: #161815");
    expect(css).toContain("--primary: #E8A030");
    expect(css).toContain("--accent-tint-text: #F3BF68");
  });

  it("does not route public discovery outside the persisted app theme", () => {
    expect(source("client/src/pages/LandingPage.tsx")).toContain("return <WelcomePage />");
    const appLayout = source("client/src/components/AppLayout.tsx");
    expect(appLayout).toContain('href="/welcome"');
    expect(appLayout).not.toContain('oklch(0.93 0.008 264)');
    expect(appLayout).not.toContain("text-muted-foreground/40 hover:text-muted-foreground/70");
  });

  it("keeps critical public badges and Wren stages contrast-safe", () => {
    const pricing = source("client/src/pages/ProPage.tsx");
    expect(pricing).toContain("bg-[#DDE0DA]");
    expect(pricing).not.toContain("text-emerald-400 text-xs font-bold bg-emerald-400/10");
    const wren = source("client/src/components/WrenPlayer.tsx");
    expect(wren).toContain("stage = true");
    expect(wren).toContain('stage && "wren-dark-stage"');
    expect(source("client/src/index.css")).toContain(".wren-dark-stage {");
    expect(source("client/src/index.css")).toContain("background: var(--ground)");
    expect(source("client/src/index.css")).toContain("--ground: #161815");
  });

  it("maps existing Wren assets to the product moments they were commissioned for", () => {
    const home = source("client/src/pages/Home.tsx");
    const clips = source("client/src/lib/wrenClips.ts");
    expect(home).toContain('clip="returnPortrait"');
    expect(clips).toContain('returnPortrait:      `/manus-storage/wren-return-portrait_c50441dc.mp4`');
    expect(home).toContain('clip="blobJournal"');
    const focus = source("client/src/pages/FocusSessionsPage.tsx");
    expect(focus).toContain('clip="cornerWave"');
    const memory = source("client/src/pages/WhatWrenRemembersPage.tsx");
    expect(memory).toContain('clip="memoryOrb"');
  });

  it("keeps the sign-in doorway quiet, light, and free of fabricated social proof", () => {
    const appLayout = source("client/src/components/AppLayout.tsx");
    expect(appLayout).toContain("background:'#F4F5F2'");
    expect(appLayout).toContain("background:'#E6E8E3'");
    expect(appLayout).toContain("background:'#C8452B'");
    expect(appLayout).not.toContain('["JK","AM","TR","SL","OB"]');
    expect(appLayout).not.toContain("memberCountData?.count ?? 47");
  });

  it("uses a lighter accent step when accent-tinted surfaces carry text", () => {
    const home = source("client/src/pages/Home.tsx");
    const appLayout = source("client/src/components/AppLayout.tsx");
    expect(home).toContain('color: "var(--accent-tint-text)"');
    expect(appLayout).toContain('active ? "var(--accent-tint-text)"');
    expect(home).not.toContain('style={{ background: "oklch(0.56 0.18 28 / 0.08)", color: "oklch(0.56 0.18 28 / 0.65)" }}');
  });
});
