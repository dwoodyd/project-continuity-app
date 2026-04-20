import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getUserProfile: vi.fn().mockResolvedValue(null),
  upsertUserProfile: vi.fn().mockResolvedValue(undefined),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  getProjects: vi.fn().mockResolvedValue([]),
  getActiveProjects: vi.fn().mockResolvedValue([]),
  getColdProjects: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue(null),
  createProject: vi.fn().mockResolvedValue(1),
  updateProject: vi.fn().mockResolvedValue(undefined),
  getSourceItems: vi.fn().mockResolvedValue([]),
  getSourceItemsByState: vi.fn().mockResolvedValue([]),
  getSourceItemById: vi.fn().mockResolvedValue(null),
  createSourceItem: vi.fn().mockResolvedValue(1),
  updateSourceItem: vi.fn().mockResolvedValue(undefined),
  getDailyPlan: vi.fn().mockResolvedValue(null),
  getRecentDailyPlans: vi.fn().mockResolvedValue([]),
  upsertDailyPlan: vi.fn().mockResolvedValue(1),
  updateDailyPlan: vi.fn().mockResolvedValue(undefined),
  getCheckIns: vi.fn().mockResolvedValue([]),
  getRecentCheckIns: vi.fn().mockResolvedValue([]),
  createCheckIn: vi.fn().mockResolvedValue(1),
  updateCheckIn: vi.fn().mockResolvedValue(undefined),
  getIdeaCaptures: vi.fn().mockResolvedValue([]),
  createIdeaCapture: vi.fn().mockResolvedValue(1),
  updateIdeaCapture: vi.fn().mockResolvedValue(undefined),
  getWeeklyReview: vi.fn().mockResolvedValue(null),
  upsertWeeklyReview: vi.fn().mockResolvedValue(1),
  getLatestReEntryCard: vi.fn().mockResolvedValue(null),
  createReEntryCard: vi.fn().mockResolvedValue(1),
  acknowledgeReEntryCard: vi.fn().mockResolvedValue(undefined),
  getScratchNotes: vi.fn().mockResolvedValue([]),
  createScratchNote: vi.fn().mockResolvedValue(99),
  updateScratchNote: vi.fn().mockResolvedValue(undefined),
  deleteScratchNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/file.pdf", key: "test-key" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "AI generated response for testing" } }],
  }),
}));

// ─── Test context factory ─────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
  return {
    user: {
      id: 42,
      openId: "test-open-id",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
    ...overrides,
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns the current user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.id).toBe(42);
    expect(user?.email).toBe("test@example.com");
  });

  it("logout clears the session cookie", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx = makeCtx({
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

// ─── Projects tests ───────────────────────────────────────────────────────────
describe("projects", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.projects.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns a project with id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.projects.create({
      title: "Test Project",
      status: "active",
      priorityLevel: "high",
    });
    expect(result).toHaveProperty("id");
  });

  it("listActive returns active projects", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.projects.listActive();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Vault tests ──────────────────────────────────────────────────────────────
describe("vault", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.vault.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("addPaste creates a source item", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.vault.addPaste({
      content: "This is a test note about a project idea",
      title: "Test note",
    });
    expect(result).toHaveProperty("id");
  });
});

// ─── Check-ins tests ─────────────────────────────────────────────────────────
describe("checkIns", () => {
  it("getToday returns null or a check-in", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.checkIns.getToday();
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("getRecent returns an array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.checkIns.getRecent();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── AI / Idea Sanctuary tests ────────────────────────────────────────────────
describe("ai.ideas", () => {
  it("captureIdea creates an idea", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ai.captureIdea({
      content: "Build a feature for voice notes",
      capturedDuringTask: true,
    });
    expect(result).toHaveProperty("id");
  });

  it("listIdeas returns an array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ai.listIdeas();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Scratch Pad tests ───────────────────────────────────────────────────────
describe("scratchPad", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.scratchPad.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns an id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.scratchPad.create({ content: "Buy oat milk" });
    expect(typeof result.id).toBe("number");
  });

  it("update returns success:true", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.scratchPad.update({ id: 1, content: "Updated text" });
    expect(result.success).toBe(true);
  });

  it("delete returns success:true", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.scratchPad.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Daily Plan tests ─────────────────────────────────────────────────────────
describe("dailyPlan", () => {
  it("getToday returns null or a plan", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.dailyPlan.getToday();
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("getTomorrowPlan returns an array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.dailyPlan.getTomorrowPlan();
    expect(Array.isArray(result)).toBe(true);
  });

  it("saveTomorrowPlan returns success:false when no plan exists", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.dailyPlan.saveTomorrowPlan({
      tasks: [{ id: "t1", title: "Write tests", energyLevel: "high", estimatedMinutes: 30 }],
    });
    // getDailyPlan is mocked to return null, so success should be false
    expect(result).toEqual({ success: false });
  });
});

// ─── Settings tests ───────────────────────────────────────────────────────────
describe("settings", () => {
  it("getProfile returns null or a profile object", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.settings.getProfile();
    expect(result === null || typeof result === "object").toBe(true);
  });
});
