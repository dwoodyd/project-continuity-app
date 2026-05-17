import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { assertProjectOwnedBy, createProjectMemoryEvent, getDb } from "../db";
import { focusSessions, focusSessionArtifact, threadStrength, sourceItems } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

// Thread units per duration
const THREAD_UNITS: Record<number, number> = { 25: 1, 50: 2, 90: 3 };

// Compute the start of the current week (Monday 00:00 UTC)
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export const focusSessionsRouter = router({
  // ── Check free-tier weekly limit ────────────────────────────────────────────
  checkWeeklyLimit: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { canStart: true, usedThisWeek: 0, isPro: false };

    const user = ctx.user;
    const isPro = user.isPro || user.isFoundingMember || user.isBeta;
    if (isPro) return { canStart: true, usedThisWeek: 0, isPro: true };

    const weekStart = getWeekStart();
    const sessions = await db
      .select()
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, user.id),
          gte(focusSessions.startedAt, weekStart),
          eq(focusSessions.wasCompleted, 1)
        )
      );

    const usedThisWeek = sessions.length;
    return { canStart: usedThisWeek < 1, usedThisWeek, isPro: false };
  }),

  // ── Start a session (creates the row, returns id) ───────────────────────────
  start: protectedProcedure
    .input(z.object({
      intention: z.string().max(500).optional(),
      projectId: z.number().optional(),
      durationMinutes: z.union([z.literal(25), z.literal(50), z.literal(90)]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });

      if (input.projectId) await assertProjectOwnedBy(input.projectId, ctx.user.id);

      const threadUnits = THREAD_UNITS[input.durationMinutes] ?? 1;

      const [result] = await db.insert(focusSessions).values({
        userId: ctx.user.id,
        projectId: input.projectId ?? null,
        intention: input.intention ?? null,
        durationMinutes: input.durationMinutes,
        durationSeconds: input.durationMinutes * 60,
        threadAddedUnits: threadUnits,
        wasCompleted: 0,
      });

      const sessionId = (result as { insertId: number }).insertId;
      return { id: sessionId };
    }),

  // ── Complete a session ──────────────────────────────────────────────────────
  complete: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      whatMoved: z.enum(["progress", "thinking", "stuck"]),
      closingNote: z.string().max(1000).optional(),
      wasEarlyEnd: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });

      // Verify ownership
      const [session] = await db
        .select()
        .from(focusSessions)
        .where(and(eq(focusSessions.id, input.sessionId), eq(focusSessions.userId, ctx.user.id)));

      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      // Update session
      await db
        .update(focusSessions)
        .set({
          whatMoved: input.whatMoved,
          closingNote: input.closingNote ?? null,
          completedAt: new Date(),
          wasCompleted: 1,
        })
        .where(eq(focusSessions.id, input.sessionId));

      // Upsert artifact
      const existing = await db
        .select()
        .from(focusSessionArtifact)
        .where(eq(focusSessionArtifact.userId, ctx.user.id));

      if (existing.length > 0) {
        await db
          .update(focusSessionArtifact)
          .set({
            totalSegments: (existing[0].totalSegments ?? 0) + 1,
            lastUpdatedAt: new Date(),
          })
          .where(eq(focusSessionArtifact.userId, ctx.user.id));
      } else {
        await db.insert(focusSessionArtifact).values({
          userId: ctx.user.id,
          totalSegments: 1,
          lastUpdatedAt: new Date(),
        });
      }

      // Save closing note to Vault if provided
      if (input.closingNote && input.closingNote.trim()) {
        try {
          await db.insert(sourceItems).values({
            userId: ctx.user.id,
            rawContent: input.closingNote.trim(),
            cleanContent: input.closingNote.trim(),
            sourceType: "text",
            title: "Focus session note",
            tags: JSON.stringify(["focus-session"]),
            state: "inbox",
          });
        } catch (_) { /* non-blocking */ }
      }

      // Bump Thread Strength
      try {
        const durationMinutes = session.durationMinutes ?? 25;
        const weight = durationMinutes >= 90 ? 2 : durationMinutes >= 50 ? 1.5 : 1;
        const existing = await db.select().from(threadStrength).where(eq(threadStrength.userId, ctx.user.id));
        if (existing.length > 0) {
          const current = existing[0];
          const newScore = Math.min((current.score ?? 0) + weight, 100);
          await db.update(threadStrength).set({ score: newScore, lastUpdatedAt: new Date() }).where(eq(threadStrength.userId, ctx.user.id));
        }
      } catch (_) { /* non-blocking */ }

      // Project memory event
      if (session.projectId) {
        try {
          await createProjectMemoryEvent({
            userId: ctx.user.id,
            projectId: session.projectId,
            eventType: "focus_session",
            content: `Focus session: "${session.intention ?? "no intention set"}" — ${session.durationMinutes} min. What moved: ${input.whatMoved}.${input.closingNote ? ` Note: ${input.closingNote.substring(0, 200)}` : ""}`,
          });
        } catch (_) { /* non-blocking */ }
      }

      return { ok: true };
    }),

  // ── Get artifact data (all sessions for procedural rendering) ───────────────
  getArtifact: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { sessions: [], totalSegments: 0 };

    const sessions = await db
      .select({
        id: focusSessions.id,
        durationMinutes: focusSessions.durationMinutes,
        whatMoved: focusSessions.whatMoved,
        completedAt: focusSessions.completedAt,
        threadAddedUnits: focusSessions.threadAddedUnits,
      })
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, ctx.user.id), eq(focusSessions.wasCompleted, 1)))
      .orderBy(focusSessions.startedAt);

    const artifact = await db
      .select()
      .from(focusSessionArtifact)
      .where(eq(focusSessionArtifact.userId, ctx.user.id));

    return {
      sessions,
      totalSegments: artifact[0]?.totalSegments ?? sessions.length,
    };
  }),

  // ── Today stats ─────────────────────────────────────────────────────────────
  getTodayStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { todaySessions: 0, todayMinutes: 0, lifetimeSessions: 0 };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const all = await db
      .select()
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, ctx.user.id), eq(focusSessions.wasCompleted, 1)));

    const today = all.filter((s) => s.completedAt && s.completedAt >= todayStart);
    const todayMinutes = today.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

    return {
      todaySessions: today.length,
      todayMinutes,
      lifetimeSessions: all.length,
    };
  }),

  // ── Legacy: save (kept for backward compat) ─────────────────────────────────
  save: protectedProcedure
    .input(z.object({
      intention: z.string().min(1).max(500),
      projectId: z.number().optional(),
      startedAt: z.number(),
      durationSeconds: z.number().min(0),
      wasCompleted: z.boolean(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.projectId) await assertProjectOwnedBy(input.projectId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });

      const [result] = await db.insert(focusSessions).values({
        userId: ctx.user.id,
        projectId: input.projectId ?? null,
        intention: input.intention,
        startedAt: new Date(input.startedAt),
        durationSeconds: input.durationSeconds,
        completedAt: input.wasCompleted ? new Date() : null,
        wasCompleted: input.wasCompleted ? 1 : 0,
        notes: input.notes ?? null,
      });

      const sessionId = (result as { insertId: number }).insertId;
      if (input.projectId && input.wasCompleted) {
        try {
          await createProjectMemoryEvent({
            userId: ctx.user.id,
            projectId: input.projectId,
            eventType: "focus_session",
            content: `Focus session: "${input.intention}" — ${Math.round(input.durationSeconds / 60)} min${input.notes ? `. Notes: ${input.notes.substring(0, 200)}` : ""}`,
          });
        } catch (_) { /* non-blocking */ }
      }
      return { id: sessionId };
    }),

  // ── List sessions ────────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const since = new Date(Date.now() - (input?.days ?? 30) * 24 * 60 * 60 * 1000);
      return db
        .select()
        .from(focusSessions)
        .where(and(eq(focusSessions.userId, ctx.user.id), gte(focusSessions.startedAt, since)))
        .orderBy(desc(focusSessions.startedAt))
        .limit(100);
    }),

  getWeekSessions: protectedProcedure
    .input(z.object({ weekStart: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const start = new Date(input.weekStart);
      const end = new Date(input.weekStart + 7 * 24 * 60 * 60 * 1000);
      const sessions = await db
        .select()
        .from(focusSessions)
        .where(and(eq(focusSessions.userId, ctx.user.id), gte(focusSessions.startedAt, start)))
        .orderBy(desc(focusSessions.startedAt));
      return sessions.filter((s) => s.startedAt < end);
    }),

  getWeekStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalSeconds: 0, sessionCount: 0, completedCount: 0 };
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sessions = await db
      .select()
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, ctx.user.id), gte(focusSessions.startedAt, weekAgo)));
    return {
      totalSeconds: sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0),
      sessionCount: sessions.length,
      completedCount: sessions.filter((s) => s.wasCompleted === 1).length,
    };
  }),
});
