import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { assertProjectOwnedBy, createProjectMemoryEvent, getDb } from "../db";
import { focusSessions } from "../../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export const focusSessionsRouter = router({
  // Save a completed focus session
  save: protectedProcedure
    .input(z.object({
      intention: z.string().min(1).max(500, "Intention must be under 500 characters"),
      projectId: z.number().optional(),
      startedAt: z.number(), // Unix ms
      durationSeconds: z.number().min(0),
      wasCompleted: z.boolean(),
      notes: z.string().max(2000, "Notes must be under 2,000 characters").optional(),
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

      // Record project memory event for completed sessions with a project
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

  // List sessions for the current user (last 30 days by default)
  list: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const daysBack = input?.days ?? 30;
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const sessions = await db
        .select()
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, ctx.user.id),
            gte(focusSessions.startedAt, since)
          )
        )
        .orderBy(desc(focusSessions.startedAt))
        .limit(100);

      return sessions;
    }),

  // Get sessions for a specific week (for Weekly Review)
  getWeekSessions: protectedProcedure
    .input(z.object({
      weekStart: z.number(), // Unix ms — start of week
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const start = new Date(input.weekStart);
      const end = new Date(input.weekStart + 7 * 24 * 60 * 60 * 1000);

      const sessions = await db
        .select()
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, ctx.user.id),
            gte(focusSessions.startedAt, start)
          )
        )
        .orderBy(desc(focusSessions.startedAt));

      return sessions.filter((s) => s.startedAt < end);
    }),

  // Get total focus time this week
  getWeekStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalSeconds: 0, sessionCount: 0, completedCount: 0 };

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sessions = await db
      .select()
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, ctx.user.id),
          gte(focusSessions.startedAt, weekAgo)
        )
      );

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
    const completedCount = sessions.filter((s) => s.wasCompleted === 1).length;

    return {
      totalSeconds,
      sessionCount: sessions.length,
      completedCount,
    };
  }),
});
