/**
 * Wren Tone Directive
 *
 * Builds a compact tone instruction string from the user's 4 dial values and
 * default mode setting. This string is injected into every Wren system prompt.
 *
 * Design rules:
 * - Defaults (all 50 / reflecting) must reproduce today's Wren voice exactly
 * - Client-supplied tone values are NEVER used — only stored values
 * - The directive is a single compact paragraph, not a list
 */
import { getUserProfile } from "./db";

export interface WrenTone {
  wrenGentleDirect: number;
  wrenBriefThorough: number;
  wrenCalmEnergizing: number;
  wrenFollowsChallenges: number;
  wrenDefaultMode: "doing" | "reflecting" | "grounding";
}

const DEFAULT_TONE: WrenTone = {
  wrenGentleDirect: 50,
  wrenBriefThorough: 50,
  wrenCalmEnergizing: 50,
  wrenFollowsChallenges: 50,
  wrenDefaultMode: "reflecting",
};

/** Load the user's stored tone settings. Never throws — falls back to defaults. */
export async function getWrenToneForUser(userId: number): Promise<WrenTone> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return DEFAULT_TONE;
    return {
      wrenGentleDirect: profile.wrenGentleDirect ?? 50,
      wrenBriefThorough: profile.wrenBriefThorough ?? 50,
      wrenCalmEnergizing: profile.wrenCalmEnergizing ?? 50,
      wrenFollowsChallenges: profile.wrenFollowsChallenges ?? 50,
      wrenDefaultMode: (profile.wrenDefaultMode ?? "reflecting") as WrenTone["wrenDefaultMode"],
    };
  } catch {
    return DEFAULT_TONE;
  }
}

/**
 * Build a compact tone directive string to inject into Wren's system prompt.
 * At defaults (all 50 / reflecting) this produces an empty string so existing
 * behaviour is unchanged for users who haven't customised their dials.
 */
export function buildWrenToneDirective(tone: WrenTone): string {
  const { wrenGentleDirect: gd, wrenBriefThorough: bt, wrenCalmEnergizing: ce, wrenFollowsChallenges: fc, wrenDefaultMode: mode } = tone;

  // Only inject a directive when the user has meaningfully moved a dial
  const hasCustomisation =
    Math.abs(gd - 50) > 10 ||
    Math.abs(bt - 50) > 10 ||
    Math.abs(ce - 50) > 10 ||
    Math.abs(fc - 50) > 10 ||
    mode !== "reflecting";

  if (!hasCustomisation) return "";

  const parts: string[] = [];

  if (gd < 40) parts.push("gentle and soft in tone");
  else if (gd > 60) parts.push("direct and plainspoken");

  if (bt < 40) parts.push("keep replies to 1–2 sentences");
  else if (bt > 60) parts.push("you may go a little deeper when it helps");

  if (ce > 60) parts.push("lightly energizing in pace");
  else if (ce < 40) parts.push("calm and unhurried");

  if (fc > 60) parts.push("gently challenge and nudge toward the next step");
  else if (fc < 40) parts.push("follow the user's lead and don't push");

  const modeNote =
    mode === "doing" ? "Your opening lean is action and execution."
    : mode === "grounding" ? "Your opening lean is grounding and steadying."
    : ""; // "reflecting" is the default — no note needed

  const toneClause = parts.length > 0
    ? `Tone guidance (user preference): ${parts.join("; ")}.`
    : "";

  return [toneClause, modeNote].filter(Boolean).join(" ");
}

/** Convenience: load tone for user and return the directive string in one call. */
export async function getWrenToneDirective(userId: number): Promise<string> {
  const tone = await getWrenToneForUser(userId);
  return buildWrenToneDirective(tone);
}
