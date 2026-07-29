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
import { storagePut } from "../storage";

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

export const transcribeRouter = router({
  /**
   * Upload an audio blob (base64) to S3 and return the storage key + URL.
   * Called once per chunk from the frontend recorder.
   */
  uploadChunk: protectedProcedure
    .input(
      z.object({
        captureId: z.number().int(),
        chunkIndex: z.number().int().min(0),
        base64: z.string().max(10 * 1024 * 1024), // 10 MB base64 limit
        mimeType: z.string().default("audio/webm"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType.includes("mp4") ? "mp4" : "webm";
      const key = `captures/${ctx.user.id}/${input.captureId}/chunk-${input.chunkIndex}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { key, url };
    }),

  /**
   * Transcribe a complete audio recording stored at the given S3 URL.
   * Returns the full transcript text.
   */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        language: z.string().optional().default("en"),
        durationHint: z.number().optional(), // seconds, for timeout estimation
      })
    )
    .mutation(async ({ input }) => {
      const deepgram = getDeepgramClient();

      const timeoutMs = Math.max(
        15000,
        Math.min((input.durationHint ?? 30) * 1000 * 3, 120000)
      );

      let result: any;
      try {
        result = await Promise.race([
          deepgram.listen.v1.media.transcribeUrl(
            {
              url: input.audioUrl,
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
