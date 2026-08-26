import { describe, expect, it } from "vitest";
import { WREN_STILLS } from "../client/src/lib/wrenClips";

describe("Wren media fallback", () => {
  it("has a neutral still available for failed video delivery", () => {
    expect(WREN_STILLS.siliconeNeutral).toBe(
      "/manus-storage/wren_silicone_neutral_a1b60983.png",
    );
  });
});
