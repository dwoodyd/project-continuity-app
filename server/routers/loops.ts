/**
 * Open Loops router — list, close, snooze, and create loops directly.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { openLoops } from "../../drizzle/schema";
import { eq, and, desc, isNull, or } from "drizzle-orm";

function nowMs() {
  return Date.now();
}

export const loopsRouter = router({
  /** List open loops for the current user. */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["open", "closed", "all"]).default("open"),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [eq(openLoops.userId, ctx.user.id)];
      if (input.status !== "all") {
        conditions.push(eq(openLoops.status, input.status));
      }

      const rows = await db
        .select()
        .from(openLoops)
        .where(and(...conditions))
        .orderBy(desc(openLoops.openedAt))
        .limit(input.limit);

      return { loops: rows };
    }),

  /** Create a loop directly (not from a capture). */
  create: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(openLoops).values({
        userId: ctx.user.id,
        text: input.text,
        status: "open",
        openedAt: nowMs(),
      });

      return { id: (result as any).insertId as number };
    }),

  /** Close a loop. */
  close: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [loop] = await db
        .select()
        .from(openLoops)
        .where(
          and(eq(openLoops.id, input.id), eq(openLoops.userId, ctx.user.id))
        )
        .limit(1);

      if (!loop) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(openLoops)
        .set({ status: "closed", closedAt: nowMs() })
        .where(eq(openLoops.id, input.id));

      return { ok: true };
    }),

  /** Snooze a loop — resurface it at a future timestamp. */
  snooze: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        resurfaceAt: z.number().int().positive(), // UTC ms
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [loop] = await db
        .select()
        .from(openLoops)
        .where(
          and(eq(openLoops.id, input.id), eq(openLoops.userId, ctx.user.id))
        )
        .limit(1);

      if (!loop) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(openLoops)
        .set({ resurfaceAt: input.resurfaceAt })
        .where(eq(openLoops.id, input.id));

      return { ok: true };
    }),

  /** Count of open loops (for badge display). */
  count: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0 };

    const rows = await db
      .select()
      .from(openLoops)
      .where(
        and(eq(openLoops.userId, ctx.user.id), eq(openLoops.status, "open"))
      );

    return { count: rows.length };
  }),
});
