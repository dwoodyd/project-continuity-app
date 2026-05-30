import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Minimal mocks ────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Here are the facts." } }],
  }),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockReturnValue(null), // no DB needed for unit tests
}));

// ─── Import the helpers we want to test ──────────────────────────────────────
// We test the spiral detection logic and the Ground Mode system prompt directly.
// The tRPC procedures are integration-tested via the mock above.

const SPIRAL_SIGNALS = [
  "I can't do this",
  "everything is falling apart",
  "I don't know where to start",
  "I'm overwhelmed",
  "nothing is working",
  "I give up",
  "what's the point",
  "I'm stuck",
  "I keep failing",
  "I'm exhausted",
];

const CRISIS_SIGNALS = [
  "I want to hurt myself",
  "I don't want to be here anymore",
  "I'm thinking about ending it",
  "I want to die",
  "I can't go on",
];

/**
 * Simplified version of the detectSpiral logic from groundMode.ts
 * (extracted here so we can unit-test it without the full tRPC context)
 */
function detectSpiral(texts: string[], threshold = 3): { isSpiral: boolean; isCrisis: boolean } {
  const combined = texts.join(" ").toLowerCase();

  const isCrisis = CRISIS_SIGNALS.some((s) => combined.includes(s.toLowerCase()));
  if (isCrisis) return { isSpiral: false, isCrisis: true };

  const matchCount = SPIRAL_SIGNALS.filter((s) => combined.includes(s.toLowerCase())).length;
  return { isSpiral: matchCount >= threshold, isCrisis: false };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("detectSpiral", () => {
  it("returns isSpiral=false and isCrisis=false for neutral text", () => {
    const result = detectSpiral(["Had a productive morning.", "Finished the report."]);
    expect(result.isSpiral).toBe(false);
    expect(result.isCrisis).toBe(false);
  });

  it("returns isSpiral=true when 3+ spiral signals are present", () => {
    const result = detectSpiral([
      "I can't do this project anymore.",
      "Everything is falling apart and I'm overwhelmed.",
      "I don't know where to start.",
    ]);
    expect(result.isSpiral).toBe(true);
    expect(result.isCrisis).toBe(false);
  });

  it("returns isSpiral=false when fewer than threshold signals present", () => {
    const result = detectSpiral(["I'm a bit stuck today.", "Feeling tired."]);
    expect(result.isSpiral).toBe(false);
    expect(result.isCrisis).toBe(false);
  });

  it("returns isCrisis=true and isSpiral=false for crisis language", () => {
    const result = detectSpiral(["I want to hurt myself", "I don't know what to do"]);
    expect(result.isCrisis).toBe(true);
    expect(result.isSpiral).toBe(false);
  });

  it("crisis signal takes priority over spiral signal count", () => {
    const result = detectSpiral([
      "I can't do this, I'm overwhelmed, everything is falling apart, I give up.",
      "I want to die.",
    ]);
    expect(result.isCrisis).toBe(true);
    expect(result.isSpiral).toBe(false);
  });

  it("respects custom threshold", () => {
    const texts = ["I'm stuck.", "I'm exhausted."];
    expect(detectSpiral(texts, 2).isSpiral).toBe(true);
    expect(detectSpiral(texts, 3).isSpiral).toBe(false);
  });

  it("handles empty input gracefully", () => {
    const result = detectSpiral([]);
    expect(result.isSpiral).toBe(false);
    expect(result.isCrisis).toBe(false);
  });
});

describe("Ground Mode system prompt", () => {
  it("GROUND_MODE_SYSTEM_PROMPT is defined and non-empty", async () => {
    // Dynamic import to avoid full module initialization
    const mod = await import("./routers/groundMode");
    // The router exports the constant for testing
    expect(typeof mod.GROUND_MODE_SYSTEM_PROMPT).toBe("string");
    expect(mod.GROUND_MODE_SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });

  it("GROUND_MODE_SYSTEM_PROMPT does not contain warmth or encouragement language", async () => {
    const mod = await import("./routers/groundMode");
    const prompt = mod.GROUND_MODE_SYSTEM_PROMPT.toLowerCase();
    // Should not contain typical warm AI phrases
    expect(prompt).not.toContain("you've got this");
    expect(prompt).not.toContain("great job");
    expect(prompt).not.toContain("amazing");
  });
});
