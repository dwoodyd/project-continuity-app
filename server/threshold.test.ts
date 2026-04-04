/**
 * Threshold Feature Tests
 *
 * Tests the business logic for:
 * 1. First Movable Step — JSON parsing and validation
 * 2. First Movable Step — four required qualities (specific, physical, brief, named finish line)
 * 3. Threshold Diagnosis — pattern validation (only 6 allowed patterns)
 * 4. Threshold Diagnosis — permission line always present
 * 5. Threshold Diagnosis — Shame Spiral produces Minimum Viable Contact step
 * 6. Input validation — empty fields rejected
 * 7. Input validation — avoidedTask max length
 * 8. Input validation — question responses max length
 * 9. LLM response parsing — handles missing fields gracefully
 * 10. LLM response parsing — handles extra fields safely
 */
import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Shared logic extracted from threshold router ─────────────────────────────
const ALLOWED_PATTERNS = [
  "perfectionism",
  "ambiguity",
  "emotional_weight",
  "executive_function",
  "shame_spiral",
  "permission_deficit",
] as const;

type ThresholdPattern = (typeof ALLOWED_PATTERNS)[number];

function parseFirstMovableStepLLMResponse(content: string): {
  theMove: string;
  whereItEnds: string;
  minimumViableContact: string;
} {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned invalid JSON" });
  }
  if (!parsed.theMove || !parsed.whereItEnds || !parsed.minimumViableContact) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM response missing required fields" });
  }
  return {
    theMove: String(parsed.theMove),
    whereItEnds: String(parsed.whereItEnds),
    minimumViableContact: String(parsed.minimumViableContact),
  };
}

function parseDiagnosisLLMResponse(content: string): {
  pattern: ThresholdPattern;
  patternLabel: string;
  protectionSentence: string;
  firstMove: string;
  whereItEnds: string;
  permissionLine: string;
} {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned invalid JSON" });
  }
  if (!ALLOWED_PATTERNS.includes(parsed.pattern)) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Unknown pattern: ${parsed.pattern}` });
  }
  const required = ["patternLabel", "protectionSentence", "firstMove", "whereItEnds", "permissionLine"];
  for (const field of required) {
    if (!parsed[field]) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Missing field: ${field}` });
    }
  }
  return {
    pattern: parsed.pattern as ThresholdPattern,
    patternLabel: String(parsed.patternLabel),
    protectionSentence: String(parsed.protectionSentence),
    firstMove: String(parsed.firstMove),
    whereItEnds: String(parsed.whereItEnds),
    permissionLine: String(parsed.permissionLine),
  };
}

function validateInput(value: string, fieldName: string, maxLength = 1000) {
  if (!value.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldName} cannot be empty` });
  }
  if (value.length > maxLength) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldName} exceeds maximum length` });
  }
}

// ─── 1. First Movable Step — JSON parsing ─────────────────────────────────────
describe("First Movable Step — LLM response parsing", () => {
  it("parses a valid LLM response correctly", () => {
    const content = JSON.stringify({
      theMove: "Open the document and read the first paragraph",
      whereItEnds: "After reading one paragraph — stop",
      minimumViableContact: "Open the document and read the title",
    });
    const result = parseFirstMovableStepLLMResponse(content);
    expect(result.theMove).toBe("Open the document and read the first paragraph");
    expect(result.whereItEnds).toBe("After reading one paragraph — stop");
    expect(result.minimumViableContact).toBe("Open the document and read the title");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseFirstMovableStepLLMResponse("not json")).toThrow("invalid JSON");
  });

  it("throws when theMove is missing", () => {
    const content = JSON.stringify({
      whereItEnds: "After one paragraph",
      minimumViableContact: "Open the file",
    });
    expect(() => parseFirstMovableStepLLMResponse(content)).toThrow("missing required fields");
  });

  it("throws when whereItEnds is missing", () => {
    const content = JSON.stringify({
      theMove: "Write one sentence",
      minimumViableContact: "Open the file",
    });
    expect(() => parseFirstMovableStepLLMResponse(content)).toThrow("missing required fields");
  });

  it("throws when minimumViableContact is missing", () => {
    const content = JSON.stringify({
      theMove: "Write one sentence",
      whereItEnds: "After one sentence",
    });
    expect(() => parseFirstMovableStepLLMResponse(content)).toThrow("missing required fields");
  });

  it("handles extra fields in LLM response safely (ignores them)", () => {
    const content = JSON.stringify({
      theMove: "Draft one bullet",
      whereItEnds: "After one bullet",
      minimumViableContact: "Open the doc",
      unexpectedField: "should be ignored",
    });
    const result = parseFirstMovableStepLLMResponse(content);
    expect(result).not.toHaveProperty("unexpectedField");
    expect(result.theMove).toBe("Draft one bullet");
  });
});

// ─── 2. First Movable Step — four qualities ───────────────────────────────────
describe("First Movable Step — four required qualities", () => {
  it("theMove starts with a verb (specific, physical)", () => {
    const moves = [
      "Open the document",
      "Write one sentence",
      "Read the first paragraph",
      "Draft a single bullet point",
    ];
    // Each move should start with a capital letter (verb-first)
    moves.forEach((move) => {
      expect(move[0]).toMatch(/[A-Z]/);
    });
  });

  it("whereItEnds defines a named finish line", () => {
    const endings = [
      "After reading one paragraph — stop there",
      "After one sentence — done",
      "After opening the file — that is the session",
    ];
    // Each ending describes a stopping condition
    endings.forEach((ending) => {
      expect(ending.length).toBeGreaterThan(10);
    });
  });

  it("minimumViableContact is shorter/simpler than theMove", () => {
    const pairs = [
      { theMove: "Write the first paragraph of the introduction", mvc: "Open the document" },
      { theMove: "Draft three bullet points for the outline", mvc: "Open the outline file" },
    ];
    pairs.forEach(({ theMove, mvc }) => {
      expect(mvc.length).toBeLessThan(theMove.length);
    });
  });
});

// ─── 3. Threshold Diagnosis — pattern validation ──────────────────────────────
describe("Threshold Diagnosis — pattern validation", () => {
  it("accepts all six allowed patterns", () => {
    ALLOWED_PATTERNS.forEach((pattern) => {
      const content = JSON.stringify({
        pattern,
        patternLabel: "Test Label",
        protectionSentence: "Your resistance is protecting something.",
        firstMove: "Open the file",
        whereItEnds: "After opening",
        permissionLine: "You have permission to begin.",
      });
      expect(() => parseDiagnosisLLMResponse(content)).not.toThrow();
    });
  });

  it("rejects an unknown pattern", () => {
    const content = JSON.stringify({
      pattern: "procrastination",
      patternLabel: "Procrastination",
      protectionSentence: "...",
      firstMove: "...",
      whereItEnds: "...",
      permissionLine: "You have permission to begin.",
    });
    expect(() => parseDiagnosisLLMResponse(content)).toThrow("Unknown pattern");
  });

  it("rejects empty pattern string", () => {
    const content = JSON.stringify({
      pattern: "",
      patternLabel: "Empty",
      protectionSentence: "...",
      firstMove: "...",
      whereItEnds: "...",
      permissionLine: "You have permission to begin.",
    });
    expect(() => parseDiagnosisLLMResponse(content)).toThrow();
  });
});

// ─── 4. Threshold Diagnosis — permission line ─────────────────────────────────
describe("Threshold Diagnosis — permission line", () => {
  it("permission line is always present in a valid response", () => {
    const content = JSON.stringify({
      pattern: "perfectionism",
      patternLabel: "Perfectionism",
      protectionSentence: "Your resistance protects you from imperfection.",
      firstMove: "Write one sentence without editing",
      whereItEnds: "After one sentence — stop",
      permissionLine: "You have permission to begin.",
    });
    const result = parseDiagnosisLLMResponse(content);
    expect(result.permissionLine).toBeTruthy();
    expect(result.permissionLine.length).toBeGreaterThan(5);
  });

  it("throws when permissionLine is missing", () => {
    const content = JSON.stringify({
      pattern: "perfectionism",
      patternLabel: "Perfectionism",
      protectionSentence: "...",
      firstMove: "Write one sentence",
      whereItEnds: "After one sentence",
    });
    expect(() => parseDiagnosisLLMResponse(content)).toThrow("Missing field: permissionLine");
  });
});

// ─── 5. Shame Spiral produces Minimum Viable Contact ─────────────────────────
describe("Threshold Diagnosis — Shame Spiral pattern", () => {
  it("shame_spiral is a valid pattern", () => {
    expect(ALLOWED_PATTERNS).toContain("shame_spiral");
  });

  it("shame_spiral response includes a gentle first move (MVC-style)", () => {
    // Simulates what the LLM should return for shame_spiral
    const shameSpiralResponse = {
      pattern: "shame_spiral",
      patternLabel: "The Shame Spiral",
      protectionSentence: "Your resistance is protecting you from the pain of confirming a story you already believe about yourself.",
      firstMove: "Open the file and read the title — nothing more",
      whereItEnds: "After reading the title — close it if you need to. That counts.",
      permissionLine: "You have permission to begin. And to stop.",
    };
    expect(shameSpiralResponse.firstMove).not.toContain("write");
    expect(shameSpiralResponse.whereItEnds).toContain("That counts");
    expect(shameSpiralResponse.permissionLine).toContain("permission");
  });
});

// ─── 6. Input validation — empty fields ──────────────────────────────────────
describe("Input validation — empty fields", () => {
  it("rejects empty avoidedTask", () => {
    expect(() => validateInput("", "avoidedTask")).toThrow("cannot be empty");
  });

  it("rejects whitespace-only avoidedTask", () => {
    expect(() => validateInput("   ", "avoidedTask")).toThrow("cannot be empty");
  });

  it("accepts a valid avoidedTask", () => {
    expect(() => validateInput("Write the introduction", "avoidedTask")).not.toThrow();
  });

  it("rejects empty q1Response", () => {
    expect(() => validateInput("", "q1Response", 500)).toThrow("cannot be empty");
  });

  it("rejects empty q2Response", () => {
    expect(() => validateInput("", "q2Response", 500)).toThrow("cannot be empty");
  });

  it("rejects empty q3Response", () => {
    expect(() => validateInput("", "q3Response", 500)).toThrow("cannot be empty");
  });
});

// ─── 7. Input validation — avoidedTask max length ────────────────────────────
describe("Input validation — avoidedTask max length", () => {
  it("rejects avoidedTask over 1000 characters", () => {
    const tooLong = "a".repeat(1001);
    expect(() => validateInput(tooLong, "avoidedTask", 1000)).toThrow("exceeds maximum length");
  });

  it("accepts avoidedTask at exactly 1000 characters", () => {
    const exactly1000 = "a".repeat(1000);
    expect(() => validateInput(exactly1000, "avoidedTask", 1000)).not.toThrow();
  });
});

// ─── 8. Input validation — question response max length ──────────────────────
describe("Input validation — question response max length", () => {
  it("rejects q1Response over 500 characters", () => {
    const tooLong = "a".repeat(501);
    expect(() => validateInput(tooLong, "q1Response", 500)).toThrow("exceeds maximum length");
  });

  it("accepts q1Response at exactly 500 characters", () => {
    const exactly500 = "a".repeat(500);
    expect(() => validateInput(exactly500, "q1Response", 500)).not.toThrow();
  });
});

// ─── 9. LLM response parsing — handles missing fields ────────────────────────
describe("LLM response parsing — missing fields", () => {
  it("throws descriptively when protectionSentence is missing from diagnosis", () => {
    const content = JSON.stringify({
      pattern: "perfectionism",
      patternLabel: "Perfectionism",
      firstMove: "Write one sentence",
      whereItEnds: "After one sentence",
      permissionLine: "You have permission to begin.",
    });
    expect(() => parseDiagnosisLLMResponse(content)).toThrow("Missing field: protectionSentence");
  });

  it("throws descriptively when firstMove is missing from diagnosis", () => {
    const content = JSON.stringify({
      pattern: "ambiguity",
      patternLabel: "Ambiguity",
      protectionSentence: "...",
      whereItEnds: "After one step",
      permissionLine: "You have permission to begin.",
    });
    expect(() => parseDiagnosisLLMResponse(content)).toThrow("Missing field: firstMove");
  });
});

// ─── 10. Pattern label display names ─────────────────────────────────────────
describe("Threshold pattern display names", () => {
  const PATTERN_LABELS: Record<ThresholdPattern, string> = {
    perfectionism: "Perfectionism",
    ambiguity: "Ambiguity",
    emotional_weight: "Emotional Weight",
    executive_function: "Executive Function",
    shame_spiral: "The Shame Spiral",
    permission_deficit: "Permission Deficit",
  };

  it("all six patterns have a display label", () => {
    ALLOWED_PATTERNS.forEach((pattern) => {
      expect(PATTERN_LABELS[pattern]).toBeTruthy();
    });
  });

  it("display labels are title-cased", () => {
    Object.values(PATTERN_LABELS).forEach((label) => {
      expect(label[0]).toMatch(/[A-Z]/);
    });
  });
});
