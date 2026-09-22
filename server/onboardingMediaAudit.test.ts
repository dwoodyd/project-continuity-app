import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const onboarding = readFileSync(resolve(root, "client/src/pages/OnboardingPage.tsx"), "utf8");
const intro = readFileSync(resolve(root, "client/src/components/WrenIntroMoment.tsx"), "utf8");
const weeklyCompass = readFileSync(resolve(root, "client/src/pages/WeeklyCompassPage.tsx"), "utf8");
const clips = readFileSync(resolve(root, "client/src/lib/wrenClips.ts"), "utf8");

describe("watermark-safe onboarding media", () => {
  it("uses the audited thread scene for the focus-hours step", () => {
    const stepFocus = onboarding.slice(
      onboarding.indexOf("function StepFocus("),
      onboarding.indexOf("function StepProject("),
    );
    expect(stepFocus).toContain("WREN_CLIPS.hoversThread");
    expect(stepFocus).not.toContain("WREN_CLIPS.bouncingFun");
  });

  it("uses the audited luminous scene for the post-onboarding Wren intro", () => {
    expect(intro).toContain('src={WREN_CLIPS.luminousFloats}');
    expect(intro).not.toContain('src={WREN_CLIPS.blobFlyingFun}');
    expect(intro).toContain("onEnded={handleDone}");
  });

  it("does not leave the visually confirmed Veo-watermarked assets on raw video paths", () => {
    expect(onboarding).toContain("WREN_CLIPS.hoveringArchway");
    expect(onboarding).not.toContain("WREN_CLIPS.mainCornerWave");
    expect(weeklyCompass).toContain("WREN_CLIPS.holdingOrb");
    expect(weeklyCompass).not.toContain("WREN_CLIPS.memoryOrb");
    expect(clips).not.toContain("wren_main_corner_wave_b211fe78_a4cf1dad.mp4");
    expect(clips).not.toContain("wren_memory_orb_92969214.mp4");
    expect(clips).not.toContain("wren_peeking_9a813da0_b6d5c634.mp4");
    expect(clips).not.toContain("wren_holding_orb_4c6ec928.mp4");
  });
});
