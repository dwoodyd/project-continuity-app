import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

function extractClipAssignments(registry: string, mapName: string) {
  const start = registry.indexOf(`export const ${mapName} = {`);
  const end = registry.indexOf("} as const", start);
  expect(start, `Could not find ${mapName}`).toBeGreaterThanOrEqual(0);
  expect(end, `Could not end ${mapName}`).toBeGreaterThan(start);
  return Array.from(registry.slice(start, end).matchAll(/^\s*(\w+):\s*\{\s*clip:\s*"([^"]+)"/gm)).map(([, surface, clip]) => ({ surface, clip }));
}

function extractVerifiedClipKeys(registry: string) {
  const start = registry.indexOf("export const VERIFIED_WREN_CLIP_KEYS = [");
  const end = registry.indexOf("] as const", start);
  expect(start, "Could not find VERIFIED_WREN_CLIP_KEYS").toBeGreaterThanOrEqual(0);
  expect(end, "Could not end VERIFIED_WREN_CLIP_KEYS").toBeGreaterThan(start);
  return Array.from(registry.slice(start, end).matchAll(/"([^"]+)"/g), match => match[1]);
}

describe("Wren presence and distinct clean media", () => {
  it("keeps functional video sizes compact and maintains an accessible media fallback", () => {
    const player = source("client/src/components/WrenPlayer.tsx");
    expect(player).toContain('xs:    "w-16 h-16"');
    expect(player).toContain('hero:  "w-[clamp(240px,32vw,440px)] h-[clamp(240px,32vw,440px)]"');
    expect(player).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(player).toContain("isVerifiedWrenClip(clip)");
    expect(player).toContain("const usesVerifiedVideo = isProtectedFocusClip || isVerifiedWrenClip(clip)");
    expect(player).toContain("const src = requestedSrc");
    expect(player).toContain("{usesVerifiedVideo && !prefersReducedMotion && !videoFailed && (");
    expect(player).toContain("poster={resolvedPoster}");
    expect(player).toContain('objectFit === "cover" ? "object-cover" : "object-contain"');
    expect(player).not.toContain("preferRequestedClip");
  });

  it("maps every required product surface to a unique visually reviewed clip", () => {
    const registry = source("client/src/lib/wrenClips.ts");
    const surfaces = extractClipAssignments(registry, "WREN_SURFACE_MEDIA");
    const expectedSurfaces = ["today", "returnBrief", "clarityEngine", "evidenceLog", "weeklyReview", "focusLanding"];
    expect(surfaces.map(({ surface }) => surface)).toEqual(expectedSurfaces);
    expect(new Set(surfaces.map(({ clip }) => clip)).size).toBe(expectedSurfaces.length);

    const verified = new Set(extractVerifiedClipKeys(registry));
    for (const { clip } of surfaces) expect(verified).toContain(clip);
  });

  it("maps all fourteen public tour slides to unique visually reviewed clips without reusing a product surface source", () => {
    const registry = source("client/src/lib/wrenClips.ts");
    const surfaces = extractClipAssignments(registry, "WREN_SURFACE_MEDIA");
    const tour = extractClipAssignments(registry, "WREN_TOUR_MEDIA");
    const expectedSteps = ["intro", "problem", "thread", "morning", "evening", "vault", "graph", "strength", "evidence", "threshold", "reentry", "focus_sessions", "single_focus", "invite"];
    expect(tour.map(({ surface }) => surface)).toEqual(expectedSteps);
    expect(new Set(tour.map(({ clip }) => clip)).size).toBe(expectedSteps.length);
    expect(new Set([...surfaces, ...tour].map(({ clip }) => clip)).size).toBe(expectedSteps.length + surfaces.length);

    const verified = new Set(extractVerifiedClipKeys(registry));
    for (const { clip } of tour) expect(verified).toContain(clip);
    const assignments = [...surfaces, ...tour].map(({ clip }) => clip).join(" ");
    for (const rejectedClip of ["evidenceClean", "carryingThread", "tuggingThread", "bouncingFun", "bouncingFunClean"]) {
      expect(assignments).not.toContain(rejectedClip);
    }
  });

  it("wires named product surfaces through their map and keeps the Focus active companion untouched", () => {
    const home = source("client/src/pages/Home.tsx");
    const clarity = source("client/src/pages/ClarityEnginePage.tsx");
    const evidence = source("client/src/pages/EvidenceLogPage.tsx");
    const weekly = source("client/src/pages/WeeklyReviewPage.tsx");
    const focus = source("client/src/pages/FocusSessionsPage.tsx");
    const tour = source("client/src/pages/TourPage.tsx");

    expect(home).toContain("WREN_SURFACE_MEDIA.today.clip");
    expect(home).toContain("WREN_SURFACE_MEDIA.returnBrief.clip");
    expect(clarity).toContain("WREN_SURFACE_MEDIA.clarityEngine.clip");
    expect(evidence).toContain("WREN_SURFACE_MEDIA.evidenceLog.clip");
    expect(weekly).toContain("WREN_SURFACE_MEDIA.weeklyReview.clip");
    expect(focus).toContain('clip={ACTIVITY_CLIP[wrenActivity]}');
    expect(focus).toContain('phase === "idle" ? WREN_SURFACE_MEDIA.focusLanding.clip : ACTIVITY_CLIP[wrenActivity]');
    expect(focus).toContain("weaving:   \"weaving\"");
    expect(focus).toContain("reading:   \"reading\"");
    expect(focus).toContain("lookingup: \"lookingup\"");
    expect(tour).toContain("WREN_TOUR_MEDIA");
    expect(tour).toContain("...STEP_META.focus_sessions");
    expect(tour).toContain("...STEP_META.single_focus");
    expect(tour).not.toContain('wren="carryingThread"');
  });

  it("keeps every direct Wren video path cover-framed, poster-backed, muted, autoplaying, inline, and looped", () => {
    const greeting = source("client/src/components/TodayGreetingWren.tsx");
    const intro = source("client/src/components/IntroWrenScene.tsx");
    const player = source("client/src/components/WrenPlayer.tsx");

    expect(greeting).toContain("poster={WREN_STILLS[fallbackStill]}");
    expect(greeting).toContain("onError={() => setVideoFailed(true)}");
    expect(greeting).toContain("object-cover mix-blend-screen");
    expect(greeting).toContain("autoPlay");
    expect(greeting).toContain("loop");
    expect(greeting).toContain("muted");
    expect(greeting).toContain("playsInline");
    expect(intro).toContain("const resolvedSrc = src");
    expect(intro).toContain("const resolvedPoster = poster ?? WREN_STILLS.evidenceCleanPoster");
    expect(intro).not.toContain("usesManagedSource");
    expect(intro).toContain("videoFailed && resolvedPoster");
    expect(intro).toContain("object-cover mix-blend-screen");
    expect(intro).toContain("autoPlay");
    expect(intro).toContain("loop");
    expect(intro).toContain("muted");
    expect(intro).toContain("playsInline");
    expect(player).toContain("poster={resolvedPoster}");
  });
});
