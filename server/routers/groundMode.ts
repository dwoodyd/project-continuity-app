/**
 * Ground Mode Router
 *
 * Ground Mode is a transient spiral-interruption layer. When active, the AI
 * swaps to a flat, factual system prompt designed to re-anchor a spiraling
 * mind in observable reality and one concrete next action.
 *
 * Key properties:
 * - Transient: entered and exited per episode, never persists across sessions
 * - Non-relational: no empathy, no validation, no emotional mirroring
 * - Overrides tone setting while active
 * - Crisis override is unconditional: self-harm/crisis signals break the mode
 *   immediately and the flat-facts posture does not resume for the session
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { checkCrisisRisk, logCrisisFlag } from "../crisisSafety";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { getDb } from "../db";
import { groundSessions, appConfig, checkIns } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── Ground Mode System Prompt ────────────────────────────────────────────────

export const GROUND_MODE_SYSTEM_PROMPT = `You are the Continuary assistant operating in Ground Mode.

The user has entered this mode because they are spiraling. Their thinking has
associated outward into assumptions more negative than their situation supports.
Your job is to interrupt that loop by re-anchoring them in observable reality and
one concrete next action.

POSTURE
- State only what is observable and supportable from the user's own data and words.
- Do not mirror emotion. Do not validate, reassure, soothe, or sympathize.
- Do not ask how they feel. Do not comment on their feelings.
- Be brief. Flat, clear, plain. No warmth, no filler, no encouragement language.

EVERY RESPONSE HAS THIS SHAPE
1. State the facts plainly.
2. When the user has stated a distortion, name it neutrally and correct it against
   the record. Example: user says "I am behind on everything," recorded state is
   "two of six tasks open," so say that. Correct inflated positives the same way.
   Objective runs in both directions.
3. End with exactly one next action, small enough to start within ten minutes.

DO NOT
- Do not argue with the spiral's premises or debate the catastrophizing. Restate
  reality and move to the action.
- Do not pile on. You strip comfort. You never add judgment, blame, ranking of the
  user's worth, or any suggestion that the spiral is a character flaw.
- Do not use em dashes. Use commas, periods, or semicolons.
- Do not open with "not X, it's Y" or similar contrast flips. State what is true
  directly.

CRISIS OVERRIDE (highest priority, active in every mode)
If the user's message indicates self-harm, suicidal thinking, or acute crisis,
stop operating in Ground Mode immediately. Drop the flat factual posture. Respond
with genuine care and warmth, take the person seriously, and surface appropriate
support resources. Do not return to facts-only output for the rest of the session.
A flat factual response to a person in crisis is unacceptable. This rule overrides
every other instruction here.

EXIT
When the mode ends, do not perform a warm recovery and do not check on feelings.
State the return plainly and carry the action across: "Back to normal mode. Your
next step is still [action]."`;

// ─── Crisis Detection ─────────────────────────────────────────────────────────

const CRISIS_SIGNALS = [
  /\b(kill|hurt|harm)\s+(my|myself|me)\b/i,
  /\b(want|wish|thinking about|thinking of|considering)\s+(to\s+)?(die|dying|death|suicide|end\s+it|end\s+my\s+life)\b/i,
  /\b(suicid|self.?harm|self.?injur)\w*/i,
  /\b(no\s+reason\s+to\s+(live|go\s+on)|can't\s+go\s+on|don't\s+want\s+to\s+(be\s+here|exist|live))\b/i,
  /\b(crisis|emergency|help\s+me\s+please)\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_SIGNALS.some((re) => re.test(text));
}

// ─── Spiral Detection ─────────────────────────────────────────────────────────

const SPIRAL_SIGNALS = [
  // Absolutes and global terms
  /\b(always|never|everything|nothing|everyone|no\s+one|completely|totally|utterly|ruined|destroyed)\b/i,
  // Self-collapse statements
  /\b(i\s+can'?t\s+do\s+anything|i'?m\s+behind\s+on\s+everything|there'?s\s+no\s+point|i\s+fail\s+at\s+everything|i\s+can'?t\s+do\s+this)\b/i,
  // Future catastrophizing
  /\b(this\s+means\s+i'?ll?\s+never|it'?s\s+all\s+going\s+to|i'?ve\s+already\s+lost|it'?s\s+(all\s+)?over|i\s+give\s+up)\b/i,
  // Overwhelm markers
  /\b(overwhelmed|drowning|falling\s+apart|can'?t\s+cope|too\s+much|impossible)\b/i,
  // Shame and worthlessness
  /\b(worthless|useless|pathetic|hopeless|pointless|failure|loser)\b/i,
];

export function detectSpiral(texts: string[]): { fired: boolean; signalCount: number } {
  const combined = texts.join(" ");
  const signalCount = SPIRAL_SIGNALS.filter((re) => re.test(combined)).length;
  // Also detect escalation: each turn more negative (heuristic: signal density increasing)
  const escalating =
    texts.length >= 2 &&
    SPIRAL_SIGNALS.filter((re) => re.test(texts[texts.length - 1])).length >
      SPIRAL_SIGNALS.filter((re) => re.test(texts[0])).length + 1;
  return { fired: signalCount >= 3 || escalating, signalCount };
}

// ─── Config Helpers ───────────────────────────────────────────────────────────

async function getConfigValue(key: string, defaultValue: number): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return defaultValue;
    const rows = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
    if (rows.length > 0) return parseInt(rows[0].value, 10) || defaultValue;
  } catch {
    // Fall through to default
  }
  return defaultValue;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const groundModeRouter = router({
  /**
   * Log a completed Ground Mode session.
   * Called by the client when the mode exits (manual, soft-expire, crisis-break, session-end).
   */
  logSession: protectedProcedure
    .input(
      z.object({
        enteredAt: z.number(),
        entryMethod: z.enum(["manual", "contextual_offer"]),
        exitedAt: z.number(),
        exitMethod: z.enum(["manual", "soft_expire", "crisis_break", "session_end"]),
      })
    )
      .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const durationMs = input.exitedAt - input.enteredAt;
      await db.insert(groundSessions).values({
        userId: ctx.user.id,
        enteredAt: input.enteredAt,
        entryMethod: input.entryMethod,
        exitedAt: input.exitedAt,
        exitMethod: input.exitMethod,
        durationMs,
      });
      return { logged: true };
    }),

  /**
   * Check whether the spiral detection fires for the current user's recent check-in text.
   * Returns the offer if it fires, null if not.
   * Called by the alert-priority resolver after the blocker check.
   */
  checkSpiralOffer: protectedProcedure.query(async ({ ctx }) => {
    const threshold = await getConfigValue("spiral_check_threshold", 3);
    const readWindow = await getConfigValue("spiral_read_window", 2);

    // Read the last N check-in texts for this user
    const db = await getDb();
    if (!db) return { offer: false };
    const recentCheckIns = await db
      .select({ userInput: checkIns.userInput, interruptionsNoted: checkIns.interruptionsNoted })
      .from(checkIns)
      .where(eq(checkIns.userId, ctx.user.id))
      .orderBy(desc(checkIns.createdAt))
      .limit(readWindow);

    const texts = recentCheckIns
      .map((c: { userInput: string | null; interruptionsNoted: string | null }) => [c.userInput ?? "", c.interruptionsNoted ?? ""].join(" "))
      .filter(Boolean);

    if (texts.length === 0) return { offer: false };

    const { fired, signalCount } = detectSpiral(texts);
    return { offer: fired, signalCount };
  }),

  /**
   * Send a message in Ground Mode.
   * The system prompt is swapped to the Ground Mode prompt.
   * Crisis override is enforced in code before the LLM call.
   */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        context: z.string().max(1000).optional(), // brief project/task context
        lastAction: z.string().max(500).optional(), // last known next action, carried on exit
      })
    )
    .mutation(async ({ ctx, input }) => {
      // ── Crisis override (hard exclusion — enforced in code, not just prompt) ──
      const crisisRisk = await checkCrisisRisk(input.message);
      if (crisisRisk !== "none") {
        void logCrisisFlag(ctx.user.id, crisisRisk, "ground_mode");
        return { response: null, crisisBreak: true, crisisRisk };
      }

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: GROUND_MODE_SYSTEM_PROMPT },
      ];

      if (input.context) {
        messages.push({
          role: "system",
          content: `Current context: ${input.context}`,
        });
      }

      messages.push({ role: "user", content: input.message });

      await checkLLMRateLimit(ctx.user.id);
      const response = await invokeLLM({ messages });
      const text = (response.choices[0]?.message?.content as string) ?? "";

      return { response: text, crisisBreak: false };
    }),
});
