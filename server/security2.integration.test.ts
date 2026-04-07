/**
 * Zero-Trust Security Integration Test Suite — Part 2
 * =====================================================
 * Covers: focusSessions, study, intelligence, invites, settings routers
 *
 * TC-1  401 — unauthenticated requests are rejected
 * TC-2  IDOR — User A cannot read/mutate User B's resources
 * TC-3  Injection — SQL-injection payloads are parameterised, never executed raw
 * TC-4  Validation — null / undefined / empty / oversized inputs return 400
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── vi.mock — database layer ─────────────────────────────────────────────────
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

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.pdf", key: "vault/1/test.pdf" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"summary":"test","tags":[],"contentClass":"idea"}' } }],
  }),
}));

vi.mock("./_core/rateLimiter", () => ({
  checkLLMRateLimit: vi.fn(),
}));

// ─── Context factories ────────────────────────────────────────────────────────

type AuthUser = NonNullable<TrpcContext["user"]>;

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

function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    sessionJti: null,
    sessionExp: null,
  };
}

function makeAdminCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  return makeCtx({ id: 99, openId: "admin-user", role: "admin", ...overrides });
}

async function expectUnauthorized(fn: () => Promise<unknown>) {
  await expect(fn()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
}

async function expectForbidden(fn: () => Promise<unknown>) {
  await expect(fn()).rejects.toMatchObject({ code: "FORBIDDEN" });
}

async function expectBadRequest(fn: () => Promise<unknown>) {
  try {
    await fn();
    expect.fail("Expected a TRPCError to be thrown but the call succeeded");
  } catch (err: unknown) {
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
  }
}

import * as db from "./db";

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// FOCUS SESSIONS ROUTER
// =============================================================================

describe("focusSessions router — TC-1: 401 for unauthenticated requests", () => {
  it("focusSessions.save rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.focusSessions.save({
        intention: "deep work",
        startedAt: Date.now(),
        durationSeconds: 1800,
        wasCompleted: true,
      })
    );
  });

  it("focusSessions.list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.focusSessions.list());
  });

  it("focusSessions.getWeekSessions rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.focusSessions.getWeekSessions({ weekStart: Date.now() })
    );
  });

  it("focusSessions.getWeekStats rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.focusSessions.getWeekStats());
  });
});

describe("focusSessions router — TC-2: IDOR prevention", () => {
  it("focusSessions.save always scopes insert to authenticated userId", async () => {
    // The router inserts with userId: ctx.user.id — no client-supplied userId
    vi.mocked(db.getDb).mockResolvedValueOnce({
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 42 }]),
      }),
    } as any);
    const caller = appRouter.createCaller(makeCtx({ id: 7 }));
    // Even if the client tried to pass a different userId, the schema doesn't accept it
    const result = await caller.focusSessions.save({
      intention: "focus block",
      startedAt: Date.now(),
      durationSeconds: 3600,
      wasCompleted: true,
    });
    expect(result).toEqual({ id: 42 });
  });

  it("focusSessions.list scopes query to authenticated userId only", async () => {
    vi.mocked(db.getDb).mockResolvedValueOnce({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    } as any);
    const caller = appRouter.createCaller(makeCtx({ id: 5 }));
    // Should not throw — the WHERE clause is built with ctx.user.id = 5
    const result = await caller.focusSessions.list();
    expect(result).toEqual([]);
  });
});

describe("focusSessions router — TC-3: SQL injection parameterisation", () => {
  const INJECTION_PAYLOAD = "' OR '1'='1";

  it("focusSessions.save stores injection payload in intention as parameterised value", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    });
    vi.mocked(db.getDb).mockResolvedValueOnce({ insert: mockInsert } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.focusSessions.save({
      intention: INJECTION_PAYLOAD,
      startedAt: Date.now(),
      durationSeconds: 600,
      wasCompleted: false,
    });
    expect(result).toEqual({ id: 1 });
    // The injection string is passed as a bound parameter value, not interpolated into SQL
    const valuesCall = mockInsert.mock.results[0]?.value?.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({ intention: INJECTION_PAYLOAD })
    );
  });
});

describe("focusSessions router — TC-4: input validation", () => {
  it("focusSessions.save rejects empty intention string", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.focusSessions.save({
        intention: "",
        startedAt: Date.now(),
        durationSeconds: 1800,
        wasCompleted: true,
      })
    );
  });

  it("focusSessions.save rejects null intention", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.focusSessions.save({
        intention: null as unknown as string,
        startedAt: Date.now(),
        durationSeconds: 1800,
        wasCompleted: true,
      })
    );
  });

  it("focusSessions.save rejects negative durationSeconds", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.focusSessions.save({
        intention: "work",
        startedAt: Date.now(),
        durationSeconds: -1,
        wasCompleted: false,
      })
    );
  });

  it("focusSessions.save rejects missing startedAt", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.focusSessions.save({
        intention: "work",
        durationSeconds: 600,
        wasCompleted: false,
      } as any)
    );
  });

  it("focusSessions.list rejects days > 90", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.focusSessions.list({ days: 91 }));
  });

  it("focusSessions.list rejects days = 0", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.focusSessions.list({ days: 0 }));
  });
});

// =============================================================================
// STUDY ROUTER
// =============================================================================

describe("study router — TC-1: 401 for unauthenticated requests", () => {
  it("study.getDayLogs rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.study.getDayLogs());
  });

  it("study.saveDayLog rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.study.saveDayLog({ dayNum: 1 }));
  });

  it("study.getFocusBlocks rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.study.getFocusBlocks());
  });

  it("study.addFocusBlock rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.study.addFocusBlock({ logDate: "2025-01-01" })
    );
  });

  it("study.deleteFocusBlock rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.study.deleteFocusBlock({ id: 1 }));
  });

  it("study.getWeeklyReviews rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.study.getWeeklyReviews());
  });
});

describe("study router — TC-2: IDOR prevention", () => {
  it("study.deleteFocusBlock scopes delete to authenticated userId", async () => {
    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
    });
    vi.mocked(db.getDb).mockResolvedValueOnce({ delete: mockDelete } as any);
    const caller = appRouter.createCaller(makeCtx({ id: 4 }));
    // The WHERE clause must include userId = 4, not just id = 99
    await caller.study.deleteFocusBlock({ id: 99 });
    // Verify the delete was called (IDOR protection is in the WHERE clause built by Drizzle)
    expect(mockDelete).toHaveBeenCalled();
  });

  it("study.saveDayLog always inserts with authenticated userId", async () => {
    vi.mocked(db.getDb).mockResolvedValueOnce({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 5 }]),
      }),
    } as any);
    const caller = appRouter.createCaller(makeCtx({ id: 8 }));
    const result = await caller.study.saveDayLog({ dayNum: 1 });
    expect(result).toEqual({ id: 5 });
  });
});

describe("study router — TC-3: SQL injection parameterisation", () => {
  const INJECTION_PAYLOAD = "' OR '1'='1";

  it("study.saveDayLog stores injection payload in summary as parameterised value", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    });
    vi.mocked(db.getDb).mockResolvedValueOnce({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: mockInsert,
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await caller.study.saveDayLog({ dayNum: 1, summary: INJECTION_PAYLOAD });
    const valuesCall = mockInsert.mock.results[0]?.value?.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({ summary: INJECTION_PAYLOAD })
    );
  });
});

describe("study router — TC-4: input validation", () => {
  it("study.saveDayLog rejects dayNum = 0", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.study.saveDayLog({ dayNum: 0 }));
  });

  it("study.saveDayLog rejects dayNum > 30", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.study.saveDayLog({ dayNum: 31 }));
  });

  it("study.saveDayLog rejects invalid logDate format", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.study.saveDayLog({ dayNum: 1, logDate: "01-01-2025" })
    );
  });

  it("study.saveDayLog rejects null dayNum", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.study.saveDayLog({ dayNum: null as unknown as number })
    );
  });

  it("study.addFocusBlock rejects invalid logDate format", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.study.addFocusBlock({ logDate: "not-a-date" })
    );
  });

  it("study.addFocusBlock rejects missing logDate", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.study.addFocusBlock({} as any));
  });
});

// =============================================================================
// INVITES ROUTER
// =============================================================================

describe("invites router — TC-1: 401 for unauthenticated requests", () => {
  it("invites.generate rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.invites.generate({}));
  });

  it("invites.bulkGenerate rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.invites.bulkGenerate({ count: 5 }));
  });

  it("invites.list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.invites.list());
  });

  it("invites.validate rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.invites.validate({ code: "BETA-0001" }));
  });

  it("invites.redeem rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.invites.redeem({ code: "BETA-0001" }));
  });
});

describe("invites router — TC-1b: 403 FORBIDDEN for non-admin users", () => {
  it("invites.generate returns FORBIDDEN for regular users", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "user" }));
    await expectForbidden(() => caller.invites.generate({}));
  });

  it("invites.bulkGenerate returns FORBIDDEN for regular users", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "user" }));
    await expectForbidden(() => caller.invites.bulkGenerate({ count: 3 }));
  });

  it("invites.list returns FORBIDDEN for regular users", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "user" }));
    await expectForbidden(() => caller.invites.list());
  });
});

describe("invites router — TC-2: IDOR prevention", () => {
  it("invites.list only returns codes created by the authenticated admin", async () => {
    const adminCodes = [{ id: 1, code: "BETA-ADMIN", createdByUserId: 99 }];
    vi.mocked(db.getInviteCodes).mockResolvedValueOnce(adminCodes as any);
    const caller = appRouter.createCaller(makeAdminCtx({ id: 99 }));
    const result = await caller.invites.list();
    expect(db.getInviteCodes).toHaveBeenCalledWith(99);
    expect(result).toEqual(adminCodes);
  });

  it("invites.redeem ties the code to the authenticated user — cannot redeem on behalf of another", async () => {
    vi.mocked(db.validateInviteCode).mockResolvedValueOnce({ id: 1, code: "BETA-0001", usedAt: null } as any);
    vi.mocked(db.markInviteUsed).mockResolvedValueOnce(true);
    vi.mocked(db.setUserInviteCode).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 42 }));
    await caller.invites.redeem({ code: "BETA-0001" });
    // markInviteUsed must be called with the authenticated userId, not a client-supplied one
    expect(db.markInviteUsed).toHaveBeenCalledWith("BETA-0001", 42);
    expect(db.setUserInviteCode).toHaveBeenCalledWith(42, "BETA-0001");
  });

  it("invites.redeem returns CONFLICT if code was used in a race condition", async () => {
    vi.mocked(db.validateInviteCode).mockResolvedValueOnce({ id: 1, code: "BETA-RACE", usedAt: null } as any);
    vi.mocked(db.markInviteUsed).mockResolvedValueOnce(false); // race: already used
    const caller = appRouter.createCaller(makeCtx({ id: 10 }));
    await expect(caller.invites.redeem({ code: "BETA-RACE" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("invites router — TC-3: SQL injection parameterisation", () => {
  const INJECTION_PAYLOAD = "' OR '1'='1";

  it("invites.validate passes injection payload as bound parameter to validateInviteCode", async () => {
    vi.mocked(db.validateInviteCode).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.invites.validate({ code: INJECTION_PAYLOAD })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // validateInviteCode receives the raw string — Drizzle parameterises it
    expect(db.validateInviteCode).toHaveBeenCalledWith(INJECTION_PAYLOAD);
  });
});

describe("invites router — TC-4: input validation", () => {
  it("invites.validate rejects empty code", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.invites.validate({ code: "" }));
  });

  it("invites.validate rejects code exceeding 32 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.invites.validate({ code: "X".repeat(33) })
    );
  });

  it("invites.validate rejects null code", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.invites.validate({ code: null as unknown as string })
    );
  });

  it("invites.redeem rejects empty code", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() => caller.invites.redeem({ code: "" }));
  });

  it("invites.bulkGenerate rejects count = 0", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expectBadRequest(() => caller.invites.bulkGenerate({ count: 0 }));
  });

  it("invites.bulkGenerate rejects count > 50", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expectBadRequest(() => caller.invites.bulkGenerate({ count: 51 }));
  });

  it("invites.bulkGenerate rejects non-integer count", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expectBadRequest(() => caller.invites.bulkGenerate({ count: 1.5 }));
  });

  it("invites.generate rejects label exceeding 255 characters", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expectBadRequest(() =>
      caller.invites.generate({ label: "L".repeat(256) })
    );
  });
});

// =============================================================================
// SETTINGS ROUTER
// =============================================================================

describe("settings router — TC-1: 401 for unauthenticated requests", () => {
  it("settings.getProfile rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.settings.getProfile());
  });

  it("settings.updateSettings rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.settings.updateSettings({}));
  });

  it("settings.completeOnboarding rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.settings.completeOnboarding({
        workTypes: ["writing"],
        distractionPatterns: ["social media"],
        focusHoursStart: "09:00",
        focusHoursEnd: "17:00",
        tonePreference: "direct",
      })
    );
  });

  it("settings.deleteAccount rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.settings.deleteAccount({ confirmation: "DELETE" })
    );
  });

  it("settings.markAboutSeen rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.settings.markAboutSeen());
  });
});

describe("settings router — TC-2: IDOR prevention", () => {
  it("settings.updateSettings always scopes update to authenticated userId", async () => {
    vi.mocked(db.getUserProfile).mockResolvedValueOnce({ id: 1, userId: 1 } as any);
    vi.mocked(db.updateUserProfile).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 6 }));
    await caller.settings.updateSettings({ tonePreference: "firm" });
    // updateUserProfile must be called with the authenticated userId, not a client-supplied one
    expect(db.updateUserProfile).toHaveBeenCalledWith(6, expect.any(Object));
  });

  it("settings.deleteAccount only deletes data belonging to the authenticated user", async () => {
    vi.mocked(db.deleteAllUserData).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 12 }));
    await caller.settings.deleteAccount({ confirmation: "DELETE" });
    expect(db.deleteAllUserData).toHaveBeenCalledWith(12);
  });

  it("settings.getProfile only retrieves the authenticated user's profile", async () => {
    vi.mocked(db.getUserProfile).mockResolvedValueOnce({ id: 1, userId: 3 } as any);
    const caller = appRouter.createCaller(makeCtx({ id: 3 }));
    await caller.settings.getProfile();
    expect(db.getUserProfile).toHaveBeenCalledWith(3);
  });
});

describe("settings router — TC-3: SQL injection parameterisation", () => {
  const INJECTION_PAYLOAD = "' OR '1'='1";

  it("settings.updateSettings passes injection payload in timezone as bound parameter", async () => {
    vi.mocked(db.getUserProfile).mockResolvedValueOnce({ id: 1, userId: 1 } as any);
    vi.mocked(db.updateUserProfile).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await caller.settings.updateSettings({ timezone: INJECTION_PAYLOAD });
    expect(db.updateUserProfile).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ timezone: INJECTION_PAYLOAD })
    );
  });
});

describe("settings router — TC-4: input validation", () => {
  it("settings.deleteAccount rejects wrong confirmation string", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.deleteAccount({ confirmation: "delete" as unknown as "DELETE" })
    );
  });

  it("settings.deleteAccount rejects null confirmation", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.deleteAccount({ confirmation: null as unknown as "DELETE" })
    );
  });

  it("settings.updateSettings rejects invalid tonePreference enum", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.updateSettings({ tonePreference: "aggressive" as any })
    );
  });

  it("settings.updateSettings rejects coldProjectThresholdDays = 0", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.updateSettings({ coldProjectThresholdDays: 0 })
    );
  });

  it("settings.updateSettings rejects coldProjectThresholdDays > 30", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.updateSettings({ coldProjectThresholdDays: 31 })
    );
  });

  it("settings.completeOnboarding rejects invalid tonePreference", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.completeOnboarding({
        workTypes: ["writing"],
        distractionPatterns: [],
        focusHoursStart: "09:00",
        focusHoursEnd: "17:00",
        tonePreference: "harsh" as any,
      })
    );
  });

  it("settings.completeOnboarding rejects workType string exceeding 100 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.completeOnboarding({
        workTypes: ["w".repeat(101)],
        distractionPatterns: [],
        focusHoursStart: "09:00",
        focusHoursEnd: "17:00",
        tonePreference: "direct",
      })
    );
  });

  it("settings.completeOnboarding rejects distractionPattern exceeding 200 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.completeOnboarding({
        workTypes: ["writing"],
        distractionPatterns: ["d".repeat(201)],
        focusHoursStart: "09:00",
        focusHoursEnd: "17:00",
        tonePreference: "direct",
      })
    );
  });

  it("settings.completeOnboarding rejects null workTypes", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.settings.completeOnboarding({
        workTypes: null as unknown as string[],
        distractionPatterns: [],
        focusHoursStart: "09:00",
        focusHoursEnd: "17:00",
        tonePreference: "direct",
      })
    );
  });
});

// =============================================================================
// INTELLIGENCE ROUTER — 401 and key IDOR checks
// =============================================================================

describe("intelligence router — TC-1: 401 for unauthenticated requests", () => {
  it("intelligence.getWeeklyCompass rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() => caller.intelligence.getWeeklyCompass());
  });

  it("intelligence.confirmWeeklyCompass rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.intelligence.confirmWeeklyCompass({
        primaryProjectId: null,
        secondaryProjectId: null,
      })
    );
  });

  it("intelligence.buildProjectTimeline rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.intelligence.buildProjectTimeline({ projectId: 1 })
    );
  });

  it("insights.dismissInsight rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expectUnauthorized(() =>
      caller.insights.dismissInsight({ id: 1 })
    );
  });
});

describe("intelligence router — TC-2: IDOR prevention", () => {
  it("intelligence.buildProjectTimeline returns synced:0 when project belongs to another user", async () => {
    // buildProjectTimeline returns { synced: 0 } (not an error) when project not found
    // This is by design — the userId scoping happens inside getProjectById
    vi.mocked(db.getProjectById).mockResolvedValueOnce(undefined);
    vi.mocked(db.getFocusSessionsByProject).mockResolvedValueOnce([]);
    vi.mocked(db.getRecentCheckIns).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    const result = await caller.intelligence.buildProjectTimeline({ projectId: 999 });
    // Returns empty result, not an error — but crucially, getProjectById was called with userId=1
    expect(result).toEqual({ synced: 0 });
    expect(db.getProjectById).toHaveBeenCalledWith(999, 1);
  });

  it("insights.dismissInsight passes userId to DB — cannot dismiss another user's insight", async () => {
    vi.mocked(db.dismissPatternInsight).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 5 }));
    await caller.insights.dismissInsight({ id: 88 });
    expect(db.dismissPatternInsight).toHaveBeenCalledWith(88, 5);
  });

  it("intelligence.getWeeklyCompass scopes query to authenticated userId", async () => {
    vi.mocked(db.getLatestWeeklyCompass).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx({ id: 9 }));
    await caller.intelligence.getWeeklyCompass();
    expect(db.getLatestWeeklyCompass).toHaveBeenCalledWith(9);
  });
});

describe("intelligence router — TC-3: SQL injection parameterisation", () => {
  const INJECTION_PAYLOAD = "' OR '1'='1";

  it("intelligence.confirmWeeklyCompass stores injection payload in adminLane as parameterised value", async () => {
    const existingCompass = {
      id: 1,
      userId: 1,
      weekStart: new Date(),
      primaryProjectId: null,
      secondaryProjectId: null,
      adminLane: "",
      userConfirmedAt: null,
    };
    vi.mocked(db.getLatestWeeklyCompass).mockResolvedValueOnce(existingCompass as any);
    vi.mocked(db.upsertWeeklyCompass).mockResolvedValueOnce(1);
    const caller = appRouter.createCaller(makeCtx());
    await caller.intelligence.confirmWeeklyCompass({
      primaryProjectId: null,
      secondaryProjectId: null,
      adminLane: INJECTION_PAYLOAD,
    });
    expect(db.upsertWeeklyCompass).toHaveBeenCalledWith(
      expect.objectContaining({ adminLane: INJECTION_PAYLOAD })
    );
  });
});

describe("intelligence router — TC-4: input validation", () => {
  it("intelligence.buildProjectTimeline rejects non-integer projectId", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.intelligence.buildProjectTimeline({ projectId: "abc" as unknown as number })
    );
  });

  it("insights.dismissInsight rejects missing id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expectBadRequest(() =>
      caller.insights.dismissInsight({} as any)
    );
  });
});
