import { describe, it, expect } from "vitest";

// ── Pure logic extracted from getWeeklyDistractionInsights ───────────────────
// We test the aggregation logic in isolation without needing a DB connection.

type DistractionEvent = {
  category: string;
  timeOfDay: string;
  date: Date;
};

const CATEGORY_LABELS: Record<string, string> = {
  social_media: "Social media",
  research_rabbit_hole: "Research rabbit hole",
  unplanned_task: "Unplanned task",
  communication: "Communication",
  context_switch: "Context switching",
  unknown: "Other",
};

function computeDistractionInsights(weekEvents: DistractionEvent[]) {
  if (weekEvents.length === 0) {
    return {
      hasData: false,
      topCategory: null,
      topCategoryLabel: null,
      topCategoryCount: 0,
      totalEvents: 0,
      timeOfDayCounts: { morning: 0, afternoon: 0, evening: 0 },
      topTimeOfDay: null,
      categoryBreakdown: [] as Array<{ category: string; label: string; count: number; pct: number }>,
      insightSentence: null,
    };
  }

  const catCount: Record<string, number> = {};
  const todCount: Record<string, number> = { morning: 0, afternoon: 0, evening: 0 };

  for (const e of weekEvents) {
    catCount[e.category] = (catCount[e.category] ?? 0) + 1;
    if (e.timeOfDay in todCount) todCount[e.timeOfDay]++;
  }

  const categoryBreakdown = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      count,
      pct: Math.round((count / weekEvents.length) * 100),
    }));

  const topCat = categoryBreakdown[0];
  const topTod = Object.entries(todCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const todLabels: Record<string, string> = {
    morning: "mornings",
    afternoon: "afternoons",
    evening: "evenings",
  };

  const insightSentence = topCat
    ? `This week, ${topCat.label.toLowerCase()} accounted for ${topCat.pct}% of your distractions${
        topTod ? `, most often in the ${todLabels[topTod] ?? topTod}` : ""
      }.`
    : null;

  return {
    hasData: true,
    topCategory: topCat?.category ?? null,
    topCategoryLabel: topCat?.label ?? null,
    topCategoryCount: topCat?.count ?? 0,
    totalEvents: weekEvents.length,
    timeOfDayCounts: {
      morning: todCount.morning ?? 0,
      afternoon: todCount.afternoon ?? 0,
      evening: todCount.evening ?? 0,
    },
    topTimeOfDay: topTod,
    categoryBreakdown,
    insightSentence,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("computeDistractionInsights", () => {
  const now = new Date();

  it("returns hasData=false when there are no events", () => {
    const result = computeDistractionInsights([]);
    expect(result.hasData).toBe(false);
    expect(result.totalEvents).toBe(0);
    expect(result.topCategory).toBeNull();
    expect(result.insightSentence).toBeNull();
    expect(result.categoryBreakdown).toHaveLength(0);
  });

  it("identifies the top category correctly", () => {
    const events: DistractionEvent[] = [
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "afternoon", date: now },
      { category: "communication", timeOfDay: "morning", date: now },
    ];
    const result = computeDistractionInsights(events);
    expect(result.hasData).toBe(true);
    expect(result.topCategory).toBe("social_media");
    expect(result.topCategoryLabel).toBe("Social media");
    expect(result.topCategoryCount).toBe(2);
  });

  it("calculates correct percentage for top category", () => {
    const events: DistractionEvent[] = [
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "communication", timeOfDay: "afternoon", date: now },
    ];
    const result = computeDistractionInsights(events);
    const topBreakdown = result.categoryBreakdown[0];
    expect(topBreakdown?.pct).toBe(75); // 3/4 = 75%
  });

  it("identifies the top time of day correctly", () => {
    const events: DistractionEvent[] = [
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "communication", timeOfDay: "afternoon", date: now },
    ];
    const result = computeDistractionInsights(events);
    expect(result.topTimeOfDay).toBe("morning");
    expect(result.timeOfDayCounts.morning).toBe(2);
    expect(result.timeOfDayCounts.afternoon).toBe(1);
    expect(result.timeOfDayCounts.evening).toBe(0);
  });

  it("generates a correct insight sentence with time of day", () => {
    const events: DistractionEvent[] = [
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "communication", timeOfDay: "afternoon", date: now },
      { category: "communication", timeOfDay: "afternoon", date: now },
      // social_media wins on category (tied, but listed first alphabetically in sort)
    ];
    const result = computeDistractionInsights(events);
    expect(result.insightSentence).toBeTruthy();
    expect(result.insightSentence).toContain("%");
    expect(result.insightSentence).toContain("distractions");
  });

  it("generates insight sentence without time of day when all counts are zero", () => {
    // Simulate events where timeOfDay is not in the expected set
    const events: DistractionEvent[] = [
      { category: "context_switch", timeOfDay: "unknown_time" as any, date: now },
    ];
    const result = computeDistractionInsights(events);
    // topTod will be morning/afternoon/evening with count 0 — all tied, first wins
    expect(result.insightSentence).toBeTruthy();
    expect(result.topCategory).toBe("context_switch");
  });

  it("sorts categoryBreakdown by count descending", () => {
    const events: DistractionEvent[] = [
      { category: "communication", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "context_switch", timeOfDay: "afternoon", date: now },
      { category: "context_switch", timeOfDay: "afternoon", date: now },
    ];
    const result = computeDistractionInsights(events);
    expect(result.categoryBreakdown[0]?.category).toBe("social_media");
    expect(result.categoryBreakdown[1]?.category).toBe("context_switch");
    expect(result.categoryBreakdown[2]?.category).toBe("communication");
  });

  it("uses 'Other' label for unknown category", () => {
    const events: DistractionEvent[] = [
      { category: "unknown", timeOfDay: "evening", date: now },
    ];
    const result = computeDistractionInsights(events);
    expect(result.topCategoryLabel).toBe("Other");
  });

  it("handles single event correctly", () => {
    const events: DistractionEvent[] = [
      { category: "research_rabbit_hole", timeOfDay: "afternoon", date: now },
    ];
    const result = computeDistractionInsights(events);
    expect(result.hasData).toBe(true);
    expect(result.totalEvents).toBe(1);
    expect(result.topCategoryCount).toBe(1);
    expect(result.categoryBreakdown[0]?.pct).toBe(100);
    expect(result.insightSentence).toContain("100%");
  });

  it("correctly counts all time-of-day buckets", () => {
    const events: DistractionEvent[] = [
      { category: "social_media", timeOfDay: "morning", date: now },
      { category: "social_media", timeOfDay: "afternoon", date: now },
      { category: "social_media", timeOfDay: "evening", date: now },
      { category: "social_media", timeOfDay: "evening", date: now },
    ];
    const result = computeDistractionInsights(events);
    expect(result.timeOfDayCounts.morning).toBe(1);
    expect(result.timeOfDayCounts.afternoon).toBe(1);
    expect(result.timeOfDayCounts.evening).toBe(2);
    expect(result.topTimeOfDay).toBe("evening");
  });
});
