import { z } from "zod";
import { desc, eq, gte, and } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  continuityEvents,
  threadStrength,
  userMilestones,
  users,
} from "../../drizzle/schema";

// ─── Thread Strength scoring ──────────────────────────────────────────────────
const THREAD_STATES = ["Gathering", "Holding", "Strengthening", "Steady", "Deepening"] as const;
const EVENT_POINTS: Record<string, number> = {
  return_24h: 3,
  return_3d: 5,
  return_7d: 8,
  rhythm_morning: 2,
  rhythm_midday: 2,
  rhythm_evening: 2,
  idea_processed: 3,
  task_completed: 1,
  project_step: 3,
  weekly_review: 6,
  weekly_compass: 6,
  reentry_flow: 4,
};

function scoreToState(score: number): string {
  if (score < 10) return "Gathering";
  if (score < 25) return "Holding";
  if (score < 50) return "Strengthening";
  if (score < 90) return "Steady";
  return "Deepening";
}

// ─── Milestone definitions ────────────────────────────────────────────────────
const MILESTONE_COPY: Record<string, { title: string; body: string }> = {
  first_rhythm:       { title: "Your first full rhythm.", body: "Morning, midday, evening — you held the thread all day." },
  first_10_ideas:     { title: "Ten ideas processed.", body: "You cleared space. That's not small." },
  first_weekly_review:{ title: "First weekly review.", body: "You stepped back and looked at the whole. That takes intention." },
  first_return:       { title: "You came back.", body: "After time away, you returned. That's the whole practice." },
  thirty_days_evidence:{ title: "Thirty days of evidence.", body: "A month of showing up. The thread is real." },
  first_reentry_flow: { title: "You used the re-entry path.", body: "You found your way back without forcing it." },
  first_task_complete:{ title: "First task completed.", body: "One thing done. That's how it starts." },
};

async function checkAndAwardMilestones(userId: number, eventType: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const existing = await db.select({ key: userMilestones.milestoneKey })
    .from(userMilestones).where(eq(userMilestones.userId, userId));
  const earned = new Set(existing.map(r => r.key));
  const newMilestones: string[] = [];

  const award = async (key: string) => {
    if (!earned.has(key)) {
      await db.insert(userMilestones).values({ userId, milestoneKey: key });
      newMilestones.push(key);
    }
  };

  if (eventType === "rhythm_evening") {
    // Check if all three rhythms completed today
    const today = new Date().toISOString().slice(0, 10);
    const todayEvents = await db.select({ eventType: continuityEvents.eventType })
      .from(continuityEvents)
      .where(and(
        eq(continuityEvents.userId, userId),
        gte(continuityEvents.createdAt, new Date(today + "T00:00:00Z"))
      ));
    const types = new Set(todayEvents.map(e => e.eventType));
    if (types.has("rhythm_morning") && types.has("rhythm_midday")) {
      await award("first_rhythm");
    }
  }
  if (eventType === "weekly_review" || eventType === "weekly_compass") await award("first_weekly_review");
  if (eventType.startsWith("return_")) await award("first_return");
  if (eventType === "reentry_flow") await award("first_reentry_flow");
  if (eventType === "task_completed") await award("first_task_complete");

  if (eventType === "idea_processed") {
    const count = await db.select({ id: continuityEvents.id })
      .from(continuityEvents)
      .where(and(eq(continuityEvents.userId, userId), eq(continuityEvents.eventType, "idea_processed")));
    if (count.length >= 10) await award("first_10_ideas");
  }

  // 30 days evidence: check distinct days with any event
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentEvents = await db.select({ createdAt: continuityEvents.createdAt })
    .from(continuityEvents)
    .where(and(eq(continuityEvents.userId, userId), gte(continuityEvents.createdAt, thirtyDaysAgo)));
  const distinctDays = new Set(recentEvents.map(e => e.createdAt.toISOString().slice(0, 10)));
  if (distinctDays.size >= 30) await award("thirty_days_evidence");

  return newMilestones;
}

async function updateThreadStrength(userId: number, eventType: string): Promise<{ score: number; state: string }> {
  const db = await getDb();
  if (!db) return { score: 0, state: "Gathering" };

  const points = EVENT_POINTS[eventType] ?? 1;
  const existing = await db.select().from(threadStrength).where(eq(threadStrength.userId, userId)).limit(1);

  if (existing.length === 0) {
    const newScore = points;
    const newState = scoreToState(newScore);
    await db.insert(threadStrength).values({ userId, score: newScore, state: newState, lastUpdatedAt: new Date() });
    return { score: newScore, state: newState };
  }

  const current = existing[0];
  // Slow decay: if last update > 7 days ago, reduce score by 10% before adding
  const daysSinceUpdate = (Date.now() - current.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
  let baseScore = current.score;
  if (daysSinceUpdate > 7) {
    baseScore = Math.max(0, Math.floor(baseScore * 0.85));
  }
  const newScore = Math.min(150, baseScore + points);
  const newState = scoreToState(newScore);
  await db.update(threadStrength)
    .set({ score: newScore, state: newState, lastUpdatedAt: new Date() })
    .where(eq(threadStrength.userId, userId));
  return { score: newScore, state: newState };
}

export const gamificationRouter = router({
  // Record a continuity event and update thread strength + milestones
  recordEvent: protectedProcedure
    .input(z.object({
      eventType: z.string(),
      label: z.string().optional(),
      metadata: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { threadStrength: null, newMilestones: [] };

      await db.insert(continuityEvents).values({
        userId: ctx.user.id,
        eventType: input.eventType,
        label: input.label ?? null,
        metadata: input.metadata ?? null,
      });

      const [ts, newMilestones] = await Promise.all([
        updateThreadStrength(ctx.user.id, input.eventType),
        checkAndAwardMilestones(ctx.user.id, input.eventType),
      ]);

      return {
        threadStrength: ts,
        newMilestones: newMilestones.map(key => ({
          key,
          ...MILESTONE_COPY[key] ?? { title: key, body: "" },
        })),
      };
    }),

  // Get current state for Today view
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { threadStrength: null, returnMarker: null, recentEvents: [], pendingMilestones: [] };

    const userId = ctx.user.id;

    // Thread strength
    const ts = await db.select().from(threadStrength).where(eq(threadStrength.userId, userId)).limit(1);

    // Return marker: check last event time vs now
    const lastEvent = await db.select({ createdAt: continuityEvents.createdAt })
      .from(continuityEvents)
      .where(eq(continuityEvents.userId, userId))
      .orderBy(desc(continuityEvents.createdAt))
      .limit(1);

    let returnMarker: { window: "24h" | "3d" | "7d"; message: string } | null = null;
    if (lastEvent.length > 0) {
      const hoursSince = (Date.now() - lastEvent[0].createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince >= 168) {
        returnMarker = { window: "7d", message: pickReturn7d() };
      } else if (hoursSince >= 72) {
        returnMarker = { window: "3d", message: pickReturn3d() };
      } else if (hoursSince >= 24) {
        returnMarker = { window: "24h", message: pickReturn24h() };
      }
    } else {
      // First ever session
      returnMarker = { window: "24h", message: "Welcome. This is where your thread begins." };
    }

    // Recent events for Evidence of Movement Feed (last 20, last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEvents = await db.select()
      .from(continuityEvents)
      .where(and(eq(continuityEvents.userId, userId), gte(continuityEvents.createdAt, sevenDaysAgo)))
      .orderBy(desc(continuityEvents.createdAt))
      .limit(20);

    // Pending (undismissed) milestones
    const pendingMilestones = await db.select()
      .from(userMilestones)
      .where(and(eq(userMilestones.userId, userId), eq(userMilestones.dismissed, false)))
      .orderBy(desc(userMilestones.achievedAt));

    // Today's rhythm events
    const today = new Date().toISOString().slice(0, 10);
    const todayEvents = await db.select({ eventType: continuityEvents.eventType })
      .from(continuityEvents)
      .where(and(
        eq(continuityEvents.userId, userId),
        gte(continuityEvents.createdAt, new Date(today + "T00:00:00Z"))
      ));
    const todayTypes = todayEvents.map(e => e.eventType);

    return {
      threadStrength: ts[0] ?? null,
      returnMarker,
      recentEvents,
      pendingMilestones: pendingMilestones.map(m => ({
        ...m,
        ...MILESTONE_COPY[m.milestoneKey] ?? { title: m.milestoneKey, body: "" },
      })),
      rhythmToday: {
        morning: todayTypes.includes("rhythm_morning"),
        midday: todayTypes.includes("rhythm_midday"),
        evening: todayTypes.includes("rhythm_evening"),
      },
    };
  }),

  // Dismiss a milestone card
  dismissMilestone: protectedProcedure
    .input(z.object({ milestoneId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      await db.update(userMilestones)
        .set({ dismissed: true })
        .where(and(eq(userMilestones.id, input.milestoneId), eq(userMilestones.userId, ctx.user.id)));
    }),

  // Get full continuity archive (last 90 days of events)
  getArchive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return db.select()
      .from(continuityEvents)
      .where(and(eq(continuityEvents.userId, ctx.user.id), gte(continuityEvents.createdAt, ninetyDaysAgo)))
      .orderBy(desc(continuityEvents.createdAt))
      .limit(500);
  }),
});

// ─── Return marker copy pools ─────────────────────────────────────────────────
function pickReturn24h() {
  const pool = [
    "You returned. That's the whole practice.",
    "Back again. The thread holds.",
    "You showed up. That's enough.",
    "Here you are. Let's continue.",
  ];
  return pool[Math.floor(Date.now() / 1000) % pool.length];
}
function pickReturn3d() {
  const pool = [
    "Three days away. You're back. That matters.",
    "The thread was waiting. You found it.",
    "You stepped away and came back. That's resilience.",
    "Welcome back. Nothing was lost.",
  ];
  return pool[Math.floor(Date.now() / 1000) % pool.length];
}
function pickReturn7d() {
  const pool = [
    "A week away. You returned anyway. That's not small.",
    "You came back. The work is still here.",
    "Seven days. The thread is still yours.",
    "Welcome back. Drift happens. Return is what matters.",
  ];
  return pool[Math.floor(Date.now() / 1000) % pool.length];
}
