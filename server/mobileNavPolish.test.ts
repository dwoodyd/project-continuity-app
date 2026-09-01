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
    expect(layout).toContain('paddingBottom: "max(env(safe-area-inset-bottom, 0px), 14px)"');
    expect(layout).toContain('min-h-[52px]');
  });

  it("uses opaque theme-matched navigation and reserves clear space for the mobile FAB", () => {
    const layout = source("client", "src", "components", "AppLayout.tsx");
    expect(layout).toContain('background: "var(--sidebar)"');
    expect(layout).toContain('color: "var(--sidebar-foreground)"');
    expect(layout).toContain('overscroll-contain pb-[calc(11rem+env(safe-area-inset-bottom))]');
    expect(layout).toContain('bottom: "calc(max(env(safe-area-inset-bottom, 0px), 14px) + 52px + 16px)"');
    expect(layout).toContain('min-h-[100svh] h-[100dvh]');
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

  it("stacks immersive heroes and Focus controls on mobile without changing their desktop composition", () => {
    const scene = source("client", "src", "components", "IntroWrenScene.tsx");
    const focus = source("client", "src", "pages", "FocusSessionsPage.tsx");
    const evidence = source("client", "src", "pages", "EvidenceLogPage.tsx");
    expect(scene).toContain('w-full max-w-none overflow-hidden');
    expect(scene).toContain('md:w-[calc(100%+4rem)] md:-mx-8');
    expect(scene).toContain('h-56 w-full object-cover mix-blend-screen md:inset-0 md:h-full');
    expect(scene).toContain('w-full min-w-0 max-w-none flex-col');
    expect(scene).toContain('md:max-w-[45%] md:min-w-[19rem]');
    expect(evidence).toContain('bleed');
    expect(focus).toContain('flex flex-1 flex-col overflow-x-hidden md:grid');
    expect(focus).toContain('flex flex-1 flex-col overflow-x-hidden md:flex-row');
    expect(focus).toContain('hidden sm:flex items-center gap-2');
    expect(focus).toContain('relative min-h-[18rem] min-w-0 overflow-hidden md:min-h-0');
  });

  it("keeps the capture FAB clear of mobile body content and out of full-screen Focus work", () => {
    const layout = source("client", "src", "components", "AppLayout.tsx");
    expect(layout).toContain('pb-[calc(11rem+env(safe-area-inset-bottom))]');
    expect(layout).toContain('{!isFocusRoute && <div');
    expect(layout).toContain('{!isFocusRoute && fabMenuOpen && (');
  });

  it("keeps Round 3 containers centered and tour headers, thumbnails, and footer clear on phones", () => {
    const locks = source("client", "src", "pages", "ThreadLocksPage.tsx");
    const weekly = source("client", "src", "pages", "WeeklyReviewPage.tsx");
    const tour = source("client", "src", "pages", "TourPage.tsx");
    expect(locks).toContain('w-full max-w-2xl mx-auto px-4 py-6');
    expect(weekly).toContain('flex flex-col items-center gap-3 text-center sm:flex-row');
    expect(weekly).toContain('WREN_SURFACE_MEDIA.weeklyReview.clip');
    expect(tour).toContain('src={WREN_STILLS.siliconeLogo}');
    expect(tour).toContain('flex flex-col items-center gap-3 text-center sm:flex-row');
    expect(tour).toContain('mx-auto max-w-3xl px-4 pt-28 pb-36');
    expect(tour).toContain('fixed bottom-0 inset-x-0 z-40 flex justify-center px-4 py-3');
  });
});
