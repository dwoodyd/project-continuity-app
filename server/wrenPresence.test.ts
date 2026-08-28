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
    expect(player).toContain('fallbackStill && (!videoReady || prefersReducedMotion || videoFailed)');
    expect(player).toContain('WREN_STILLS[fallbackStill ?? "siliconeNeutral"]');
    expect(player).toContain('{!prefersReducedMotion && !videoFailed && (');
  });

  it("uses the reusable Intro-scale scene at the selected return and introduction moments", () => {
    const home = source("client/src/pages/Home.tsx");
    const welcome = source("client/src/pages/WelcomePage.tsx");
    const about = source("client/src/pages/AboutAppPage.tsx");
    const onboarding = source("client/src/pages/OnboardingPage.tsx");
    const scene = source("client/src/components/IntroWrenScene.tsx");
    expect(home).toContain("<IntroWrenScene");
    expect(home).toContain("src={WREN_CLIPS.tuggingThread}");
    expect(home).toContain("You have been away for a while. Your thread is still here.");
    expect(home).toContain('new URLSearchParams(window.location.search).get("return-brief") === "1"');
    expect(home).toContain("Preview return brief");
    expect(home).toContain("Close preview");
    expect(home).toContain('variant="return"');
    expect(home).toContain('showReturnBrief ? "max-w-none" : "max-w-4xl mx-auto"');
    expect(scene).toContain("video.play().catch(() => {})");
    expect(scene).toContain("absolute inset-0 h-full w-full object-cover mix-blend-screen");
    expect(scene).toContain('variant?: "standard" | "return"');
    expect(scene).toContain('bleed?: boolean');
    expect(scene).toContain('data-wren-scene={bleed ? "edge-bleed" : "contained"}');
    expect(scene).toContain('w-[calc(100%+2.5rem)] -mx-5');
    expect(scene).toContain("border-0 rounded-none");
    expect(scene).toContain("bg-[linear-gradient(90deg,rgba(22,24,21,0.98)");
    expect(welcome).toContain('<WrenPlayer clip="evidenceClean" size="hero" stage={false} feather');
    expect(about).toContain('<WrenPlayer clip="popsHead" size="hero" stage={false} feather');
    expect(onboarding).toContain('<SmoothLoopVideo src={WREN_CLIPS.dropsAndHovers}');
    expect(onboarding).toContain('videoRef.current?.play().catch(() => {})');
    expect(onboarding).toContain('"\\u00A0"');
  });

  it("keeps Wren at Intro scale only on approved non-Focus emotional routes", () => {
    const home = source("client/src/pages/Home.tsx");
    const projects = source("client/src/pages/ProjectsPage.tsx");
    const cycle = source("client/src/pages/EmotionalCyclePage.tsx");
    const evidence = source("client/src/pages/EvidenceLogPage.tsx");
    const compass = source("client/src/pages/WeeklyCompassPage.tsx");
    const appLayout = source("client/src/components/AppLayout.tsx");
    const tour = source("client/src/pages/TourPage.tsx");
    const about = source("client/src/pages/AboutAppPage.tsx");
    const vault = source("client/src/pages/VaultPage.tsx");
    const clarity = source("client/src/pages/ClarityEnginePage.tsx");
    const scratch = source("client/src/pages/ScratchPadPage.tsx");
    const focus = source("client/src/pages/FocusSessionsPage.tsx");
    const companion = source("client/src/pages/FocusCompanionPage.tsx");
    const popout = source("client/src/components/WrenPopout.tsx");
    const todayGreeting = source("client/src/components/TodayGreetingWren.tsx");
    expect(home).toContain('const greetingWrenClip = hour < 12 ? "popsHead" : hour < 17 ? "holdingOrb" : "closesEyes"');
    expect(home).toContain('data-testid="today-greeting-wren"');
    expect(home).toContain('h-[102px] w-[102px]');
    expect(home).toContain('className="h-[102px] w-[102px] shrink-0 overflow-hidden bg-transparent"');
    expect(home).toContain('<TodayGreetingWren clip={greetingWrenClip} />');
    expect(todayGreeting).toContain('video.play().catch(() => {})');
    expect(todayGreeting).toContain('radial-gradient(ellipse 76% 82%');
    expect(home).not.toContain("wren-ambient-card");
    expect(projects).not.toContain("WrenPlayer");
    expect(cycle).not.toContain("WrenPlayer");
    expect(cycle).toContain("{/* Cycle analysis */}");
    expect(evidence).toContain("src={WREN_CLIPS.evidenceClean}");
    expect(evidence).toContain("poster={WREN_STILLS.evidenceCleanPoster}");
    expect(evidence).toContain("bleed");
    expect(evidence).toContain('variant="return"');
    expect(evidence).toContain('className="evidence-main-pane min-h-[min(84vh,860px)]"');
    expect(source("client/src/index.css")).toContain(".evidence-main-pane");
    expect(source("client/src/index.css")).toContain("width: calc(100vw - 15rem) !important");
    expect(compass).toContain("src={WREN_CLIPS.memoryOrb}");
    expect(compass).toContain("bleed");
    expect(appLayout).toContain('{location === "/focus" && (');
    expect(tour).toContain('<WrenPlayer clip="luminousFloats" size="xl" stage={false} feather');
    expect(tour).toContain('<WrenPlayer clip="hoveringArchway" size="xl" stage={false} feather');
    expect(tour).toContain('<WrenPlayer clip={wren} size="sm" stage={false} feather');
    expect(about).toContain('clip="luminousFloats"');
    expect(about).toContain('stage={false}');
    expect(about).not.toContain('WrenPlayer clip={clip} size="full"');
    expect(vault).toContain('<WrenPlayer clip="hoversJournal" size="full"');
    expect(clarity).toContain("src={WREN_CLIPS.perchedDoc}");
    expect(clarity).toContain("You do not have to untangle it alone.");
    expect(clarity).toContain("bleed");
    expect(scratch).toContain('<WrenPlayer clip="bouncingFunClean" size="full"');
    expect(focus).toContain("ACTIVITY_CLIP[wrenActivity]");
    expect(focus).toContain('fallbackStill="siliconeNeutral"');
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

  it("keeps above-the-fold Wren media poster-backed and routes Evidence through the managed recovered asset", () => {
    const clips = source("client/src/lib/wrenClips.ts");
    const player = source("client/src/components/WrenPlayer.tsx");
    const introScene = source("client/src/components/IntroWrenScene.tsx");
    expect(clips).toContain("export const WREN_LIGHTWEIGHT_MEDIA");
    expect(clips).toContain("MANAGED_WREN_VIDEO");
    expect(clips).toContain("MANAGED_WREN_POSTER");
    expect(clips).toContain("evidenceClean:       MANAGED_WREN_VIDEO");
    expect(clips).toContain("returnPortraitPoster: MANAGED_WREN_POSTER");
    expect(player).toContain("poster?: string");
    expect(player).toContain("const isProtectedFocusClip");
    expect(player).toContain("poster={resolvedPoster}");
    expect(introScene).toContain("const [videoFailed, setVideoFailed] = useState(false)");
    expect(introScene).toContain("onError={() => setVideoFailed(true)}");
    expect(introScene).toContain("videoFailed && resolvedPoster");
  });
});
