import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(
  resolve(process.cwd(), "client/src/pages/FocusSessionsPage.tsx"),
  "utf8",
);

describe("Focus Sessions companion stage", () => {
  it("keeps the active activity clip prominent in the left stage", () => {
    expect(page).toContain('clip={ACTIVITY_CLIP[wrenActivity]}');
    expect(page).toContain('clip={ACTIVITY_CLIP[wrenActivity]}');
    expect(page).toContain('fallbackStill="siliconeNeutral"');
    expect(page).toContain('absolute inset-x-6 top-12 bottom-9 z-[1] md:top-16');
  });
});
