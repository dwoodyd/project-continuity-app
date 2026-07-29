/**
 * @soul/capture stub — implements the same interface as the real package.
 * Swap this import for the real @soul/capture when 1.0.0 is published.
 * DO NOT build features against stub internals.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

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
  salience: number; // 0 to 1
}

export interface Correction {
  text: string;
  from: AtomKind;
  to: AtomKind;
}

export interface Recorder {
  start(): Promise<void>;
  stop(): Promise<Blob[]>;
  isRecording(): boolean;
}

export interface RecorderOptions {
  onChunk: (blob: Blob, index: number) => void | Promise<void>;
  onCaption: (text: string, isFinal: boolean) => void;
  onSilenceCountdown: (secondsRemaining: number) => void;
  chunkMs?: number;       // default 5000
  silenceStopMs?: number; // default 180000
}

// ── Sort prompt ───────────────────────────────────────────────────────────────

export const SORT_PROMPT = `Split this capture into individual thought units.

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
  // Strip markdown fences if the model adds them despite instructions
  const cleaned = raw.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Sort response is not an array");
  return parsed as Atom[];
}

// ── Recorder stub ─────────────────────────────────────────────────────────────
// Uses MediaRecorder with 5-second chunks. Caption callbacks are no-ops in the
// stub — real captions come from Deepgram in the real package.

export function createRecorder(opts: RecorderOptions): Recorder {
  const {
    onChunk,
    onCaption,
    onSilenceCountdown,
    chunkMs = 5000,
    silenceStopMs = 180000,
  } = opts;

  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let chunkIndex = 0;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let recording = false;

  function clearTimers() {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (countdownInterval) clearInterval(countdownInterval);
    silenceTimer = null;
    countdownInterval = null;
  }

  function startSilenceCountdown() {
    clearTimers();
    let remaining = Math.round(silenceStopMs / 1000);
    countdownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 15) onSilenceCountdown(remaining);
    }, 1000);
    silenceTimer = setTimeout(() => {
      if (recording) recorder.stop();
    }, silenceStopMs);
  }

  const recorder: Recorder = {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks = [];
      chunkIndex = 0;
      recording = true;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const blob = e.data;
          chunks.push(blob);
          onChunk(blob, chunkIndex++);
          // Stub: emit a placeholder caption for each chunk
          onCaption("[recording…]", false);
          // Reset silence countdown on each chunk (activity detected)
          startSilenceCountdown();
        }
      };

      mediaRecorder.start(chunkMs);
      startSilenceCountdown();
    },

    async stop(): Promise<Blob[]> {
      recording = false;
      clearTimers();
      return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
          stream?.getTracks().forEach((t) => t.stop());
          resolve(chunks);
          return;
        }
        mediaRecorder.onstop = () => {
          stream?.getTracks().forEach((t) => t.stop());
          onCaption("", true); // final caption signal
          resolve(chunks);
        };
        mediaRecorder.stop();
      });
    },

    isRecording() {
      return recording;
    },
  };

  return recorder;
}
