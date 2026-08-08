/**
 * Crisis Safety Module
 *
 * Two-stage detection:
 *   1. Keyword prefilter (fast, free) — only if hit do we spend an LLM call
 *   2. LLM classifier — strict JSON output: { risk: "none" | "elevated" | "acute" }
 *
 * Design rules:
 * - Ordinary "I'm overwhelmed / stressed" must NOT trigger the crisis card
 * - No verbatim content is stored; only riskLevel + surfaceName + timestamp
 * - The crisis card and resources are ALWAYS free — bypass any paywall
 * - Resources live in CRISIS_RESOURCES — one place to update
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { crisisFlags } from "../drizzle/schema";

// ─── Resources config — update here only ─────────────────────────────────────
export const CRISIS_RESOURCES = {
  locale: "US",
  lines: [
    { label: "Call or text 988", detail: "Suicide & Crisis Lifeline", action: "tel:988" },
    { label: "Text HOME to 741741", detail: "Crisis Text Line", action: null },
    { label: "Call 911", detail: "If you're in immediate danger", action: "tel:911" },
  ],
  disclaimer: "Wren is a companion, not a crisis service or a clinician.",
  // TODO i18n: detect locale from profile/timezone/Accept-Language and swap in
  // country-appropriate lines (Samaritans UK: 116 123, Lifeline AU: 13 11 14)
} as const;

// ─── Keyword prefilter ────────────────────────────────────────────────────────
// Conservative list — only phrases that strongly suggest self-harm or suicidal
// ideation. Ordinary distress words ("overwhelmed", "stressed", "anxious") are
// intentionally absent so they route to Ground Mode as today.
const HIGH_RISK_PHRASES = [
  "want to die",
  "want to kill myself",
  "kill myself",
  "end my life",
  "end it all",
  "take my life",
  "suicide",
  "suicidal",
  "self-harm",
  "self harm",
  "hurt myself",
  "cutting myself",
  "overdose",
  "don't want to be here",
  "don't want to be alive",
  "no reason to live",
  "not worth living",
  "better off dead",
  "better off without me",
  "can't go on",
  "can't keep going",
  "nothing to live for",
  "goodbye forever",
  "final goodbye",
];

/** Returns true if the text contains any high-risk phrase. Case-insensitive. */
export function keywordPrefilter(text: string): boolean {
  const lower = text.toLowerCase();
  return HIGH_RISK_PHRASES.some((phrase) => lower.includes(phrase));
}

export type CrisisRisk = "none" | "elevated" | "acute";

/**
 * Full two-stage crisis check.
 * Returns "none" if the keyword prefilter doesn't fire.
 * Returns "elevated" or "acute" from the LLM classifier if it does.
 * Never throws — returns "none" on any error so the app never breaks.
 */
export async function checkCrisisRisk(text: string): Promise<CrisisRisk> {
  if (!keywordPrefilter(text)) return "none";

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a safety classifier. Classify the user's message for crisis risk.

Output ONLY valid JSON matching this schema: { "risk": "none" | "elevated" | "acute" }

Definitions:
- "none": ordinary stress, overwhelm, frustration, or sadness — no imminent-harm signals
- "elevated": significant distress, hopelessness, or passive ideation ("I don't want to be here") without explicit intent or means
- "acute": explicit self-harm intent, suicidal ideation with plan or means, or imminent danger

Be conservative: err toward "elevated" over "acute" unless intent and means are both present.
Do NOT classify ordinary "I'm overwhelmed" or "I'm stressed" as elevated — those are normal app usage.`,
        },
        { role: "user", content: text.slice(0, 2000) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "crisis_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              risk: { type: "string", enum: ["none", "elevated", "acute"] },
            },
            required: ["risk"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = response.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as { risk?: string };
    const risk = parsed.risk;
    if (risk === "elevated" || risk === "acute") return risk;
    return "none";
  } catch {
    // Fail open — if classifier errors, don't block the user
    return "none";
  }
}

/**
 * Log a crisis flag to the DB (no verbatim content stored).
 * Fire-and-forget — never throws.
 */
export async function logCrisisFlag(
  userId: number,
  riskLevel: "elevated" | "acute",
  surfaceName: string,
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(crisisFlags).values({
      userId,
      riskLevel,
      surfaceName,
      flaggedAt: Date.now(),
    });
  } catch {
    // Non-fatal — logging failure must never break the user's flow
  }
}
