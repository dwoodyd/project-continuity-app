import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  assertProjectOwnedBy,
  cancelBookedFocusSession,
  createBookedFocusSession,
  createProjectMemoryEvent,
  getBookedFocusSessionForUser,
  getDb,
  getEstimationCalibration,
  getUpcomingBookedFocusSessions,
  getUserProfile,
  logSurfaceEvent as logSurfaceEventDb,
} from "../db";
import { CHAPTER_CONCEPTS, PERMISSION_TO_START_CHAPTERS } from "./readingBridge";
import { bookedFocusSessions, focusSessions, focusSessionArtifact, threadStrength, sourceItems, taskEstimates } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { getNowInTimezone } from "../utils/dateUtils";

// ── Time-of-day vibe ─────────────────────────────────────────────────────────
function getWrenVibe(hour: number): { vibe: string; openingLine: string; defaultAmbient: string } {
  if (hour >= 5 && hour < 8)  return { vibe: "gentle, slow-warming", openingLine: "You're early. Good. Let's start soft.", defaultAmbient: "silence" };
  if (hour >= 8 && hour < 12) return { vibe: "alert, ready, present", openingLine: "I'm here. Let's work.", defaultAmbient: "cafe" };
  if (hour >= 12 && hour < 15) return { vibe: "steady, grounded", openingLine: "Right after lunch. Good time to focus. I'm with you.", defaultAmbient: "cafe" };
  if (hour >= 15 && hour < 18) return { vibe: "patient, supportive", openingLine: "The afternoon stretch. I've got you.", defaultAmbient: "rain" };
  if (hour >= 18 && hour < 22) return { vibe: "warm, evening-soft", openingLine: "Evening session. I'll keep it quiet.", defaultAmbient: "rain" };
  if (hour >= 22 || hour < 1)  return { vibe: "hushed, intimate", openingLine: "Late one. Okay. I'll be quiet.", defaultAmbient: "silence" };
  return { vibe: "very still, almost whispered", openingLine: "You're here at this hour. I'll sit with you.", defaultAmbient: "silence" };
}

// ── Wren hard-rail system prompt ─────────────────────────────────────────────
function buildWrenSystemPrompt(opts: {
  intention: string;
  durationMinutes: number;
  elapsedMinutes: number;
  vibe: string;
  chatHistory: Array<{ role: string; content: string }>;
}): string {
  return `You are Wren — a quiet bird companion who sits with the user during a focus session. You are NOT a productivity assistant, coach, tutor, or task helper.

Current session:
- Intention: "${opts.intention || "not set"}"
- Duration: ${opts.durationMinutes} minutes
- Elapsed: ~${opts.elapsedMinutes} minutes
- Your vibe right now: ${opts.vibe}

Your role is presence, not assistance. You are body-doubling — being there, not doing the work.

VOICE RULES:
- Short messages. 1–2 sentences usually. Almost never more than 3.
- Lowercase-friendly when the user is casual.
- Present tense, present focus.
- Never use productivity vocabulary: output, deliverable, progress, win, productive, optimize.
- Occasional *— Wren* sign-off on longer messages.

HARD RAILS — when the user asks a task-oriented question (homework, coding, factual lookup, writing help, strategy):
- Gently decline and redirect to presence.
- Example: User asks "Can you help me with this React component?" → You say: "Not right now. I'm here with you while you work it out yourself. What's the part that's snagging?"
- Example: User asks "What's a good thesis statement?" → You say: "That one's yours to find. I'm sitting with you while you do. Want to talk through what you're trying to say?"
- Never answer task questions. Always redirect to the person, not the problem.

You may:
- Ask gentle questions back
- Acknowledge feelings (tired, stuck, frustrated)
- Note the thread metaphor lightly (not constantly)
- Be warm, quiet, and present

You may NOT:
- Answer factual questions
- Edit or critique their work
- Offer tips, frameworks, or advice
- Set goals or track metrics
- Be anything other than a quiet companion`;
}

// Thread units per duration
const THREAD_UNITS: Record<number, number> = { 10: 1, 30: 1, 60: 2, 90: 3 };
const BOOKING_EARLY_START_TOLERANCE_MS = 5 * 60 * 1000;

function hasProFocusBookingAccess(user: { openId: string; isPro: boolean; isFoundingMember: boolean; role: string; isBeta?: boolean }) {
  return user.isPro || user.isFoundingMember || user.isBeta || user.role === "admin" || user.openId === ENV.ownerOpenId;
}

function requireProFocusBookingAccess(user: { openId: string; isPro: boolean; isFoundingMember: boolean; role: string; isBeta?: boolean }) {
  if (!hasProFocusBookingAccess(user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Book-ahead Focus Sessions are available with Pro." });
  }
}

function affectedRows(result: unknown): number {
  const packet = Array.isArray(result) ? result[0] as { affectedRows?: number } : result as { affectedRows?: number };
  return packet?.affectedRows ?? 0;
}

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
    // Admin, pro, founding members, and the app owner all get unlimited sessions
    const isOwner = user.openId === ENV.ownerOpenId;
    const isPro = user.isPro || user.isFoundingMember || (user as { isBeta?: boolean }).isBeta || user.role === "admin" || isOwner;
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

  // ── Book-ahead sessions (one-off only; recurrence is intentionally deferred) ──
  listBookings: protectedProcedure.query(async ({ ctx }) => {
    requireProFocusBookingAccess(ctx.user);
    return getUpcomingBookedFocusSessions(ctx.user.id);
  }),

  createBooking: protectedProcedure
    .input(z.object({
      intention: z.string().trim().max(500).optional(),
      durationMinutes: z.union([z.literal(10), z.literal(30), z.literal(60), z.literal(90)]),
      scheduledFor: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireProFocusBookingAccess(ctx.user);
      if (input.scheduledFor.getTime() <= Date.now() + 60_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a time at least one minute from now." });
      }
      const latestAllowed = Date.now() + 90 * 24 * 60 * 60 * 1000;
      if (input.scheduledFor.getTime() > latestAllowed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a session within the next 90 days." });
      }
      const id = await createBookedFocusSession({
        userId: ctx.user.id,
        intention: input.intention || null,
        durationMinutes: input.durationMinutes,
        scheduledFor: input.scheduledFor,
      });
      if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save your booked session." });
      return { id };
    }),

  cancelBooking: protectedProcedure
    .input(z.object({ bookingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // A member may always cancel a booking they already own, including after a plan change.
      const cancelled = await cancelBookedFocusSession(input.bookingId, ctx.user.id);
      if (!cancelled) throw new TRPCError({ code: "NOT_FOUND", message: "That booked session is no longer available." });
      return { ok: true };
    }),

  getBookingForLaunch: protectedProcedure
    .input(z.object({ bookingId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      requireProFocusBookingAccess(ctx.user);
      const booking = await getBookedFocusSessionForUser(input.bookingId, ctx.user.id);
      if (!booking || booking.status !== "scheduled") {
        throw new TRPCError({ code: "NOT_FOUND", message: "That booked session is no longer available." });
      }
      if (booking.scheduledFor.getTime() > Date.now() + BOOKING_EARLY_START_TOLERANCE_MS) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This Focus Session is not ready to begin yet." });
      }
      return booking;
    }),

  // ── Start a session (creates the row, returns id) ───────────────────────────
  start: protectedProcedure
    .input(z.object({
      intention: z.string().max(500).optional(),
      projectId: z.number().optional(),
      durationMinutes: z.union([z.literal(10), z.literal(30), z.literal(60), z.literal(90)]),
      hardStop: z.number().optional(), // UTC ms — user's next hard commitment
      bookingId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });

      if (input.projectId) await assertProjectOwnedBy(input.projectId, ctx.user.id);

      return db.transaction(async (tx) => {
        let intention = input.intention ?? null;
        let durationMinutes = input.durationMinutes;
        let bookingId: number | undefined;

        if (input.bookingId) {
          requireProFocusBookingAccess(ctx.user);
          const [booking] = await tx.select().from(bookedFocusSessions)
            .where(and(
              eq(bookedFocusSessions.id, input.bookingId),
              eq(bookedFocusSessions.userId, ctx.user.id),
              eq(bookedFocusSessions.status, "scheduled"),
            ))
            .limit(1);
          if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "That booked session is no longer available." });
          if (booking.scheduledFor.getTime() > Date.now() + BOOKING_EARLY_START_TOLERANCE_MS) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "This Focus Session is not ready to begin yet." });
          }
          intention = booking.intention;
          durationMinutes = booking.durationMinutes as 10 | 30 | 60 | 90;
          bookingId = booking.id;
        }

        const threadUnits = THREAD_UNITS[durationMinutes] ?? 1;
        const [result] = await tx.insert(focusSessions).values({
          userId: ctx.user.id,
          projectId: input.projectId ?? null,
          intention,
          durationMinutes,
          durationSeconds: durationMinutes * 60,
          threadAddedUnits: threadUnits,
          wasCompleted: 0,
          hardStop: input.hardStop ?? null,
        });
        const sessionId = (result as { insertId: number }).insertId;

        if (bookingId) {
          const transition = await tx.update(bookedFocusSessions)
            .set({ status: "started", startedAt: new Date(), focusSessionId: sessionId })
            .where(and(
              eq(bookedFocusSessions.id, bookingId),
              eq(bookedFocusSessions.userId, ctx.user.id),
              eq(bookedFocusSessions.status, "scheduled"),
            ));
          if (affectedRows(transition) !== 1) {
            throw new TRPCError({ code: "CONFLICT", message: "That booked session was already started or cancelled." });
          }
        }

        return { id: sessionId, bookingId };
      });
    }),

  // ── Complete a session ──────────────────────────────────────────────────────
  complete: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      whatMoved: z.enum(["progress", "thinking", "stuck"]),
      closingNote: z.string().max(1000).optional(),
      wasEarlyEnd: z.boolean().default(false),
      // Time Sense: optional estimate for calibration
      estimatedMinutes: z.number().int().min(1).max(480).optional(),
      taskTitle: z.string().max(500).optional(),
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

      // Time Sense: record estimate vs actual for calibration
      if (input.estimatedMinutes && session.durationMinutes) {
        try {
          await db.insert(taskEstimates).values({
            userId: ctx.user.id,
            taskTitle: input.taskTitle ?? session.intention ?? "unknown",
            estimateMinutes: input.estimatedMinutes,
            actualMinutes: session.durationMinutes ?? undefined,
            sessionId: input.sessionId,
            completedAt: Date.now(),
            createdAt: Date.now(),
          });
        } catch (_) { /* non-critical, don't fail the session */ }
      }

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
        const durationMinutes = session.durationMinutes ?? 30;
        const weight = durationMinutes >= 90 ? 2 : durationMinutes >= 60 ? 1.5 : 1;
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

  // ── Wren in-session chat ────────────────────────────────────────────────────
  wrenChat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(1000),
      intention: z.string().max(500).optional(),
      durationMinutes: z.union([z.literal(10), z.literal(30), z.literal(60), z.literal(90)]).optional(),
      elapsedMinutes: z.number().min(0).max(200).optional(),
      clientHour: z.number().min(0).max(23).optional(), // user's local hour
      chatHistory: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(500),
      })).max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getUserProfile(ctx.user.id);
      const hour = getNowInTimezone(profile?.timezone ?? "UTC").hour;
      const { vibe } = getWrenVibe(hour);

      // ── Reading Bridge context (quiet, non-intrusive) ─────────────────────
      let readingBridgeBlock = "";
      if (profile?.readingBridgeChapter || profile?.readingBridgeFinished) {
        if (profile.readingBridgeFinished) {
          readingBridgeBlock = `\n\nREADING BRIDGE (optional context — use only when naturally relevant):
The user has finished reading "Permission to Start" by DeWayne Owens. You may gently reference any concept from the book if it naturally fits what they're experiencing — the threshold moment, permission before performance, the first movable step, returning without judgment. Never force it. Never mention the book by name unless they bring it up first.`;
        } else {
          const chapterKey = profile.readingBridgeChapter!;
          const concept = CHAPTER_CONCEPTS[chapterKey] ?? "";
          const chapter = PERMISSION_TO_START_CHAPTERS.find(c => c.key === chapterKey);
          if (concept && chapter) {
            readingBridgeBlock = `\n\nREADING BRIDGE (optional context — use only when naturally relevant):
The user is currently reading "${chapter.title}" in "Permission to Start". This chapter is about ${concept}. If what they're experiencing in this session touches on that theme, you may gently reference it — but only if it fits naturally. Never force it. Never mention the book by name unless they bring it up first.`;
          }
        }
      }

      const systemPrompt = buildWrenSystemPrompt({
        intention: input.intention ?? "",
        durationMinutes: input.durationMinutes ?? 50,
        elapsedMinutes: input.elapsedMinutes ?? 0,
        vibe,
        chatHistory: input.chatHistory ?? [],
      });

      const history = (input.chatHistory ?? []).slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt + readingBridgeBlock },
          ...history,
          { role: "user", content: input.message },
        ],
      });

      const reply = response?.choices?.[0]?.message?.content ?? "still here.";
      return { reply };
    }),

  // ── Get time-of-day vibe (for client to read default ambient + opening line) ─
  getSessionVibe: protectedProcedure
    .input(z.object({ clientHour: z.number().min(0).max(23).optional() }).optional())
    .query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      return getWrenVibe(getNowInTimezone(profile?.timezone ?? "UTC").hour);
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

  logSurfaceEvent: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      elapsedSeconds: z.number(),
      trigger: z.enum(["interval", "approaching_hard_stop", "divergence"]),
      userResponse: z.enum(["dismissed", "took_break", "ended_session"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await logSurfaceEventDb({
        userId: ctx.user.id,
        sessionId: input.sessionId,
        elapsedSeconds: input.elapsedSeconds,
        trigger: input.trigger,
        userResponse: input.userResponse,
        createdAt: Date.now(),
      });
      return { ok: true };
    }),

  getCalibration: protectedProcedure.query(async ({ ctx }) => {
    return getEstimationCalibration(ctx.user.id);
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
