/**
 * Client-side Wren tone directive builder — mirrors server/wrenTone.ts
 * Used only for the live preview in Settings. The server always uses the
 * stored values; this is purely for UI feedback.
 */
export interface WrenTone {
  wrenGentleDirect: number;
  wrenBriefThorough: number;
  wrenCalmEnergizing: number;
  wrenFollowsChallenges: number;
  wrenDefaultMode: "doing" | "reflecting" | "grounding";
}

export function buildWrenToneDirective(tone: WrenTone): string {
  const { wrenGentleDirect: gd, wrenBriefThorough: bt, wrenCalmEnergizing: ce, wrenFollowsChallenges: fc, wrenDefaultMode: mode } = tone;
  const hasCustomisation =
    Math.abs(gd - 50) > 10 || Math.abs(bt - 50) > 10 ||
    Math.abs(ce - 50) > 10 || Math.abs(fc - 50) > 10 || mode !== "reflecting";
  if (!hasCustomisation) return "Wren's default voice — warm, calm, and grounded.";
  const parts: string[] = [];
  if (gd < 40) parts.push("gentle and soft");
  else if (gd > 60) parts.push("direct and plainspoken");
  if (bt < 40) parts.push("brief replies");
  else if (bt > 60) parts.push("thoughtful and thorough");
  if (ce > 60) parts.push("lightly energizing");
  else if (ce < 40) parts.push("calm and unhurried");
  if (fc > 60) parts.push("nudges you forward");
  else if (fc < 40) parts.push("follows your lead");
  const modeNote =
    mode === "doing" ? " Leans toward action." :
    mode === "grounding" ? " Leans toward steadying." : "";
  return (parts.length > 0 ? `Wren will be ${parts.join(", ")}.` : "Wren's default voice.") + modeNote;
}
