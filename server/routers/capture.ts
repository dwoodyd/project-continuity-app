/**
 * Capture router — voice and text capture, Sort, reclassify, route.
 *
 * Key invariant: feeling atoms are NEVER written to capture_atoms.
 * They are returned in capture.sort response only, then discarded.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { getDb } from "../db";
import {
  captures,
  captureAtoms,
  sortCorrections,
  openLoops,
  focusSessions,
} from "../../drizzle/schema";
import { eq, and, isNull, desc, sql, gte } from "drizzle-orm";
import { renderSortPrompt, parseSortResponse } from "../captureSort";

function nowMs() {
  return Date.now();
}

async function getActiveFocusSessionId(userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ id: focusSessions.id })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, userId), isNull(focusSessions.completedAt)))
    .orderBy(desc(focusSessions.startedAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function getRecentCorrections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sortCorrections)
    .where(eq(sortCorrections.userId, userId))
    .orderBy(desc(sortCorrections.createdAt))
    .limit(20);
}

export const captureRouter = router({
  /** Create a new capture (voice or text). */
  create: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["voice", "text"]),
        durationS: z.number().int().positive().optional(),
        transcript: z.string().min(1).max(50000),
        audioKey: z.string().optional(),
        intent: z.enum(["capture", "note", "task", "idea"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;
      const duringFocusSessionId = await getActiveFocusSessionId(userId);

      const [result] = await db.insert(captures).values({
        userId,
        mode: input.mode,
        durationS: input.durationS ?? null,
        transcript: input.transcript,
        audioKey: input.audioKey ?? null,
        intent: input.intent ?? "capture",
        processingState: "raw",
        duringFocusSessionId,
        createdAt: nowMs(),
      });

      return { id: (result as any).insertId as number };
    }),

  /** Get a single capture with its atoms. */
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [capture] = await db
        .select()
        .from(captures)
        .where(
          and(
            eq(captures.id, input.id),
            eq(captures.userId, ctx.user.id),
            isNull(captures.deletedAt)
          )
        )
        .limit(1);

      if (!capture) throw new TRPCError({ code: "NOT_FOUND" });

      const atoms = await db
        .select()
        .from(captureAtoms)
        .where(eq(captureAtoms.captureId, input.id))
        .orderBy(desc(captureAtoms.salience));

      return { capture, atoms };
    }),

  /** List recent captures (max 20). */
  recent: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select()
        .from(captures)
        .where(
          and(eq(captures.userId, ctx.user.id), isNull(captures.deletedAt))
        )
        .orderBy(desc(captures.createdAt))
        .limit(input.limit);
      return { captures: rows };
    }),

  /** Soft-delete a capture and remove its atoms. */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [capture] = await db
        .select()
        .from(captures)
        .where(
          and(
            eq(captures.id, input.id),
            eq(captures.userId, ctx.user.id),
            isNull(captures.deletedAt)
          )
        )
        .limit(1);

      if (!capture) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(captures)
        .set({ deletedAt: nowMs() })
        .where(eq(captures.id, input.id));

      await db
        .delete(captureAtoms)
        .where(eq(captureAtoms.captureId, input.id));

      return { ok: true };
    }),

  /**
   * Sort a capture: call LLM, write non-feeling atoms, return all atoms.
   * Feelings are returned in the response but NEVER written to the DB.
   */
  sort: protectedProcedure
    .input(z.object({ captureId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;

      const [capture] = await db
        .select()
        .from(captures)
        .where(
          and(
            eq(captures.id, input.captureId),
            eq(captures.userId, userId),
            isNull(captures.deletedAt)
          )
        )
        .limit(1);

      if (!capture) throw new TRPCError({ code: "NOT_FOUND" });

      const corrections = await getRecentCorrections(userId);
      const prompt = renderSortPrompt({
        transcript: capture.transcript,
        corrections: corrections.map((c) => ({
          text: c.text,
          from: c.fromKind as any,
          to: c.toKind as any,
        })),
      });

      let rawResponse: string;
      try {
        const llmResult = await Promise.race([
          invokeLLM({
            feature: "capture_atomization",
            userId,
            model: "gpt-5-nano",
            maxTokens: 600,
            messages: [{ role: "user", content: prompt }],
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Sort timeout")), 30000)
          ),
        ]);
        rawResponse = (llmResult as any).choices[0].message.content ?? "[]";
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Sorting did not run. Your capture is saved.",
        });
      }

      let allAtoms: ReturnType<typeof parseSortResponse>;
      try {
        allAtoms = parseSortResponse(rawResponse);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Sorting did not run. Your capture is saved.",
        });
      }

      const feelingAtoms = allAtoms.filter((a) => a.kind === "feeling");
      const storableAtoms = allAtoms.filter((a) => a.kind !== "feeling");

      if (storableAtoms.length > 0) {
        await db.insert(captureAtoms).values(
          storableAtoms.map((a) => ({
            captureId: input.captureId,
            userId,
            kind: a.kind as "fact" | "task" | "open_loop" | "question" | "insight",
            text: a.text,
            salience: a.salience,
            userCorrected: 0,
            createdAt: nowMs(),
          }))
        );
      }

      await db
        .update(captures)
        .set({ processingState: "sorted" })
        .where(eq(captures.id, input.captureId));

      const savedAtoms = await db
        .select()
        .from(captureAtoms)
        .where(eq(captureAtoms.captureId, input.captureId))
        .orderBy(desc(captureAtoms.salience));

      return {
        atoms: savedAtoms,
        feelingAtoms,
        feelingCount: feelingAtoms.length,
      };
    }),

  /** Reclassify an atom and record a correction for future Sort prompts. */
  reclassify: protectedProcedure
    .input(
      z.object({
        atomId: z.number().int(),
        kind: z.enum(["fact", "task", "open_loop", "question", "insight"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;

      const [atom] = await db
        .select()
        .from(captureAtoms)
        .where(
          and(eq(captureAtoms.id, input.atomId), eq(captureAtoms.userId, userId))
        )
        .limit(1);

      if (!atom) throw new TRPCError({ code: "NOT_FOUND" });
      if (atom.kind === input.kind) return { ok: true };

      await db.insert(sortCorrections).values({
        userId,
        text: atom.text,
        fromKind: atom.kind as any,
        toKind: input.kind,
        createdAt: nowMs(),
      });

      await db
        .update(captureAtoms)
        .set({ kind: input.kind, userCorrected: 1 })
        .where(eq(captureAtoms.id, input.atomId));

      return { ok: true };
    }),

  /** Route an atom to Unstick or Open Loops. */
  route: protectedProcedure
    .input(
      z.object({
        atomId: z.number().int(),
        to: z.enum(["unstick", "loops"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userId = ctx.user.id;

      const [atom] = await db
        .select()
        .from(captureAtoms)
        .where(
          and(eq(captureAtoms.id, input.atomId), eq(captureAtoms.userId, userId))
        )
        .limit(1);

      if (!atom) throw new TRPCError({ code: "NOT_FOUND" });
      if (atom.routedTo) return { targetId: atom.routedTargetId ?? 0 };

      let targetId = 0;

      if (input.to === "loops") {
        const [loopResult] = await db.insert(openLoops).values({
          userId,
          atomId: input.atomId,
          text: atom.text,
          status: "open",
          openedAt: nowMs(),
        });
        targetId = (loopResult as any).insertId as number;
      }
      // For "unstick", targetId stays 0 — client opens UnstickModal with atom.text directly

      await db
        .update(captureAtoms)
        .set({ routedTo: input.to, routedTargetId: targetId })
        .where(eq(captureAtoms.id, input.atomId));

      return { targetId };
    }),

  /** Check if Ground Mode should be offered (3+ identical open loops in 48h). */
  checkGroundModeOffer: protectedProcedure
    .input(z.object({ captureId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { offer: false };
      const userId = ctx.user.id;

      const [capture] = await db
        .select()
        .from(captures)
        .where(
          and(
            eq(captures.id, input.captureId),
            eq(captures.userId, userId),
            isNull(captures.deletedAt)
          )
        )
        .limit(1);

      if (!capture || capture.groundModeOfferedAt) return { offer: false };

      const loopAtoms = await db
        .select()
        .from(captureAtoms)
        .where(
          and(
            eq(captureAtoms.captureId, input.captureId),
            eq(captureAtoms.kind, "open_loop")
          )
        );

      if (loopAtoms.length === 0) return { offer: false };

      const cutoff = nowMs() - 48 * 60 * 60 * 1000;
      for (const loopAtom of loopAtoms) {
        const matches = await db
          .select({ count: sql<number>`count(*)` })
          .from(captureAtoms)
          .innerJoin(captures, eq(captureAtoms.captureId, captures.id))
          .where(
            and(
              eq(captureAtoms.userId, userId),
              eq(captureAtoms.kind, "open_loop"),
              sql`LOWER(${captureAtoms.text}) = LOWER(${loopAtom.text})`,
              gte(captures.createdAt, cutoff),
              isNull(captures.deletedAt)
            )
          );

        if ((matches[0]?.count ?? 0) >= 3) {
          return { offer: true as const, triggerText: loopAtom.text };
        }
      }

      return { offer: false };
    }),

  /** Mark Ground Mode as offered for this capture (prevents re-offering). */
  markGroundModeOffered: protectedProcedure
    .input(z.object({ captureId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(captures)
        .set({ groundModeOfferedAt: nowMs() })
        .where(
          and(
            eq(captures.id, input.captureId),
            eq(captures.userId, ctx.user.id)
          )
        );
      return { ok: true };
    }),
});
