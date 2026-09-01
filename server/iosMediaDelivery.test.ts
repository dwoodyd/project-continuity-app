import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WREN_CLIPS, WREN_STILLS } from "../client/src/lib/wrenClips";
import { resolveStorageContentType } from "./_core/storageProxy";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("iOS Wren media delivery", () => {
  it("normalizes generic storage MIME responses without losing byte-range support", () => {
    expect(resolveStorageContentType("wren/example.mp4", "application/octet-stream")).toBe("video/mp4");
    expect(resolveStorageContentType("wren/example.png", "binary/octet-stream")).toBe("image/png");
    expect(resolveStorageContentType("wren/example.jpg", "application/octet-stream")).toBe("image/jpeg");
    expect(resolveStorageContentType("wren/example.mp4", "video/mp4")).toBe("video/mp4");
  });

  it("uses an iOS-compatible MP4 letter source and supported poster format", () => {
    expect(WREN_CLIPS.tourLetter).toMatch(/\.mp4$/);
    expect(WREN_STILLS.evidenceCleanPoster).toMatch(/\.(jpg|jpeg)$/);
  });

  it("keeps every direct Wren video path poster-backed, explicitly typed, and guarded after media failure", () => {
    for (const relativePath of [
      "client/src/components/WrenPlayer.tsx",
      "client/src/components/TodayGreetingWren.tsx",
      "client/src/components/IntroWrenScene.tsx",
      "client/src/pages/OnboardingPage.tsx",
      "client/src/components/WrenIntroMoment.tsx",
      "client/src/components/WrenThinking.tsx",
      "client/src/components/WrenPopout.tsx",
      "client/src/pages/FocusCompanionPage.tsx",
    ]) {
      const source = readProjectFile(relativePath);
      expect(source).toContain('preload="metadata"');
      expect(source).toContain('type="video/mp4"');
      expect(source).toContain("onError={() => setPosterFailed(true)}");
    }
  });

  it("uses dynamic viewport sizing and safe-bottom clearance for the compact iOS shell", () => {
    const shell = readProjectFile("client/src/components/AppLayout.tsx");
    expect(shell).toContain("min-h-[100svh] h-[100dvh]");
    expect(shell).toContain('paddingBottom: "max(env(safe-area-inset-bottom, 0px), 14px)"');
    expect(shell).toContain('bottom: "calc(max(env(safe-area-inset-bottom, 0px), 14px) + 52px + 16px)"');

    const serviceWorker = readProjectFile("client/public/sw.js");
    expect(serviceWorker).toContain('const CACHE_VERSION = "continuity-v8"');
    expect(serviceWorker).toContain('url.pathname.startsWith("/manus-storage/") || request.destination === "video"');
  });
});
