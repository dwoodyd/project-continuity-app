import { z } from "zod";
import {
  getDailyPlan,
  getRecentDailyPlans,
  updateDailyPlan,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!;
}

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
      criticalTasks: z.array(z.object({
        id: z.string(),
        title: z.string(),
        done: z.boolean(),
        projectId: z.number().nullable().optional(),
      })),
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
});
