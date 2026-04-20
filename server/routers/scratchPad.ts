import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getScratchNotes,
  createScratchNote,
  updateScratchNote,
  deleteScratchNote,
} from "../db";

export const scratchPadRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getScratchNotes(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({ content: z.string().max(10000).default("") }))
    .mutation(async ({ ctx, input }) => {
      const id = await createScratchNote({ userId: ctx.user.id, content: input.content });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), content: z.string().max(10000) }))
    .mutation(async ({ ctx, input }) => {
      await updateScratchNote(input.id, ctx.user.id, input.content);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteScratchNote(input.id, ctx.user.id);
      return { success: true };
    }),
});
