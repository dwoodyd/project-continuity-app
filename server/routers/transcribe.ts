/**
 * Transcription router.
 * Receives audio chunks from the client, stores them in S3, and transcribes
 * via Deepgram's prerecorded API. Returns the transcript text.
 *
 * The stub @soul/capture handles MediaRecorder on the frontend; this router
 * handles the server side of the voice capture pipeline.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { DeepgramClient } from "@deepgram/sdk";
import { storageGet, storagePut } from "../storage";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

function getDeepgramClient() {
  if (!DEEPGRAM_API_KEY) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Voice transcription is not configured.",
    });
  }
  return new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });
}

export function isOwnedCaptureAudioKey(key: string, userId: number): boolean {
  const match = /^(?:vault\/(\d+)\/captures|captures\/(\d+))\/\d+\/chunk-\d+\.(?:webm|mp4)$/i.exec(key);
  return (match?.[1] ?? match?.[2]) === String(userId);
}

export const transcribeRouter = router({
  /**
   * Upload an audio blob (base64) to private storage and return its key only.
   * The temporary provider URL never reaches the browser.
   * Called once per chunk from the frontend recorder.
   */
  uploadChunk: protectedProcedure
    .input(
      z.object({
        captureId: z.number().int().positive(),
        chunkIndex: z.number().int().min(0),
        base64: z.string().max(10 * 1024 * 1024), // 10 MB base64 limit
        mimeType: z.string().regex(/^audio\/(?:webm|mp4)(?:;[a-z0-9=._-]+)*$/i).max(128).default("audio/webm"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType.includes("mp4") ? "mp4" : "webm";
      const key = `vault/${ctx.user.id}/captures/${input.captureId}/chunk-${input.chunkIndex}.${ext}`;
      await storagePut(key, buffer, input.mimeType);
      return { key };
    }),

  /**
   * Transcribe a complete audio recording owned by the requesting member.
   * A temporary storage URL is created only on the server for Deepgram.
   * Returns the full transcript text.
   */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioKey: z.string().min(1).max(512),
        language: z.string().optional().default("en"),
        durationHint: z.number().optional(), // seconds, for timeout estimation
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOwnedCaptureAudioKey(input.audioKey, ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "That recording is not available." });
      }
      const deepgram = getDeepgramClient();

      let audioUrl: string;
      try {
        ({ url: audioUrl } = await storageGet(input.audioKey));
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "That recording is no longer available." });
      }

      const timeoutMs = Math.max(
        15000,
        Math.min((input.durationHint ?? 30) * 1000 * 3, 120000)
      );

      let result: any;
      try {
        result = await Promise.race([
          deepgram.listen.v1.media.transcribeUrl(
            {
              url: audioUrl,
              model: "nova-3",
              language: input.language,
              smart_format: true,
              punctuate: true,
            }
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Transcription timeout")), timeoutMs)
          ),
        ]);
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Transcription failed. Your recording is saved.",
        });
      }

      const transcript =
        result?.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

      if (!transcript) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: "No speech detected. Please try again.",
        });
      }

      return { transcript };
    }),

  /**
   * Health check — returns whether Deepgram is configured.
   * Used by the Capture screen to decide whether to show the voice button.
   */
  isAvailable: protectedProcedure.query(() => {
    return { available: Boolean(DEEPGRAM_API_KEY) };
  }),
});
