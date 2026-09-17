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

  it("keeps marketing-aligned ivory and navy tokens for both app modes", () => {
    const css = source("client/src/index.css");
    expect(css).toContain("--background: #FDF9F0");
    expect(css).toContain(".dark {");
    expect(css).toContain("--background: #080F26");
    expect(css).toContain("--primary: #EFA201");
    expect(css).toContain("--accent-tint-text: #F6BE53");
    expect(css).toContain("'Cormorant Garamond', Georgia, serif");
  });

  it("does not route public discovery outside the persisted app theme", () => {
    expect(source("client/src/pages/LandingPage.tsx")).toContain("return <WelcomePage />");
    const appLayout = source("client/src/components/AppLayout.tsx");
    expect(appLayout).toContain('href="/tour"');
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
    expect(source("client/src/index.css")).toContain("--ground: #080F26");
  });

  it("maps existing Wren assets to the product moments they were commissioned for", () => {
    const home = source("client/src/pages/Home.tsx");
    const evidence = source("client/src/pages/EvidenceLogPage.tsx");
    const clips = source("client/src/lib/wrenClips.ts");
    expect(home).toContain("WREN_SURFACE_MEDIA.returnBrief.clip");
    expect(clips).toContain('tuggingThread:      `${BASE}/wren_tugging_thread_7bf624a9.mp4`');
    expect(evidence).toContain("WREN_SURFACE_MEDIA.evidenceLog.clip");
    expect(evidence).toContain("WREN_SURFACE_MEDIA.evidenceLog.fallbackStill");
    const focus = source("client/src/pages/FocusSessionsPage.tsx");
    expect(focus).toContain('clip={ACTIVITY_CLIP[wrenActivity]}');
    expect(focus).toContain('fallbackStill="siliconeNeutral"');
    const memory = source("client/src/pages/WhatWrenRemembersPage.tsx");
    expect(memory).toContain('clip="memoryOrb"');
  });

  it("keeps the sign-in doorway marketing-aligned and free of fabricated social proof", () => {
    const appLayout = source("client/src/components/AppLayout.tsx");
    expect(appLayout).toContain("background:'#080F26'");
    expect(appLayout).toContain("background:'#0D1730'");
    expect(appLayout).toContain("background:'#EFA201'");
    expect(appLayout).toContain("color:'#080F26'");
    expect(appLayout).toContain("'Cormorant Garamond', Georgia, serif");
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
