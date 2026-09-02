import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("Continuary interaction and motion polish", () => {
  it("centralizes quick thread-settle motion and keeps travel restricted to transform and opacity", () => {
    const css = source("client", "src", "index.css");

    expect(css).toContain("--motion-gentle: 280ms");
    expect(css).toContain("--ease-thread: cubic-bezier(0.22, 1, 0.36, 1)");
    expect(css).toContain("transition-property: transform, opacity");
    expect(css).toContain("@keyframes threadSettle");
    expect(css).toContain(".thread-return-settle");
    expect(css).toContain(".thread-list-settle > *");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("uses the existing Vaul primitive for compact More navigation while excluding Focus from route-motion wrapping", () => {
    const layout = source("client", "src", "components", "AppLayout.tsx");

    expect(layout).toContain('from "./ui/drawer"');
    expect(layout).toContain('<Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} direction="left">');
    expect(layout).toContain("native drag, velocity-dismiss, scrim, and scroll-lock behavior");
    expect(layout).toContain('{isFocusRoute ? children : <div key={location} className="route-thread-enter">{children}</div>}');
  });

  it("makes dashboard customization and check-in acknowledgement calm, reversible secondary interactions", () => {
    const home = source("client", "src", "pages", "Home.tsx");

    expect(home).toContain('<Drawer open={customizeOpen} onOpenChange={setCustomizeOpen} direction="bottom">');
    expect(home).toContain('notify.saved("Held."');
    expect(home).toContain('className="border-0 rounded-none thread-return-settle"');
    expect(home).toContain("checkin-held-settle fixed inset-0");
    expect(home).toContain("thread-list-settle space-y-2");
  });

  it("leaves Focus PiP handoff mechanics intact", () => {
    const popout = source("client", "src", "components", "WrenPopout.tsx");

    expect(popout).toContain("documentPictureInPicture");
    expect(popout).toContain('BroadcastChannel("wren-focus-companion")');
    expect(popout).toContain("window.open(");
    expect(popout).toContain('"/focus-companion",');
  });
});
