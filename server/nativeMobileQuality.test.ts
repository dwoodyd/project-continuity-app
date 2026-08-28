import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("native-quality mobile baseline", () => {
  it("gives inputs keyboard-safe scroll clearance and interactive controls immediate touch feedback", () => {
    const css = source("client", "src", "index.css");
    expect(css).toContain('scroll-padding-block: max(1rem, env(safe-area-inset-top)) max(8rem, env(safe-area-inset-bottom))');
    expect(css).toContain('scroll-margin-block: max(5rem, var(--safe-top)) max(9rem, var(--safe-bottom))');
    expect(css).toContain('touch-action: manipulation');
    expect(css).toContain('[data-slot="button"]:not(:disabled):active');
    expect(css).toContain('transform: scale(0.98)');
  });

  it("keeps shared motion and mobile body behavior deliberate", () => {
    const css = source("client", "src", "index.css");
    expect(css).toContain('overscroll-behavior-y: contain');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.skeleton');
    expect(css).toContain('animation: shimmer');
  });

  it("retains poster-backed Wren media and opaque safe-area-aware mobile chrome", () => {
    const layout = source("client", "src", "components", "AppLayout.tsx");
    const scene = source("client", "src", "components", "IntroWrenScene.tsx");
    expect(layout).toContain('background: "var(--sidebar)"');
    expect(layout).toContain('paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)"');
    expect(scene).toContain('poster={resolvedPoster}');
    expect(scene).toContain('onError={() => setVideoFailed(true)}');
  });

  it("declares a standalone, portrait PWA with maskable icons and aligned launch chrome", () => {
    const index = source("client", "index.html");
    const manifest = source("client", "public", "manifest.json");
    expect(index).toContain('viewport-fit=cover');
    expect(index).toContain('name="theme-color" content="#161815"');
    expect(index).toContain('apple-mobile-web-app-capable" content="yes"');
    expect(manifest).toContain('"display": "standalone"');
    expect(manifest).toContain('"orientation": "portrait"');
    expect(manifest).toContain('"theme_color": "#161815"');
    expect(manifest).toContain('"purpose": "any maskable"');
  });

  it("keeps the install prompt and loading shell theme-aware, non-blocking, and compact-safe", () => {
    const install = source("client", "src", "components", "PWAInstallBanner.tsx");
    const skeleton = source("client", "src", "components", "DashboardLayoutSkeleton.tsx");
    const layout = source("client", "src", "components", "AppLayout.tsx");
    expect(install).toContain('beforeinstallprompt');
    expect(install).toContain('pb-[calc(1rem+env(safe-area-inset-bottom))]');
    expect(install).toContain('min-h-11');
    expect(install).toContain('background: "var(--popover)"');
    expect(skeleton).toContain('hidden md:block w-[280px]');
    expect(skeleton).toContain('flex-1 min-w-0 p-4');
    expect(layout).toContain('isFocusRoute || !isDesktopMode ? undefined : { scrollbarGutter: "stable" }');
  });

  it("uses a shared 8pt-oriented mobile design foundation rather than introducing new one-off values", () => {
    const css = source("client", "src", "index.css");
    expect(css).toContain('--space-3: 1rem');
    expect(css).toContain('--space-4: 1.5rem');
    expect(css).toContain('--tap-target: 44px');
    expect(css).toContain('--safe-bottom: max(0px, env(safe-area-inset-bottom))');
    expect(css).toContain('--motion-standard: 220ms');
    expect(css).toContain('--elevation-card:');
  });
});
