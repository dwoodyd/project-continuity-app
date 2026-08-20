import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Wren presence and coherent voice", () => {
  it("keeps functional video sizes compact and adds responsive hero tiers", () => {
    const player = source("client/src/components/WrenPlayer.tsx");
    expect(player).toContain('xs:    "w-16 h-16"');
    expect(player).toContain('sm:    "w-24 h-24"');
    expect(player).toContain('md:    "w-36 h-36"');
    expect(player).toContain('lg:    "w-52 h-52"');
    expect(player).toContain('xl:    "w-72 h-72"');
    expect(player).toContain('"2xl": "w-96 h-96"');
    expect(player).toContain('hero:  "w-[clamp(240px,32vw,440px)] h-[clamp(240px,32vw,440px)]"');
    expect(player).toContain('heroLg:"w-[clamp(300px,42vw,560px)] h-[clamp(300px,42vw,560px)]"');
    expect(player).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(player).toContain('fallbackStill && (!videoReady || prefersReducedMotion)');
    expect(player).toContain('{!prefersReducedMotion && (');
  });

  it("uses full-bleed, text-safe Wren scenes at the selected return and introduction moments", () => {
    const home = source("client/src/pages/Home.tsx");
    const welcome = source("client/src/pages/WelcomePage.tsx");
    const about = source("client/src/pages/AboutAppPage.tsx");
    const onboarding = source("client/src/pages/OnboardingPage.tsx");
    const styles = source("client/src/index.css");
    expect(home).toContain('clip="tuggingThread"');
    expect(home).toContain('className="wren-field"');
    expect(home).toContain('objectFit="cover"');
    expect(home).toContain('sm:max-w-[45%]');
    expect(styles).toContain('.wren-field');
    expect(styles).toContain('inset: 0 0 0 45%');
    expect(styles).toContain('border: 0;');
    expect(styles).toContain('border-radius: 0;');
    expect(welcome).toContain('<WrenPlayer clip="popsHead" size="hero" stage={false} feather');
    expect(about).toContain('<WrenPlayer clip="popsHead" size="hero" stage={false} feather');
    expect(onboarding).toContain('<SmoothLoopVideo src={WREN_CLIPS.dropsAndHovers}');
  });

  it("restores ambient video presence without changing Focus body-doubling surfaces", () => {
    const home = source("client/src/pages/Home.tsx");
    const project = source("client/src/pages/ProjectDetailPage.tsx");
    const tour = source("client/src/pages/TourPage.tsx");
    const about = source("client/src/pages/AboutAppPage.tsx");
    const vault = source("client/src/pages/VaultPage.tsx");
    const clarity = source("client/src/pages/ClarityEnginePage.tsx");
    const scratch = source("client/src/pages/ScratchPadPage.tsx");
    const focus = source("client/src/pages/FocusSessionsPage.tsx");
    const companion = source("client/src/pages/FocusCompanionPage.tsx");
    const popout = source("client/src/components/WrenPopout.tsx");
    expect(home).toContain('const wrenClip = hour < 12 ? "popsHead" : hour < 17 ? "holdingOrb" : "closesEyes"');
    expect(home).not.toContain('greetingWrenClip');
    expect(home).not.toContain('wrapperClassName="shrink-0 w-20 h-20 sm:w-24 sm:h-24"');
    expect(project).toContain('<WrenPlayer clip="popsHead" size="xs"');
    expect(tour).toContain('<WrenPlayer clip="luminousFloats" size="xl" stage={false} feather');
    expect(tour).toContain('<WrenPlayer clip="hoveringArchway" size="xl" stage={false} feather');
    expect(tour).toContain('<WrenPlayer clip={wren} size="sm" stage={false} feather');
    expect(about).toContain('clip="luminousFloats"');
    expect(about).toContain('stage={false}');
    expect(about).not.toContain('WrenPlayer clip={clip} size="full"');
    expect(vault).toContain('<WrenPlayer clip="hoversJournal" size="full"');
    expect(clarity).toContain('<WrenPlayer clip="perchedDoc" size="full"');
    expect(scratch).toContain('<WrenPlayer clip="bouncingFunClean" size="full"');
    expect(focus).toContain("cornerWave");
    expect(companion).toContain("weaving");
    expect(popout).toContain("weaving");
    expect(focus).not.toContain('size="hero"');
    expect(companion).not.toContain('size="hero"');
    expect(popout).not.toContain('size="hero"');
  });

  it("uses the dial-derived bucket in legacy concise prompt consumers", () => {
    const checkIns = source("server/routers/checkIns.ts");
    const intelligence = source("server/routers/intelligence.ts");
    expect(checkIns).toContain('import { getWrenToneBucket } from "../wrenTone"');
    expect(checkIns).not.toContain("profile?.tonePreference");
    expect(intelligence).toContain('import { getWrenToneBucket } from "../wrenTone"');
    expect(intelligence).not.toContain("profile?.tonePreference");
    expect(intelligence).not.toContain("tonePreference: z.enum");
  });

  it("keeps quick presets and fine-tuning in one discoverable settings system", () => {
    const settings = source("client/src/pages/SettingsPage.tsx");
    const clientTone = source("client/src/lib/wrenToneClient.ts");
    const sidebar = source("client/src/components/AppLayout.tsx");
    expect(settings).toContain('id="wren-tone"');
    expect(settings).toContain("WREN_TONE_PRESETS");
    expect(settings).toContain("Tune how Wren talks →");
    expect(settings).toContain("openWrenTone");
    expect(clientTone).toContain("export const WREN_TONE_PRESETS");
    expect(sidebar).toContain('/settings?tab=preferences#wren-tone');
  });
});
