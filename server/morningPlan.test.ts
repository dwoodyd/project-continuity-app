import { describe, expect, it } from "vitest";
import { FALLBACK_MORNING_GUIDANCE, normalizeMorningPlanPayload } from "./utils/morningPlan";

describe("normalizeMorningPlanPayload", () => {
  it("keeps the morning check-in saveable when an LLM omits task arrays", () => {
    const plan = normalizeMorningPlanPayload(JSON.stringify({
      guidance: "A gentle plan is ready.",
      timeBlocks: [{ label: "First step", duration: "20 min" }],
    }));

    expect(plan).toEqual({
      guidance: "A gentle plan is ready.",
      divergenceNote: null,
      criticalTasks: [],
      timeBlocks: [{ label: "First step", duration: "20 min" }],
    });
  });

  it("falls back safely for malformed responses instead of throwing", () => {
    expect(normalizeMorningPlanPayload("not json")).toEqual({
      guidance: FALLBACK_MORNING_GUIDANCE,
      divergenceNote: null,
      criticalTasks: [],
      timeBlocks: [],
    });
  });

  it("preserves valid tasks while discarding malformed entries", () => {
    const plan = normalizeMorningPlanPayload({
      guidance: "Start with the document.",
      divergenceNote: "The weekly focus shifted today.",
      criticalTasks: [
        { title: " Open the draft ", projectId: 7, carryoverCount: 2 },
        { projectId: 8 },
      ],
      timeBlocks: [
        { label: "Draft", duration: "30 min" },
        { label: "", duration: "15 min" },
      ],
    });

    expect(plan.criticalTasks).toEqual([{ title: "Open the draft", projectId: 7, carryoverCount: 2 }]);
    expect(plan.timeBlocks).toEqual([{ label: "Draft", duration: "30 min" }]);
    expect(plan.divergenceNote).toBe("The weekly focus shifted today.");
  });
});
