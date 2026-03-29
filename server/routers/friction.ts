import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { frictionLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const frictionRouter = router({
  submit: protectedProcedure
    .input(z.object({
      note: z.string().min(1).max(2000),
      pageContext: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.insert(frictionLogs).values({
        userId: ctx.user.id,
        note: input.note,
        pageContext: input.pageContext ?? null,
      });
      return { success: true };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(frictionLogs)
      .where(eq(frictionLogs.userId, ctx.user.id))
      .orderBy(desc(frictionLogs.createdAt))
      .limit(20);
  }),
});
