import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { betaCodes, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const betaRouter = {
  redeemCode: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(32).toUpperCase() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const rows = await db!.select().from(betaCodes).where(eq(betaCodes.code, input.code)).limit(1);
      const codeRow = rows[0];

      if (!codeRow) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid beta code." });
      if (codeRow.usedBy) throw new TRPCError({ code: "CONFLICT", message: "This code has already been used." });

      const betaExpiresAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

      await db!.transaction(async (tx) => {
        await tx.update(betaCodes).set({ usedBy: ctx.user.id, usedAt: new Date() }).where(eq(betaCodes.id, codeRow.id));
        await tx.update(users).set({ isBeta: true, betaExpiresAt, isPro: true, proSince: new Date() }).where(eq(users.id, ctx.user.id));
      });

      return { success: true, expiresAt: betaExpiresAt };
    }),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const u = ctx.user;
    const now = new Date();
    const isActiveBeta = !!(u.isBeta && u.betaExpiresAt && u.betaExpiresAt > now);
    return {
      isBeta: u.isBeta ?? false,
      betaExpiresAt: u.betaExpiresAt ?? null,
      isActiveBeta,
      daysRemaining: isActiveBeta
        ? Math.ceil((u.betaExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    };
  }),

  listCodes: adminProcedure.query(async () => {
    const db = await getDb();
    return db!.select().from(betaCodes).orderBy(betaCodes.id);
  }),

  generateCodes: adminProcedure
    .input(z.object({ count: z.number().min(1).max(100), prefix: z.string().default("THREAD-BETA") }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const allCodes = await db!.select({ id: betaCodes.id }).from(betaCodes).orderBy(betaCodes.id);
      const start = (allCodes[allCodes.length - 1]?.id ?? 0) + 1;
      const newCodes = Array.from({ length: input.count }, (_, i) =>
        `${input.prefix}-${String(start + i).padStart(3, "0")}`
      );
      for (const code of newCodes) {
        await db!.insert(betaCodes).ignore().values({ code });
      }
      return { generated: newCodes.length, codes: newCodes };
    }),
};
