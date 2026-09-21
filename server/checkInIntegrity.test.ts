import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDailyPlan: vi.fn(),
    getWrenToneBucket: vi.fn(),
    saveEveningClose: vi.fn(),
    getCheckInById: vi.fn(),
    updateCheckIn: vi.fn(),
    updateDailyPlan: vi.fn(),
    createProjectMemoryEvent: vi.fn(),
    getActiveProjects: vi.fn().mockResolvedValue([]),
    getFocusSessionsByProject: vi.fn().mockResolvedValue([]),
    upsertHealthScore: vi.fn(),
    upsertEvidenceSummary: vi.fn(),
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          summary: "A calm summary.",
          tomorrowBrief: "Start with the first step.",
          carryoverTasks: ["Open the document"],
          insights: "A useful pattern.",
          detectedDecisions: [],
        }),
      },
    }],
  }),
}));

vi.mock("./_core/rateLimiter", () => ({ checkLLMRateLimit: vi.fn() }));
vi.mock("./wrenTone", () => ({ getWrenToneBucket: vi.fn().mockResolvedValue("gentle") }));

import * as db from "./db";
import { checkInsRouter } from "./routers/checkIns";

const ctx = (userId = 71) => ({
  user: { id: userId, isPro: false },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
  sessionJti: null,
  sessionExp: null,
}) as TrpcContext;

const savedEvening = {
  id: 412,
  userId: 71,
  dailyPlanId: 11,
  date: "2026-09-18",
  type: "evening" as const,
  userInput: "{}",
  alignmentStatus: null,
  generatedResponse: null,
  extractedNextSteps: null,
  linkedProjectIds: null,
  interruptionsNoted: null,
  completedAt: new Date("2026-09-19T04:01:00.000Z"),
  createdAt: new Date("2026-09-19T04:01:00.000Z"),
  updatedAt: new Date("2026-09-19T04:01:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getDailyPlan).mockResolvedValue({ id: 11, userId: 71, date: "2026-09-18", primaryProjectId: null } as any);
  vi.mocked(db.saveEveningClose).mockResolvedValue(savedEvening as any);
  vi.mocked(db.getCheckInById).mockResolvedValue(savedEvening as any);
});

describe("durable evening close integrity", () => {
  it("writes the canonical evening record and tomorrow handoff before optional LLM enrichment", async () => {
    const result = await checkInsRouter.createCaller(ctx()).submitEvening({
      whatMoved: "Drafted the project outline",
      whatRemains: "Polish the introduction",
      whatLearned: "A smaller first pass works better",
      tomorrowFirst: "Open the outline and revise the first paragraph",
      tomorrowTasks: [{ id: "task-1", title: "Review the outline", energyLevel: "low" }],
      localDate: "2026-09-18",
    });

    expect(db.saveEveningClose).toHaveBeenCalledWith(expect.objectContaining({
      userId: 71,
      date: "2026-09-18",
      userInput: expect.stringContaining("Drafted the project outline"),
      tomorrowTasks: expect.stringContaining("Open the outline and revise the first paragraph"),
    }));
    expect(result).toMatchObject({ checkInId: 412, verified: true });
  });

  it("updates a member-owned saved evening close and verifies the amended record", async () => {
    const result = await checkInsRouter.createCaller(ctx()).amendEveningClose({
      id: 412,
      whatMoved: "Added a missing insight",
      whatRemains: "Send the revised draft",
      whatLearned: "Shorter notes are easier to revisit",
      tomorrowFirst: "Open the revised draft",
      tomorrowTasks: [{ id: "task-2", title: "Send the draft" }],
    });

    expect(db.saveEveningClose).toHaveBeenCalledWith(expect.objectContaining({
      checkInId: 412,
      date: "2026-09-18",
      userInput: expect.stringContaining("Added a missing insight"),
    }));
    expect(db.updateCheckIn).toHaveBeenCalledWith(412, 71, expect.objectContaining({
      generatedResponse: null,
      extractedNextSteps: null,
    }));
    expect(result).toMatchObject({ id: 412, verified: true, whatMoved: "Added a missing insight" });
  });

  it("rejects a forged check-in id before any amendment write can affect another member's record", async () => {
    vi.mocked(db.getCheckInById).mockResolvedValueOnce(undefined);
    const caller = checkInsRouter.createCaller(ctx(72));

    await expect(caller.amendEveningClose({
      id: 412,
      whatMoved: "Attempted cross-account amendment",
      whatRemains: "",
      whatLearned: "",
      tomorrowFirst: "Do not write shared data",
      tomorrowTasks: [],
    })).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(db.getCheckInById).toHaveBeenCalledWith(412, 72);
    expect(db.saveEveningClose).not.toHaveBeenCalled();
    expect(db.updateCheckIn).not.toHaveBeenCalled();
    expect(db.updateDailyPlan).not.toHaveBeenCalled();
  });

  it("requires a client read-back before the reassuring evening-close state is shown", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(source).toContain("await utils.checkIns.getToday.fetch({ localDate: request.localDate })");
    expect(source).toContain("if (!result.verified || !saved) throw new Error");
    expect(source).toContain("Nothing is marked complete until the saved record is read back.");
    expect(source).not.toContain("saveTomorrowPlan.mutate({ tasks: allTomorrowTasks");
  });

  it("exposes one member-owned check-in read path for safe amendment", async () => {
    const readback = await checkInsRouter.createCaller(ctx()).getById({ id: 412 });
    expect(db.getCheckInById).toHaveBeenCalledWith(412, 71);
    expect(readback).toMatchObject({ id: 412, userInput: {} });
  });
});
