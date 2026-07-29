/**
 * Server-side capture sort utilities.
 * Mirrors the @soul/capture stub interface so the server can render prompts
 * and parse LLM responses without needing the frontend package.
 *
 * When @soul/capture 1.0.0 ships, this file can be deleted and the capture
 * router can import directly from the real package (which will be in node_modules).
 */

export type AtomKind =
  | "feeling"
  | "fact"
  | "task"
  | "open_loop"
  | "question"
  | "insight";

export interface Atom {
  text: string;
  kind: AtomKind;
  salience: number;
}

export interface Correction {
  text: string;
  from: AtomKind;
  to: AtomKind;
}

const SORT_PROMPT = `Split this capture into individual thought units.

For each unit assign exactly one kind:
feeling, fact, task, open_loop, question, insight

Rules:
- Use the writer's own words. Trim for length. Do not rephrase, do not
  upgrade the vocabulary, do not translate into clinical or therapeutic language.
- One thought per unit. Split compound sentences.
- Assign salience 0 to 1 for how central the unit is to the capture.
- Return JSON only. No preamble, no markdown fences.

This writer has previously corrected these classifications:
{corrections}

Capture:
{transcript}

Return: [{"text": "", "kind": "", "salience": 0.0}]`;

export function renderSortPrompt(input: {
  transcript: string;
  corrections: Correction[];
}): string {
  const correctionLines =
    input.corrections.length > 0
      ? input.corrections
          .map((c) => `"${c.text}" was ${c.from}, corrected to ${c.to}`)
          .join("\n")
      : "(none)";
  return SORT_PROMPT.replace("{corrections}", correctionLines).replace(
    "{transcript}",
    input.transcript
  );
}

export function parseSortResponse(raw: string): Atom[] {
  const cleaned = raw
    .trim()
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Sort response is not an array");
  return parsed as Atom[];
}
