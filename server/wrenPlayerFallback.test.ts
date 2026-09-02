import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WREN_STILLS } from "../client/src/lib/wrenClips";

const playerSource = readFileSync(
  resolve(process.cwd(), "client/src/components/WrenPlayer.tsx"),
  "utf8",
);

describe("Wren media fallback", () => {
  it("has a neutral still available for failed video delivery", () => {
    expect(WREN_STILLS.siliconeNeutral).toBe(
      "/api/media/wren_silicone_neutral_a1b60983.png",
    );
  });

  it("can suppress only the initial holder still for a neutral staged load", () => {
    expect(playerSource).toContain("suppressInitialStill?: boolean");
    expect(playerSource).toContain("showVideoPoster?: boolean");
    expect(playerSource).toContain("(!videoReady && !suppressInitialStill)");
    expect(playerSource).toContain("poster={showVideoPoster ? resolvedPoster : undefined}");
  });
});
