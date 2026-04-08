/**
 * Tests for Clarity Engine mode recommendation pattern logic.
 * The logic lives in server/routers/clarity.ts (getModeRecommendation).
 * We test the pure algorithmic core here by extracting it into a helper.
 */
import { describe, it, expect } from "vitest";

// ── Pure helper extracted from the router for testability ────────────────────
type Mode = "overwhelm" | "decision" | "creative_block" | "identity_drift" | "relationship_tension" | "purpose_fog";

interface SessionStub {
  mode: Mode;
  createdAt: Date;
}

function computeRecommendation(
  sessions: SessionStub[],
  todayDow: number
): { mode: Mode; confidence: "day_pattern" | "overall_pattern" } | null {
  if (sessions.length < 5) return null;

  const dowCounts: Record<string, number> = {};
  const overallCounts: Record<string, number> = {};

  for (const s of sessions) {
    const dow = new Date(s.createdAt).getDay();
    overallCounts[s.mode] = (overallCounts[s.mode] ?? 0) + 1;
    if (dow === todayDow) {
      dowCounts[s.mode] = (dowCounts[s.mode] ?? 0) + 1;
    }
  }

  const dowEntries = Object.entries(dowCounts).filter(([, c]) => c >= 2);
  const overallEntries = Object.entries(overallCounts);

  if (dowEntries.length > 0) {
    const top = dowEntries.sort(([, a], [, b]) => b - a)[0][0] as Mode;
    return { mode: top, confidence: "day_pattern" };
  }

  const top = overallEntries.sort(([, a], [, b]) => b - a)[0];
  if (top && top[1] / sessions.length >= 0.35) {
    return { mode: top[0] as Mode, confidence: "overall_pattern" };
  }

  return null;
}

// ── Helper to build a session on a specific day-of-week ──────────────────────
function sessionOnDow(mode: Mode, dow: number): SessionStub {
  // Find the most recent date with the given day-of-week
  const d = new Date();
  const diff = (d.getDay() - dow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return { mode, createdAt: d };
}

describe("computeRecommendation", () => {
  it("returns null when fewer than 5 sessions", () => {
    const sessions: SessionStub[] = [
      { mode: "overwhelm", createdAt: new Date() },
      { mode: "overwhelm", createdAt: new Date() },
    ];
    expect(computeRecommendation(sessions, 1)).toBeNull();
  });

  it("returns day_pattern when a mode appears 2+ times on the same weekday", () => {
    const dow = 1; // Monday
    const sessions: SessionStub[] = [
      sessionOnDow("overwhelm", dow),
      sessionOnDow("overwhelm", dow),
      { mode: "decision", createdAt: new Date() },
      { mode: "decision", createdAt: new Date() },
      { mode: "creative_block", createdAt: new Date() },
    ];
    const result = computeRecommendation(sessions, dow);
    expect(result).not.toBeNull();
    expect(result!.mode).toBe("overwhelm");
    expect(result!.confidence).toBe("day_pattern");
  });

  it("prefers day_pattern over overall_pattern", () => {
    const dow = 3; // Wednesday
    // Use a fixed past Wednesday (2024-01-03) so these sessions always land on dow=3
    // regardless of what day the test runs. The 4 'decision' sessions use a fixed
    // Monday (2024-01-01) so they never match todayDow=3 in the algorithm.
    const fixedWed = new Date("2024-01-03T10:00:00Z"); // Wednesday
    const fixedMon = new Date("2024-01-01T10:00:00Z"); // Monday
    const sessions: SessionStub[] = [
      { mode: "creative_block", createdAt: fixedWed },
      { mode: "creative_block", createdAt: fixedWed },
      { mode: "decision", createdAt: fixedMon },
      { mode: "decision", createdAt: fixedMon },
      { mode: "decision", createdAt: fixedMon },
      { mode: "decision", createdAt: fixedMon },
    ];
    const result = computeRecommendation(sessions, dow);
    expect(result!.mode).toBe("creative_block");
    expect(result!.confidence).toBe("day_pattern");
  });

  it("returns overall_pattern when dominant mode exceeds 35% threshold", () => {
    // Use a fixed past date (2024-01-01 = Monday, dow=1) so sessions never match today's dow
    const fixedMonday = new Date("2024-01-01T10:00:00Z");
    const sessions: SessionStub[] = [
      { mode: "purpose_fog", createdAt: fixedMonday },
      { mode: "purpose_fog", createdAt: fixedMonday },
      { mode: "purpose_fog", createdAt: fixedMonday },
      { mode: "decision", createdAt: fixedMonday },
      { mode: "overwhelm", createdAt: fixedMonday },
      { mode: "overwhelm", createdAt: fixedMonday },
      { mode: "creative_block", createdAt: fixedMonday },
      { mode: "creative_block", createdAt: fixedMonday },
    ];
    // purpose_fog: 3/8 = 37.5% — exceeds 35%
    // todayDow = 5 (Friday) — no sessions on Friday, so no day_pattern
    const result = computeRecommendation(sessions, 5);
    expect(result!.mode).toBe("purpose_fog");
    expect(result!.confidence).toBe("overall_pattern");
  });

  it("returns null when no mode dominates overall (all below 35%)", () => {
    const sessions: SessionStub[] = [
      { mode: "overwhelm", createdAt: new Date() },
      { mode: "decision", createdAt: new Date() },
      { mode: "creative_block", createdAt: new Date() },
      { mode: "identity_drift", createdAt: new Date() },
      { mode: "purpose_fog", createdAt: new Date() },
      { mode: "relationship_tension", createdAt: new Date() },
    ];
    // Each mode: 1/6 = 16.7% — all below 35%
    const result = computeRecommendation(sessions, 6);
    expect(result).toBeNull();
  });

  it("picks the most frequent mode when multiple qualify for day_pattern", () => {
    const dow = 2; // Tuesday
    const sessions: SessionStub[] = [
      sessionOnDow("overwhelm", dow),
      sessionOnDow("overwhelm", dow),
      sessionOnDow("overwhelm", dow),
      sessionOnDow("decision", dow),
      sessionOnDow("decision", dow),
      { mode: "creative_block", createdAt: new Date() },
    ];
    const result = computeRecommendation(sessions, dow);
    expect(result!.mode).toBe("overwhelm");
    expect(result!.confidence).toBe("day_pattern");
  });
});
