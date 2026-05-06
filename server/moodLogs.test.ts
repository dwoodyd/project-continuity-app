import { describe, it, expect } from "vitest";

// ─── Inline the pure cycle analysis helpers so we can test them without DB ───
function findPeaksAndTroughs(scores: { date: string; score: number }[]) {
  const peaks: { date: string; score: number; index: number }[] = [];
  const troughs: { date: string; score: number; index: number }[] = [];
  for (let i = 1; i < scores.length - 1; i++) {
    const prev = scores[i - 1]!.score;
    const curr = scores[i]!.score;
    const next = scores[i + 1]!.score;
    if (curr > prev && curr > next) peaks.push({ ...scores[i]!, index: i });
    if (curr < prev && curr < next) troughs.push({ ...scores[i]!, index: i });
  }
  return { peaks, troughs };
}

function avgCycleLength(points: { date: string }[]): number | null {
  if (points.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = new Date(points[i - 1]!.date).getTime();
    const b = new Date(points[i]!.date).getTime();
    gaps.push((b - a) / (1000 * 60 * 60 * 24));
  }
  return Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
}

function predictNext(lastDate: string, cycleDays: number): string {
  const d = new Date(lastDate);
  d.setDate(d.getDate() + cycleDays);
  return d.toISOString().split("T")[0]!;
}

// ─── Helper: generate a synthetic mood series ─────────────────────────────────
function makeSeries(scores: number[], startDate = "2025-01-01") {
  return scores.map((score, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().split("T")[0]!, score };
  });
}

describe("findPeaksAndTroughs", () => {
  it("detects a single peak in the middle", () => {
    const series = makeSeries([3, 5, 9, 5, 3]);
    const { peaks, troughs } = findPeaksAndTroughs(series);
    expect(peaks).toHaveLength(1);
    expect(peaks[0]!.score).toBe(9);
  });

  it("detects a single trough in the middle", () => {
    const series = makeSeries([8, 5, 2, 5, 8]);
    const { peaks, troughs } = findPeaksAndTroughs(series);
    expect(troughs).toHaveLength(1);
    expect(troughs[0]!.score).toBe(2);
  });

  it("detects multiple peaks and troughs in a wave", () => {
    // Approximate 5-week cycle: up-down-up-down
    const wave = [3, 5, 8, 5, 2, 5, 9, 5, 2, 5, 8, 5, 3];
    const series = makeSeries(wave);
    const { peaks, troughs } = findPeaksAndTroughs(series);
    expect(peaks.length).toBeGreaterThanOrEqual(2);
    expect(troughs.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty arrays for a flat series", () => {
    const series = makeSeries([5, 5, 5, 5, 5]);
    const { peaks, troughs } = findPeaksAndTroughs(series);
    expect(peaks).toHaveLength(0);
    expect(troughs).toHaveLength(0);
  });

  it("returns empty arrays for a series with fewer than 3 points", () => {
    const series = makeSeries([5, 8]);
    const { peaks, troughs } = findPeaksAndTroughs(series);
    expect(peaks).toHaveLength(0);
    expect(troughs).toHaveLength(0);
  });
});

describe("avgCycleLength", () => {
  it("returns null for a single point", () => {
    expect(avgCycleLength([{ date: "2025-01-01" }])).toBeNull();
  });

  it("calculates correct average for two peaks 35 days apart", () => {
    const points = [{ date: "2025-01-01" }, { date: "2025-02-05" }];
    expect(avgCycleLength(points)).toBe(35);
  });

  it("averages multiple gaps correctly", () => {
    // 30 + 40 = 70 / 2 = 35
    const points = [
      { date: "2025-01-01" },
      { date: "2025-01-31" }, // +30
      { date: "2025-03-12" }, // +40
    ];
    expect(avgCycleLength(points)).toBe(35);
  });
});

describe("predictNext", () => {
  it("adds cycle days to the last peak date", () => {
    expect(predictNext("2025-01-01", 35)).toBe("2025-02-05");
  });

  it("handles month boundaries correctly", () => {
    expect(predictNext("2025-01-28", 7)).toBe("2025-02-04");
  });

  it("handles year boundaries correctly", () => {
    expect(predictNext("2024-12-20", 14)).toBe("2025-01-03");
  });
});
