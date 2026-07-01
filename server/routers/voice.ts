/**
 * Voice router — lightweight transcription for in-app dictation.
 * Does NOT create source items; just returns the transcript text.
 * Used by the Clarity Engine Brain Dump and any future dictation fields.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

const ALLOWED_AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
]);

export const voiceRouter = router({
  /**
   * Transcribe a base64-encoded audio blob via Whisper.
   * Returns only the transcript text — no source item is created.
   * Max audio size: 16 MB (base64 cap: 22 MB string).
   */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioBase64: z.string().max(22_000_000, "Audio must be under 16 MB"),
        mimeType: z.string().max(100),
        context: z.string().max(200).optional(), // optional prompt hint
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mime = input.mimeType.split(";")[0]!.trim();
      if (!ALLOWED_AUDIO_MIMES.has(input.mimeType) && !ALLOWED_AUDIO_MIMES.has(mime)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Audio type not allowed." });
      }

      const buffer = Buffer.from(input.audioBase64, "base64");
      if (buffer.length > 16 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Audio file must be under 16 MB." });
      }

      // Upload to S3 so Whisper can fetch it via URL
      const ext = mime === "audio/webm" ? "webm" : mime === "audio/mpeg" ? "mp3" : "wav";
      const fileKey = `voice-dictation/${ctx.user.id}/${Date.now().toString(36)}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, mime);

      const { checkLLMRateLimit } = await import("../_core/rateLimiter");
      checkLLMRateLimit(ctx.user.id);
      const { transcribeAudio } = await import("../_core/voiceTranscription");
      const result = await transcribeAudio({
        audioUrl: url,
        language: "en",
        prompt: input.context ?? "Transcribe the following dictation accurately.",
      });

      const text = "text" in result ? (result.text as string).trim() : "";
      if (!text) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Transcription returned empty result." });
      }
      return { text };
    }),
});
