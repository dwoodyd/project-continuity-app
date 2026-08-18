import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/EmotionalCyclePage.tsx"), "utf8");

describe("Emotional Cycle phase-card layout", () => {
  it("reserves a responsive, clipped media column so Wren cannot overlap phase copy", () => {
    expect(source).toContain('grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[128px_minmax(0,1fr)] gap-4 items-start');
    expect(source).toContain('shrink-0 overflow-hidden rounded-xl w-24 h-24 sm:w-28 sm:h-28');
    expect(source).toContain('size="full"');
    expect(source).not.toContain('size="md"\n              loop\n              autoPlay\n              feather');
  });
});
