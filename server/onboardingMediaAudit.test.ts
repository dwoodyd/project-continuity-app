import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const onboarding = readFileSync(resolve(root, "client/src/pages/OnboardingPage.tsx"), "utf8");
const intro = readFileSync(resolve(root, "client/src/components/WrenIntroMoment.tsx"), "utf8");

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
});
