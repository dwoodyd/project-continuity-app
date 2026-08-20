import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/EmotionalCyclePage.tsx"), "utf8");

describe("Emotional Cycle analysis layout", () => {
  it("keeps the phase analysis free of decorative Wren media", () => {
    expect(source).toContain('{/* Cycle analysis */}');
    expect(source).toContain('className="rounded-2xl p-4"');
    expect(source).not.toContain("WrenPlayer");
    expect(source).not.toContain('grid grid-cols-[96px_minmax(0,1fr)]');
  });
});
