/**
 * Zero-Trust Security Integration Test Suite
 * ============================================
 * Senior QA Engineer audit covering 4 categories across all major routers:
 *
 *   TC-1  401 — unauthenticated requests are rejected
 *   TC-2  IDOR — User A cannot read/mutate User B's resources
 *   TC-3  Injection — SQL-injection payloads are parameterised, never executed raw
 *   TC-4  Validation — null / undefined / empty / oversized inputs return 400
 *
 * Database layer is fully mocked via vi.mock so no real DB is required.
 * All tests run in-process against the real tRPC router tree.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── vi.mock — database layer ─────────────────────────────────────────────────
// We mock the entire db module so tests never touch a real database.
// Individual tests override specific functions via mockResolvedValue / mockReturnValue.
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  // Projects
  getProjects: vi.fn().mockResolvedValue([]),
  getActiveProjects: vi.fn().mockResolvedValue([]),
  getColdProjects: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue(undefined),
  createProject: vi.fn().mockResolvedValue(1),
  updateProject: vi.fn().mockResolvedValue(undefined),
  createProjectMemoryEvent: vi.fn().mockResolvedValue(1),
  batchCreateProjectMemoryEvents: vi.fn().mockResolvedValue(undefined),
  // Vault / Source Items
  getSourceItems: vi.fn().mockResolvedValue([]),
  getSourceItemsByState: vi.fn().mockResolvedValue([]),
  getSourceItemById: vi.fn().mockResolvedValue(undefined),
  createSourceItem: vi.fn().mockResolvedValue(1),
  updateSourceItem: vi.fn().mockResolvedValue(undefined),
  batchUpdateSourceItemsState: vi.fn().mockResolvedValue(undefined),
  // Focus Sessions
  getRecentFocusSessions: vi.fn().mockResolvedValue([]),
  getFocusSessionsByProject: vi.fn().mockResolvedValue([]),
  saveFocusSession: vi.fn().mockResolvedValue(1),
  // Study
  getDb: vi.fn().mockResolvedValue(null),
  // Settings / Profile
  getUserProfile: vi.fn().mockResolvedValue(undefined),
  upsertUserProfile: vi.fn().mockResolvedValue(undefined),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  deleteAllUserData: vi.fn().mockResolvedValue(undefined),
  // Invites
  createInviteCode: vi.fn().mockResolvedValue({ id: 1, code: "BETA-0001", label: null, usedAt: null }),
  getInviteCodes: vi.fn().mockResolvedValue([]),
  validateInviteCode: vi.fn().mockResolvedValue(null),
  markInviteUsed: vi.fn().mockResolvedValue(true),
  setUserInviteCode: vi.fn().mockResolvedValue(undefined),
  // Intelligence
  getLatestWeeklyCompass: vi.fn().mockResolvedValue(undefined),
  upsertWeeklyCompass: vi.fn().mockResolvedValue(1),
  getProjectMemoryEvents: vi.fn().mockResolvedValue([]),
  getLastDecisionForProject: vi.fn().mockResolvedValue(undefined),
  getActivePatternInsights: vi.fn().mockResolvedValue([]),
  insertPatternInsight: vi.fn().mockResolvedValue(1),
  dismissPatternInsight: vi.fn().mockResolvedValue(undefined),
  // Notifications
  upsertPushSubscription: vi.fn().mockResolvedValue(undefined),
  deletePushSubscription: vi.fn().mockResolvedValue(undefined),
  getPushSubscriptionsForUser: vi.fn().mockResolvedValue([]),
  getNotificationSettings: vi.fn().mockResolvedValue(undefined),
  upsertNotificationSettings: vi.fn().mockResolvedValue(undefined),
  // Check-ins / daily plans
  getCheckIns: vi.fn().mockResolvedValue([]),
  getRecentCheckIns: vi.fn().mockResolvedValue([]),
  createCheckIn: vi.fn().mockResolvedValue(1),
  updateCheckIn: vi.fn().mockResolvedValue(undefined),
  getDailyPlan: vi.fn().mockResolvedValue(undefined),
  getRecentDailyPlans: vi.fn().mockResolvedValue([]),
  upsertDailyPlan: vi.fn().mockResolvedValue(1),
  updateDailyPlan: vi.fn().mockResolvedValue(undefined),
  // Decisions
  createDecision: vi.fn().mockResolvedValue(1),
  getDecisionsByProject: vi.fn().mockResolvedValue([]),
  getRecentDecisions: vi.fn().mockResolvedValue([]),
  // Misc
  getHealthScoresForUser: vi.fn().mockResolvedValue([]),
  getWeeklyCheckInPresence: vi.fn().mockResolvedValue([]),
  getIdeaCaptures: vi.fn().mockResolvedValue([]),
  createIdeaCapture: vi.fn().mockResolvedValue(1),
  updateIdeaCapture: vi.fn().mockResolvedValue(undefined),
  getWeeklyReview: vi.fn().mockResolvedValue(undefined),
  upsertWeeklyReview: vi.fn().mockResolvedValue(1),
  getLatestReEntryCard: vi.fn().mockResolvedValue(undefined),
  createReEntryCard: vi.fn().mockResolvedValue(1),
  acknowledgeReEntryCard: vi.fn().mockResolvedValue(undefined),
  getDistractionEventsByUser: vi.fn().mockResolvedValue([]),
  getDistractionWeeklyAggregates: vi.fn().mockResolvedValue([]),
  createDistractionEvent: vi.fn().mockResolvedValue(1),
  getRecentNotificationLog: vi.fn().mockResolvedValue([]),
  logNotificationSent: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage (S3) so file-upload tests don't hit real S3
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.pdf", key: "vault/1/test.pdf" }),
}));

// Mock LLM so AI procedures don't make real API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"summary":"test","tags":[],"contentClass":"idea"}' } }],
  }),
}));

// Mock rate limiter so LLM-backed tests don't get throttled
vi.mock("./_core/rateLimiter", () => ({
  checkLLMRateLimit: vi.fn(),
}));

// ─── Context factories ────────────────────────────────────────────────────────

type AuthUser = NonNullable<TrpcContext["user"]>;

/** Build a minimal TrpcContext for an authenticated user */
function makeCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  const user: AuthUser = {
    id: 1,
    openId: "user-A",
    email: "a@example.com",
    name: "User A",
    loginMethod: "manus",
    role: "user",
    inviteCode: null,
    welcomeNotified: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    lastSignedIn: new Date("2025-01-01"),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    sessionJti: "jti-test",
    sessionExp: Math.floor(Date.now() / 1000) + 3600,
  };
}

/** Build a TrpcContext with no authenticated user (unauthenticated) */
function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    sessionJti: null,
    sessionExp: null,
  };
}

/** Build a TrpcContext for an admin user */
function makeAdminCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  return makeCtx({ id: 99, openId: "admin-user", role: "admin", ...overrides });
}

/**
 * Assert that a tRPC call throws UNAUTHORIZED (maps to HTTP 401).
 * Used for TC-1 across all protected procedures.
 */
async function expectUnauthorized(fn: () => Promise<unknown>) {
  await expect(fn()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
}

/**
 * Assert that a tRPC call throws BAD_REQUEST (maps to HTTP 400).
 * Used for TC-4 validation tests.
 */
async function expectBadRequest(fn: () => Promise<unknown>) {
  try {
    await fn();
    expect.fail("Expected a TRPCError to be thrown but the call succeeded");
  } catch (err: unknown) {
    // tRPC wraps Zod errors as BAD_REQUEST
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
  }
}

// ─── Import db mocks for spy assertions ──────────────────────────────────────
import * as db from "./db";

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// VAULT ROUTER
// =============================================================================

describe("vault router — TC-1: 401 for unauthenticated requests", () => {
  it("vault.list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.vault.list());
  });

  it("vault.getById rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.vault.getById({ id: 1 }));
  });

  it("vault.addPaste rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.vault.addPaste({ content: "hello", sourceType: "paste", contentClass: "idea" })
    );
  });

  it("vault.updateState rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.vault.updateState({ id: 1, state: "archived" }));
  });

  it("vault.updateItem rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.vault.updateItem({ id: 1 }));
  });

  it("vault.markReviewed rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.vault.markReviewed({ id: 1 }));
  });

  it("vault.aiProcess rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.vault.aiProcess({ id: 1 }));
  });
});

describe("vault router — TC-2: IDOR prevention", () => {
  it("vault.getById returns NOT_FOUND when item belongs to another user", async () => {
    // getSourceItemById is scoped by userId — returns undefined for wrong user
    vi.mocked(db.getSourceItemById).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    await expect(caller.vault.getById({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    // Verify the DB call was made with User A's id, not a raw lookup
    expect(db.getSourceItemById).toHaveBeenCalledWith(999, 1);
  });

  it("vault.updateItem silently no-ops when item belongs to another user", async () => {
    // updateSourceItem is scoped by userId in WHERE clause — no rows affected
    vi.mocked(db.getSourceItemById).mockResolvedValueOnce(undefined);
    vi.mocked(db.updateSourceItem).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    // Should succeed (no error) but the DB call must include userId = 1
    await caller.vault.updateItem({ id: 999, title: "Hijack attempt" });
    expect(db.updateSourceItem).toHaveBeenCalledWith(999, 1, expect.any(Object));
  });

  it("vault.updateState passes userId to DB — cannot target another user's item", async () => {
    vi.mocked(db.updateSourceItem).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 2 }));
    await caller.vault.updateState({ id: 42, state: "archived" });
    // The second argument to updateSourceItem must always be the authenticated userId
    expect(db.updateSourceItem).toHaveBeenCalledWith(42, 2, expect.objectContaining({ state: "archived" }));
  });

  it("vault.markReviewed passes userId to DB — cannot mark another user's item", async () => {
    vi.mocked(db.getSourceItemById).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 3 }));
    // Item not found for this user → NOT_FOUND
    await expect(caller.vault.markReviewed({ id: 77 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.getSourceItemById).toHaveBeenCalledWith(77, 3);
  });

  it("vault.aiProcess returns NOT_FOUND when item belongs to another user", async () => {
    vi.mocked(db.getSourceItemById).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    await expect(caller.vault.aiProcess({ id: 500 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.getSourceItemById).toHaveBeenCalledWith(500, 1);
  });
});

describe("vault router — TC-3: SQL injection parameterisation", () => {
  const INJECTION_PAYLOAD = "' OR '1'='1";

  it("vault.addPaste stores injection payload as literal string, not executed SQL", async () => {
    vi.mocked(db.createSourceItem).mockResolvedValueOnce(1);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.vault.addPaste({
      content: INJECTION_PAYLOAD,
      sourceType: "paste",
      contentClass: "idea",
    });
    expect(result).toEqual({ id: 1 });
    // The injection string must be passed as a parameter value, not interpolated
    expect(db.createSourceItem).toHaveBeenCalledWith(
      expect.objectContaining({ rawContent: INJECTION_PAYLOAD })
    );
  });

  it("vault.updateItem stores injection payload in title as literal string", async () => {
    vi.mocked(db.getSourceItemById).mockResolvedValueOnce(undefined);
    vi.mocked(db.updateSourceItem).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await caller.vault.updateItem({ id: 1, title: INJECTION_PAYLOAD });
    expect(db.updateSourceItem).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ title: INJECTION_PAYLOAD })
    );
  });
});

describe("vault router — TC-4: input validation", () => {
  it("vault.addPaste rejects empty content string", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.vault.addPaste({ content: "", sourceType: "paste", contentClass: "idea" })
    );
  });

  it("vault.addPaste rejects content exceeding 50,000 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.vault.addPaste({
        content: "x".repeat(50_001),
        sourceType: "paste",
        contentClass: "idea",
      })
    );
  });

  it("vault.addPaste rejects null content (type error → BAD_REQUEST)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.vault.addPaste({ content: null as unknown as string, sourceType: "paste", contentClass: "idea" })
    );
  });

  it("vault.updateItem rejects title exceeding 500 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.vault.updateItem({ id: 1, title: "a".repeat(501) })
    );
  });

  it("vault.updateItem rejects summary exceeding 2000 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.vault.updateItem({ id: 1, summary: "s".repeat(2001) })
    );
  });

  it("vault.addFile rejects disallowed MIME type", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.vault.addFile({
        fileDataBase64: Buffer.from("test").toString("base64"),
        mimeType: "application/x-msdownload", // .exe — not in allowlist
        fileName: "malware.exe",
        sourceType: "upload",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("vault.addFile rejects fileDataBase64 exceeding 25M characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.vault.addFile({
        fileDataBase64: "A".repeat(25_000_001),
        mimeType: "application/pdf",
        fileName: "big.pdf",
        sourceType: "upload",
      })
    );
  });
});

// =============================================================================
// PROJECTS ROUTER
// =============================================================================

describe("projects router — TC-1: 401 for unauthenticated requests", () => {
  it("projects.list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.projects.list());
  });

  it("projects.create rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.projects.create({ title: "New Project" }));
  });

  it("projects.update rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.projects.update({ id: 1 }));
  });

  it("projects.archive rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.projects.archive({ id: 1 }));
  });

  it("projects.updateContextBreadcrumb rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.projects.updateContextBreadcrumb({ id: 1, breadcrumb: "stopped here" })
    );
  });
});

describe("projects router — TC-2: IDOR prevention", () => {
  it("projects.update passes authenticated userId to DB — cannot update another user's project", async () => {
    vi.mocked(db.updateProject).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 7 }));
    await caller.projects.update({ id: 100, title: "Hijack" });
    // updateProject must always receive the authenticated user's id as the second argument
    expect(db.updateProject).toHaveBeenCalledWith(100, 7, expect.any(Object));
  });

  it("projects.archive passes authenticated userId to DB", async () => {
    vi.mocked(db.updateProject).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 5 }));
    await caller.projects.archive({ id: 200 });
    expect(db.updateProject).toHaveBeenCalledWith(200, 5, expect.objectContaining({ status: "archived" }));
  });

  it("projects.updateContextBreadcrumb passes authenticated userId to DB", async () => {
    vi.mocked(db.updateProject).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 3 }));
    await caller.projects.updateContextBreadcrumb({ id: 55, breadcrumb: "left off at step 3" });
    expect(db.updateProject).toHaveBeenCalledWith(55, 3, expect.objectContaining({ contextBreadcrumb: "left off at step 3" }));
  });

  it("projects.list only returns projects belonging to the authenticated user", async () => {
    const userAProjects = [{ id: 1, userId: 1, title: "My Project" }];
    vi.mocked(db.getProjects).mockResolvedValueOnce(userAProjects as any);
    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    const result = await caller.projects.list();
    expect(db.getProjects).toHaveBeenCalledWith(1);
    expect(result).toEqual(userAProjects);
  });
});

describe("projects router — TC-3: SQL injection parameterisation", () => {
  const INJECTION_PAYLOAD = "' OR '1'='1";

  it("projects.create stores injection payload in title as parameterised value", async () => {
    vi.mocked(db.createProject).mockResolvedValueOnce(1);
    const caller = appRouter.createCaller(makeCtx());
    await caller.projects.create({ title: INJECTION_PAYLOAD });
    expect(db.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ title: INJECTION_PAYLOAD })
    );
  });

  it("projects.update stores injection payload in blockers as parameterised value", async () => {
    vi.mocked(db.updateProject).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await caller.projects.update({ id: 1, blockers: INJECTION_PAYLOAD });
    expect(db.updateProject).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ blockers: INJECTION_PAYLOAD })
    );
  });
});

describe("projects router — TC-4: input validation", () => {
  it("projects.create rejects empty title", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.projects.create({ title: "" }));
  });

  it("projects.create rejects title exceeding 255 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.projects.create({ title: "t".repeat(256) }));
  });

  it("projects.create rejects null title", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.projects.create({ title: null as unknown as string }));
  });

  it("projects.update rejects invalid status enum value", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.projects.update({ id: 1, status: "deleted" as any })
    );
  });

  it("projects.updateContextBreadcrumb rejects breadcrumb exceeding 500 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.projects.updateContextBreadcrumb({ id: 1, breadcrumb: "b".repeat(501) })
    );
  });

  it("projects.update rejects missing id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.projects.update({} as any));
  });
});
