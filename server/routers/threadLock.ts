import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createThreadLock,
  getActiveThreadLock,
  getThreadLockHistory,
  recallThreadLock,
  dismissThreadLock,
  deleteThreadLock,
} from "../db";

export const threadLockRouter = router({
  /** Capture a new Thread Lock — saves mid-task context for later recall. */
  capture: protectedProcedure
    .input(z.object({
      whatDoing: z.string().min(1).max(1000),
      whatNext: z.string().min(1).max(1000),
      projectId: z.number().optional(),
      clipboardSnippet: z.string().max(2000).optional(),
      nextCalendarEvent: z.string().max(500).optional(),
      pagePath: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lock = await createThreadLock({
        userId: ctx.user.id,
        projectId: input.projectId ?? null,
        whatDoing: input.whatDoing,
        whatNext: input.whatNext,
        clipboardSnippet: input.clipboardSnippet ?? null,
        nextCalendarEvent: input.nextCalendarEvent ?? null,
        pagePath: input.pagePath ?? null,
        recalledAt: null,
        dismissedAt: null,
        createdAt: Date.now(),
      });
      return { id: lock.id };
    }),

  /** Returns the most recent active lock (created within 4 h, not recalled/dismissed). */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return getActiveThreadLock(ctx.user.id);
  }),

  /** Returns the full history of thread locks for the user, newest first. */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return getThreadLockHistory(ctx.user.id, input.limit);
    }),

  /** Mark a lock as recalled — the user has returned to their thread. */
  recall: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await recallThreadLock(input.id, ctx.user.id);
      return { ok: true };
    }),

  /** Dismiss a lock without recalling — the user no longer needs it. */
  dismiss: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await dismissThreadLock(input.id, ctx.user.id);
      return { ok: true };
    }),

  /** Hard-delete a single lock from history. */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteThreadLock(input.id, ctx.user.id);
      return { ok: true };
    }),
});
