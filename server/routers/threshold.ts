import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createFirstMovableStep,
  createThresholdDiagnosis,
  getRecentFirstMovableSteps,
  getRecentThresholdDiagnoses,
  getProjectById,
  markFirstMovableStepUsed,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { checkLLMRateLimit } from "../_core/rateLimiter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PATTERN_LABELS: Record<string, string> = {
  perfectionism: "The Perfectionism Threshold",
  ambiguity: "The Ambiguity Threshold",
  emotional_weight: "The Emotional Weight Threshold",
  executive_function: "The Executive Function Threshold",
  shame_spiral: "The Shame Spiral Threshold",
  permission_deficit: "The Permission Deficit Threshold",
};

// ─── Router ───────────────────────────────────────────────────────────────────

export const thresholdRouter = router({

  // ── Generate a First Movable Step ──────────────────────────────────────────
  // Accepts a task the user is avoiding and optional project context.
  // Returns a verb-first, specific, bounded first move with a named finish line.
  // If the user later marks it "too heavy", a Minimum Viable Contact version
  // is also included in the same response.
  generateFirstMovableStep: protectedProcedure
    .input(
      z.object({
        avoidedTask: z.string().min(1).max(1000),
        projectContext: z.string().max(500).optional(),
        projectId: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);

      let projectContext = input.projectContext ?? "";
      if (input.projectId && !projectContext) {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (project) {
          projectContext = `Project: "${project.title}". Why it matters: ${project.whyItMatters ?? "not specified"}. Current next step: ${project.nextStep ?? "none"}.`;
        }
      }

      const systemPrompt = `You are a compassionate productivity coach trained in the "First Movable Step" method from the book "Permission to Start." A First Movable Step has exactly four qualities:
1. Specific — names exactly what will happen, not a category of action
2. Physical — describes a concrete, observable action (open, write, call, read, draw, type)
3. Brief — completable in 10–25 minutes
4. Named finish line — states exactly when the step is done

You also generate a "Minimum Viable Contact" — an even lighter version for days when the primary step still feels too heavy. This is the smallest possible meaningful contact with the work: 5 minutes, one sentence, one tab opened.

Respond ONLY with valid JSON matching this exact schema:
{
  "theMove": "string — verb-first, specific, bounded action (max 120 chars)",
  "whereItEnds": "string — named finish line, starts with 'Done when' (max 100 chars)",
  "minimumViableContact": "string — lighter 5-min fallback, verb-first (max 120 chars)",
  "minimumViableContactEnds": "string — finish line for the lighter version (max 100 chars)"
}`;

      const userMessage = `The task I am avoiding: "${input.avoidedTask}"
${projectContext ? `\nContext: ${projectContext}` : ""}

Generate a First Movable Step and a Minimum Viable Contact version.`;

      let parsed: {
        theMove: string;
        whereItEnds: string;
        minimumViableContact: string;
        minimumViableContactEnds: string;
      };

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "first_movable_step",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  theMove: { type: "string" },
                  whereItEnds: { type: "string" },
                  minimumViableContact: { type: "string" },
                  minimumViableContactEnds: { type: "string" },
                },
                required: ["theMove", "whereItEnds", "minimumViableContact", "minimumViableContactEnds"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = (response.choices[0]?.message?.content as string) ?? "{}";
        parsed = JSON.parse(raw);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate a First Movable Step right now. Please try again.",
        });
      }

      // Persist to DB
      const saved = await createFirstMovableStep({
        userId: ctx.user.id,
        projectId: input.projectId ?? null,
        avoidedTask: input.avoidedTask,
        theMove: parsed.theMove,
        whereItEnds: parsed.whereItEnds,
        isTooHeavy: false,
        minimumViableContact: `${parsed.minimumViableContact} — ${parsed.minimumViableContactEnds}`,
      });

      return {
        id: saved.id,
        theMove: parsed.theMove,
        whereItEnds: parsed.whereItEnds,
        minimumViableContact: `${parsed.minimumViableContact} — ${parsed.minimumViableContactEnds}`,
      };
    }),

  // ── Mark a First Movable Step as used ──────────────────────────────────────
  markUsed: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await markFirstMovableStepUsed(input.id, ctx.user.id);
      return { ok: true };
    }),

  // ── Get recent First Movable Steps ─────────────────────────────────────────
  getRecentSteps: protectedProcedure
    .query(async ({ ctx }) => {
      return getRecentFirstMovableSteps(ctx.user.id, 10);
    }),

  // ── Threshold Diagnosis ────────────────────────────────────────────────────
  // Three plain-language questions; LLM maps to one of six patterns from the
  // book and returns a Threshold Card with a calibrated First Movable Step.
  diagnose: protectedProcedure
    .input(
      z.object({
        taskDescription: z.string().min(1).max(500),
        q1Response: z.string().min(1).max(500), // "What does starting this feel like?"
        q2Response: z.string().min(1).max(500), // "What are you afraid will happen?"
        q3Response: z.string().min(1).max(500), // "What would make this feel lighter?"
        projectId: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);

      const systemPrompt = `You are a compassionate threshold analyst trained in the "Permission to Start" framework. You identify which of six threshold patterns is blocking someone from starting, and you generate a Threshold Card to help them cross it.

The six patterns are:
- perfectionism: The person needs the work to be good enough before they can begin. They fear producing something inadequate.
- ambiguity: The task is unclear. They don't know what "done" looks like or where to start.
- emotional_weight: The task carries emotional significance — grief, identity, fear of failure, or past pain.
- executive_function: The person struggles to initiate, sequence, or transition into the task. ADHD-adjacent patterns.
- shame_spiral: The person has avoided this task before and now feels shame about the avoidance itself, which compounds the resistance.
- permission_deficit: The person doesn't feel they have the right to start — they're waiting for external validation, credentials, or permission.

For each pattern, the First Movable Step must be calibrated to the specific resistance:
- perfectionism: A deliberately modest, low-stakes first move ("Write the worst possible opening sentence")
- ambiguity: A clarifying action ("Write three possible definitions of done for this task")
- emotional_weight: A gentle, brief contact ("Sit with the document open for 5 minutes without writing")
- executive_function: A physical transition ritual ("Clear your desk, open one tab, set a 10-minute timer")
- shame_spiral: A self-compassion acknowledgment + tiny move ("Write one sentence: 'I have been away from this. I am here now.'")
- permission_deficit: An explicit self-permission statement + action ("Write: 'I have permission to begin imperfectly.' Then open the file.")

Respond ONLY with valid JSON:
{
  "pattern": "one of: perfectionism | ambiguity | emotional_weight | executive_function | shame_spiral | permission_deficit",
  "patternLabel": "plain-language name (e.g. 'The Perfectionism Threshold')",
  "protectionSentence": "one sentence: what the resistance is protecting (empathetic, not clinical)",
  "firstMove": "verb-first, specific, bounded action calibrated to this pattern (max 150 chars)",
  "whereItEnds": "named finish line starting with 'Done when' (max 100 chars)"
}`;

      const userMessage = `Task I cannot start: "${input.taskDescription}"

What starting this feels like: "${input.q1Response}"
What I am afraid will happen: "${input.q2Response}"
What would make this feel lighter: "${input.q3Response}"`;

      let parsed: {
        pattern: string;
        patternLabel: string;
        protectionSentence: string;
        firstMove: string;
        whereItEnds: string;
      };

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "threshold_card",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  patternLabel: { type: "string" },
                  protectionSentence: { type: "string" },
                  firstMove: { type: "string" },
                  whereItEnds: { type: "string" },
                },
                required: ["pattern", "patternLabel", "protectionSentence", "firstMove", "whereItEnds"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = (response.choices[0]?.message?.content as string) ?? "{}";
        parsed = JSON.parse(raw);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not complete the diagnosis right now. Please try again.",
        });
      }

      // Validate pattern is one of the six
      const validPatterns = [
        "perfectionism",
        "ambiguity",
        "emotional_weight",
        "executive_function",
        "shame_spiral",
        "permission_deficit",
      ];
      const pattern = validPatterns.includes(parsed.pattern)
        ? (parsed.pattern as typeof validPatterns[number])
        : "ambiguity";

      const saved = await createThresholdDiagnosis({
        userId: ctx.user.id,
        projectId: input.projectId ?? null,
        taskDescription: input.taskDescription,
        q1Response: input.q1Response,
        q2Response: input.q2Response,
        q3Response: input.q3Response,
        pattern: pattern as any,
        patternLabel: parsed.patternLabel || PATTERN_LABELS[pattern] || pattern,
        protectionSentence: parsed.protectionSentence,
        firstMove: parsed.firstMove,
        whereItEnds: parsed.whereItEnds,
      });

      return {
        id: saved.id,
        pattern: saved.pattern,
        patternLabel: saved.patternLabel,
        protectionSentence: saved.protectionSentence,
        firstMove: saved.firstMove,
        whereItEnds: saved.whereItEnds,
        permissionLine: "You have permission to begin.",
      };
    }),

  // ── Get recent Threshold Diagnoses ─────────────────────────────────────────
  getRecentDiagnoses: protectedProcedure
    .query(async ({ ctx }) => {
      return getRecentThresholdDiagnoses(ctx.user.id, 10);
    }),
});
