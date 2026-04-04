import { z } from "zod";
import {
  getDailyPlan,
  getRecentDailyPlans,
  updateDailyPlan,
  getActiveProjects,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!;
}

// Task schema extended with energyLevel for Voltage Mode
const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  projectId: z.number().nullable().optional(),
  energyLevel: z.enum(["high", "low", "any"]).optional(),
  estimatedMinutes: z.number().optional(),
  addedAt: z.number().optional(), // Unix ms, for staleness detection
});

export const dailyPlanRouter = router({
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const date = getTodayDate();
    const plan = await getDailyPlan(ctx.user.id, date);
    return plan ?? null;
  }),

  getByDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await getDailyPlan(ctx.user.id, input.date);
      return plan ?? null;
    }),

  getRecent: protectedProcedure.query(async ({ ctx }) => {
    return getRecentDailyPlans(ctx.user.id, 7);
  }),

  getTomorrowBrief: protectedProcedure.query(async ({ ctx }) => {
    // Get yesterday's plan for the tomorrow brief
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0]!;
    const plan = await getDailyPlan(ctx.user.id, yesterdayStr);
    return plan?.tomorrowBrief ?? null;
  }),

  updateTasks: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
      criticalTasks: z.array(taskSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = input.date ?? getTodayDate();
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };
      await updateDailyPlan(plan.id, ctx.user.id, {
        criticalTasks: JSON.stringify(input.criticalTasks),
      });
      return { success: true };
    }),

  // ── Next Best Step engine ──────────────────────────────────────────────────
  // Returns the single best task to do right now based on:
  // 1. High-energy tasks first in the morning (before noon)
  // 2. Shortest estimated time (quick wins reduce overwhelm)
  // 3. Stalled tasks (added > 2 days ago, not done) get a bump
  getNextBestStep: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
      currentEnergyLevel: z.enum(["high", "low", "any"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const date = input.date ?? getTodayDate();
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan?.criticalTasks) return null;

      let tasks: Array<{
        id: string;
        title: string;
        done: boolean;
        projectId?: number | null;
        energyLevel?: "high" | "low" | "any";
        estimatedMinutes?: number;
        addedAt?: number;
      }> = [];
      try {
        tasks = JSON.parse(plan.criticalTasks);
      } catch {
        return null;
      }

      const pending = tasks.filter(t => !t.done);
      if (pending.length === 0) return null;

      const nowHour = new Date().getHours();
      const isMorning = nowHour < 12;
      const energyFilter = input.currentEnergyLevel ?? (isMorning ? "high" : "low");
      const nowMs = Date.now();
      const staleCutoff = nowMs - 2 * 24 * 60 * 60 * 1000; // 2 days ago

      // Score each task
      const scored = pending.map(task => {
        let score = 0;
        // Energy match bonus
        if (task.energyLevel === energyFilter || task.energyLevel === "any" || !task.energyLevel) {
          score += 10;
        }
        // Shorter tasks score higher (max 5 points for tasks ≤ 5 min)
        if (task.estimatedMinutes) {
          score += Math.max(0, 5 - Math.floor(task.estimatedMinutes / 5));
        }
        // Stale task bump (hasn't been done in 2+ days)
        if (task.addedAt && task.addedAt < staleCutoff) {
          score += 3;
        }
        return { ...task, score };
      });

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (!best) return null;

      return {
        id: best.id,
        title: best.title,
        projectId: best.projectId ?? null,
        energyLevel: best.energyLevel ?? "any",
        estimatedMinutes: best.estimatedMinutes ?? null,
        isStale: best.addedAt ? best.addedAt < staleCutoff : false,
        reason: best.energyLevel === energyFilter
          ? (isMorning ? "High-energy task — good time to tackle this." : "Matches your current energy level.")
          : (best.addedAt && best.addedAt < staleCutoff
            ? "This has been waiting a while. One small move."
            : "Shortest path to momentum."),
      };
    }),
});
