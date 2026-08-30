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

  it("keeps mobile landing copy in its own surfaced region below the Wren video", () => {
    expect(page).toContain('relative z-10 mt-3 flex w-full flex-col items-center justify-center border-t bg-background');
    expect(page).toContain('md:mt-0 md:border-t-0 md:bg-transparent');
    expect(page).toContain('style={{ borderColor: "color-mix(in srgb, var(--border) 72%, transparent)" }}');
  });
});
