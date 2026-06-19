import { z } from "zod";
import {
  getDailyPlan,
  getRecentDailyPlans,
  updateDailyPlan,
  upsertDailyPlan,
  getActiveProjects,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { resolveDate, subtractDay } from "../utils/dateUtils";

// Tomorrow task schema (lighter — no done flag, no carryover tracking)
const tomorrowTaskSchema = z.object({
  id: z.string().max(100),
  title: z.string().max(500),
  projectId: z.number().nullable().optional(),
  energyLevel: z.enum(["high", "low", "any"]).optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  notes: z.string().max(500).optional(),
});

// Task schema extended with energyLevel for Voltage Mode
const taskSchema = z.object({
  id: z.string().max(100),
  title: z.string().max(200),
  done: z.boolean(),
  projectId: z.number().nullable().optional(),
  energyLevel: z.enum(["high", "low", "any"]).optional(),
  estimatedMinutes: z.number().optional(),
  addedAt: z.number().optional(), // Unix ms, for staleness detection
});

export const dailyPlanRouter = router({
  getToday: protectedProcedure
    .input(z.object({ localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional() }).optional())
    .query(async ({ ctx, input }) => {
      const date = resolveDate(input?.localDate);
      const plan = await getDailyPlan(ctx.user.id, date);
      return plan ?? null;
    }),

  getByDate: protectedProcedure
    .input(z.object({ date: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format") }))
    .query(async ({ ctx, input }) => {
      const plan = await getDailyPlan(ctx.user.id, input.date);
      return plan ?? null;
    }),

  getRecent: protectedProcedure.query(async ({ ctx }) => {
    return getRecentDailyPlans(ctx.user.id, 7);
  }),

  // Accepts localDate so yesterday is computed in the user's timezone, not UTC.
  getTomorrowBrief: protectedProcedure
    .input(z.object({ localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional() }).optional())
    .query(async ({ ctx, input }) => {
      const today = resolveDate(input?.localDate);
      const yesterdayStr = subtractDay(today, 1);
      const plan = await getDailyPlan(ctx.user.id, yesterdayStr);
      return plan?.tomorrowBrief ?? null;
    }),

  updateTasks: protectedProcedure
    .input(z.object({
      date: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
      criticalTasks: z.array(taskSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.date);
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };
      await updateDailyPlan(plan.id, ctx.user.id, {
        criticalTasks: JSON.stringify(input.criticalTasks),
      });
      return { success: true };
    }),

  // ── Tomorrow's Plan ────────────────────────────────────────────────────────
  // Saves the list of planned tasks for tomorrow (stored on today's daily plan)
  saveTomorrowPlan: protectedProcedure
    .input(z.object({
      tasks: z.array(tomorrowTaskSchema).max(20),
      // Client passes its local YYYY-MM-DD so the plan is stored under the correct local date
      localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.localDate);
      // Upsert: create a minimal plan if one doesn't exist yet (user may have skipped morning check-in)
      const planId = await upsertDailyPlan({
        userId: ctx.user.id,
        date,
        tomorrowTasks: JSON.stringify(input.tasks),
      });
      // If plan already existed, update just the tomorrowTasks field
      const plan = await getDailyPlan(ctx.user.id, date);
      if (plan && plan.id !== planId) {
        await updateDailyPlan(plan.id, ctx.user.id, { tomorrowTasks: JSON.stringify(input.tasks) });
      }
      return { success: true };
    }),

  // Returns tomorrow's planned tasks from yesterday's daily plan.
  // Accepts localDate (today's local YYYY-MM-DD) so we can compute yesterday correctly.
  getTomorrowPlan: protectedProcedure
    .input(z.object({ localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const today = resolveDate(input?.localDate);
      const yesterdayStr = subtractDay(today, 1);
      const plan = await getDailyPlan(ctx.user.id, yesterdayStr);
      if (!plan?.tomorrowTasks) return [];
      try {
        return JSON.parse(plan.tomorrowTasks) as Array<{
          id: string;
          title: string;
          projectId?: number | null;
          energyLevel?: string;
          estimatedMinutes?: number;
          notes?: string;
        }>;
      } catch {
        return [];
      }
    }),

  // ── Add a single task to tomorrow's plan ────────────────────────────────────
  // Called when the user adds a task after the day is closed (or any time).
  // Appends to today's tomorrowTasks JSON array so it shows in tomorrow's handoff card.
  addTomorrowTask: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(300),
      localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.localDate);
      // Upsert plan so it always exists
      let plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) {
        await upsertDailyPlan({ userId: ctx.user.id, date, tomorrowTasks: "[]" });
        plan = await getDailyPlan(ctx.user.id, date);
      }
      if (!plan) return { success: false };

      const existing: Array<{ id: string; title: string; energyLevel?: string; estimatedMinutes?: number; notes?: string }> =
        plan.tomorrowTasks ? JSON.parse(plan.tomorrowTasks) : [];
      const newTask = {
        id: `user-tmrw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: input.title.trim(),
      };
      const updated = [...existing, newTask];
      await updateDailyPlan(plan.id, ctx.user.id, { tomorrowTasks: JSON.stringify(updated) });
      return { success: true, task: newTask };
    }),

  // ── Edit a task in tomorrow's plan ──────────────────────────────────────────────────
  // Updates the title of a task in today's tomorrowTasks JSON array by ID.
  editTomorrowTask: protectedProcedure
    .input(z.object({
      taskId: z.string().max(100),
      title: z.string().min(1).max(300),
      localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.localDate);
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };
      const tasks: Array<{ id: string; title: string; [key: string]: unknown }> =
        plan.tomorrowTasks ? JSON.parse(plan.tomorrowTasks) : [];
      const updated = tasks.map((t) =>
        t.id === input.taskId ? { ...t, title: input.title.trim() } : t
      );
      await updateDailyPlan(plan.id, ctx.user.id, { tomorrowTasks: JSON.stringify(updated) });
      return { success: true };
    }),

  // ── Next Best Step engine ──────────────────────────────────────────────────
  // Returns the single best task to do right now based on:
  // 1. High-energy tasks first in the morning (before noon)
  // 2. Shortest estimated time (quick wins reduce overwhelm)
  // 3. Stalled tasks (added > 2 days ago, not done) get a bump
  getNextBestStep: protectedProcedure
    .input(z.object({
      date: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
      currentEnergyLevel: z.enum(["high", "low", "any"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const date = resolveDate(input.date);
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
