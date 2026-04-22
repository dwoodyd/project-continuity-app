import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  acknowledgeReEntryCard,
  createIdeaCapture,
  createReEntryCard,
  createSourceItem,
  getActiveProjects,
  getIdeaCaptures,
  getLatestReEntryCard,
  getProjectById,
  getRecentCheckIns,
  getRecentDailyPlans,
  getUserProfile,
  updateIdeaCapture,
  updateProject,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { checkLLMRateLimit } from "../_core/rateLimiter";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!;
}

export const aiRouter = router({
  // ─── Idea Sanctuary ─────────────────────────────────────────────────────────
  captureIdea: protectedProcedure
    .input(z.object({
      content: z.string().min(1).max(5000, "Idea must be under 5,000 characters"),
      capturedDuringTask: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      // Derive a short title from the first line or first 60 chars
      const firstLine = input.content.split("\n")[0]?.trim() ?? "";
      const title = firstLine.length > 0
        ? firstLine.substring(0, 120)
        : input.content.substring(0, 60) + (input.content.length > 60 ? "…" : "");

      // 1. Save to idea_captures (legacy / offline sync)
      const id = await createIdeaCapture({
        userId: ctx.user.id,
        rawContent: input.content,
        capturedDuringTask: input.capturedDuringTask ?? false,
        parkedStatus: true,
        resolvedStatus: false,
      });

      // 2. Also save to source_items so it appears in the Knowledge Vault
      const sourceId = await createSourceItem({
        userId: ctx.user.id,
        sourceType: "text",
        title,
        rawContent: input.content,
        contentClass: "idea",
        state: "inbox",
        mappingConfidence: "needs_review",
      });

      // Background AI parsing (non-blocking feel — we do it inline but quickly)
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Parse this captured idea and return JSON only. Be brief." },
            {
              role: "user",
              content: `Parse this idea: "${input.content.substring(0, 500)}"
Return JSON: { parsedIntent: string (1 sentence), suggestedProject: string|null }`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "idea_parse",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  parsedIntent: { type: "string" },
                  suggestedProject: { type: ["string", "null"] },
                },
                required: ["parsedIntent", "suggestedProject"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = (response.choices[0]?.message?.content as string) ?? "{}";
        const parsed = JSON.parse(raw);
        await updateIdeaCapture(id, ctx.user.id, { parsedIntent: parsed.parsedIntent });
      } catch (_) {
        // Silent fail — idea is already saved
      }

      return { id, sourceId, message: "Saved. Back to the current step." };
    }),

  listIdeas: protectedProcedure.query(async ({ ctx }) => {
    return getIdeaCaptures(ctx.user.id);
  }),

  resolveIdea: protectedProcedure
    .input(z.object({
      id: z.number(),
      action: z.enum(["park", "promote", "future", "discard"]),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.action === "discard") {
        // Archive — not relevant, dismissed
        await updateIdeaCapture(input.id, ctx.user.id, { resolvedStatus: true, resolvedAt: new Date() });
      } else if (input.action === "park") {
        // Active project — park to Vault for current work
        await updateIdeaCapture(input.id, ctx.user.id, { parkedStatus: true });
      } else if (input.action === "future") {
        // Future idea — save for later, no active project link
        await updateIdeaCapture(input.id, ctx.user.id, {
          resolvedStatus: true,
          resolvedAt: new Date(),
          parsedIntent: "Future idea — saved for later",
        });
      } else if (input.action === "promote") {
        // One-time task — link to specific project
        await updateIdeaCapture(input.id, ctx.user.id, {
          resolvedStatus: true,
          resolvedAt: new Date(),
          relatedProjectId: input.projectId,
        });
      }
      return { success: true };
    }),

  // ─── Re-Entry Card ───────────────────────────────────────────────────────────
  generateReEntryCard: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      const project = await getProjectById(input.projectId, ctx.user.id);
      if (!project) return null;

      const recentCheckIns = await getRecentCheckIns(ctx.user.id, 5);
      const relevantCheckIns = recentCheckIns.filter(c => {
        const ids = JSON.parse(c.linkedProjectIds ?? "[]");
        return ids.includes(input.projectId);
      });

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are helping someone with ADHD re-enter a project after a gap. 
Generate a Re-Entry Card — a cognitive handoff from past-self to present-self.
Be specific, grounded, and concrete. Never vague. Never motivational.
Return JSON only.`,
          },
          {
            role: "user",
            content: `Project: "${project.title}"
Why it matters: "${project.whyItMatters ?? "not specified"}"
Current phase: ${project.phase}
Next step recorded: "${project.nextStep ?? "not recorded"}"
Context breadcrumb: "${project.contextBreadcrumb ?? "none"}"
Recent check-in notes: ${relevantCheckIns.map(c => c.userInput).join(" | ").substring(0, 500) || "none"}

Generate a Re-Entry Card with:
- stoppingPoint: where the work stopped (specific, concrete)
- unresolvedDecision: the open question or decision at last session
- whatWasRuledOut: what was already tried or eliminated
- nextPhysicalAction: the single most specific physical next action (e.g. "Open the draft doc and read the last paragraph")
- whyItMattersQuote: one sentence from the why-it-matters field, or a grounded restatement

Return JSON: { stoppingPoint, unresolvedDecision, whatWasRuledOut, nextPhysicalAction, whyItMattersQuote }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "re_entry_card",
            strict: true,
            schema: {
              type: "object",
              properties: {
                stoppingPoint: { type: "string" },
                unresolvedDecision: { type: "string" },
                whatWasRuledOut: { type: "string" },
                nextPhysicalAction: { type: "string" },
                whyItMattersQuote: { type: "string" },
              },
              required: ["stoppingPoint", "unresolvedDecision", "whatWasRuledOut", "nextPhysicalAction", "whyItMattersQuote"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const parsed = JSON.parse(raw);

      const cardId = await createReEntryCard({
        userId: ctx.user.id,
        projectId: input.projectId,
        ...parsed,
      });

      return { cardId, ...parsed };
    }),

  getLatestReEntryCard: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getLatestReEntryCard(ctx.user.id, input.projectId);
    }),

  acknowledgeReEntryCard: protectedProcedure
    .input(z.object({ cardId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await acknowledgeReEntryCard(input.cardId, ctx.user.id);
      return { success: true };
    }),

  // ─── Unstick Protocol ────────────────────────────────────────────────────────
  unstickTask: protectedProcedure
    .input(z.object({
      taskTitle: z.string().max(500, "Task title must be under 500 characters"),
      projectId: z.number().optional(),
      context: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      const project = input.projectId ? await getProjectById(input.projectId, ctx.user.id) : null;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You help people with ADHD get unstuck on tasks. 
Break down the task into embarrassingly small, undeniable, zero-friction physical actions.
The first step should take less than 2 minutes. Be extremely specific and concrete.
Never use motivational language. Return JSON only.`,
          },
          {
            role: "user",
            content: `Task: "${input.taskTitle}"
Project context: "${project?.title ?? "none"}"
Additional context: "${input.context ?? "none"}"

Break this into micro-steps. First step must be something that takes under 2 minutes.
Return JSON: { 
  microSteps: [{step: number, action: string, duration: string}],
  firstAction: string,
  encouragement: string (1 calm sentence, no exclamation points)
}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "unstick_protocol",
            strict: true,
            schema: {
              type: "object",
              properties: {
                microSteps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      step: { type: "number" },
                      action: { type: "string" },
                      duration: { type: "string" },
                    },
                    required: ["step", "action", "duration"],
                    additionalProperties: false,
                  },
                },
                firstAction: { type: "string" },
                encouragement: { type: "string" },
              },
              required: ["microSteps", "firstAction", "encouragement"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      return JSON.parse(raw);
    }),

  // ─── Good Enough Threshold Check ─────────────────────────────────────────────
  checkGoodEnough: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      const project = await getProjectById(input.projectId, ctx.user.id);
      if (!project?.goodEnoughThreshold) return null;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You help users recognize when work is complete enough. Be direct and grounded. Return JSON only.",
          },
          {
            role: "user",
            content: `Project: "${project.title}"
The user defined "good enough" as: "${project.goodEnoughThreshold}"
Current phase: ${project.phase}
Next step: "${project.nextStep ?? "none"}"

Has this project likely reached its good enough threshold? 
Return JSON: { likelyComplete: boolean, surfaceMessage: string (use user's own language), question: string }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "good_enough_check",
            strict: true,
            schema: {
              type: "object",
              properties: {
                likelyComplete: { type: "boolean" },
                surfaceMessage: { type: "string" },
                question: { type: "string" },
              },
              required: ["likelyComplete", "surfaceMessage", "question"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      return JSON.parse(raw);
    }),

  // ─── Amnesty Protocol ────────────────────────────────────────────────────────
  checkAmnesty: protectedProcedure.query(async ({ ctx }) => {
    const recentPlans = await getRecentDailyPlans(ctx.user.id, 3);
    const recentCheckIns = await getRecentCheckIns(ctx.user.id, 3);

    if (recentCheckIns.length === 0 && recentPlans.length === 0) {
      return { needsAmnesty: false };
    }

    const lastActivity = recentCheckIns[0]?.createdAt ?? recentPlans[0]?.createdAt;
    if (!lastActivity) return { needsAmnesty: false };

    const hoursSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
    const needsAmnesty = hoursSince >= 48;

    return {
      needsAmnesty,
      hoursSince: Math.floor(hoursSince),
      message: needsAmnesty
        ? "Welcome back. Time has passed, so your previous plan has been safely parked. You are not behind. What is the single most important thread to pick up today?"
        : null,
    };
  }),

  // ─── Direct Voice Transcription (no S3 storage) ─────────────────────────────
  // Accepts base64-encoded WebM audio, calls Whisper, returns transcript text.
  // Audio is discarded after transcription — zero storage cost.
  transcribeVoiceDirect: protectedProcedure
    .input(
      z.object({
        // Base64-encoded audio data (WebM format from MediaRecorder)
        audioBase64: z.string().min(1).max(20_000_000, "Audio data too large (max ~15 MB)"),
        // Optional language hint for better accuracy
        language: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);

      const { ENV } = await import("../_core/env");
      if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Voice transcription service is not configured",
        });
      }

      // Decode base64 to buffer
      let audioBuffer: Buffer;
      try {
        audioBuffer = Buffer.from(input.audioBase64, "base64");
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid audio data encoding",
        });
      }

      // Enforce 16 MB limit (Whisper hard limit)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `Recording is ${sizeMB.toFixed(1)} MB — please keep recordings under 16 MB (roughly 90 seconds).`,
        });
      }

      // Build multipart form for Whisper API
      const formData = new FormData();
      const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" });
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-1");
      formData.append("response_format", "json");
      if (input.language) {
        formData.append("language", input.language);
      }

      const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
      const whisperUrl = new URL("v1/audio/transcriptions", baseUrl).toString();

      const response = await fetch(whisperUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "Accept-Encoding": "identity",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`[transcribeVoiceDirect] Upstream error ${response.status}: ${errorText.slice(0, 500)}`);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Transcription failed. Please try again.",
        });
      }

      const result = (await response.json()) as { text: string };
      if (!result.text || typeof result.text !== "string") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Transcription service returned an unexpected response",
        });
      }

      // Return only the text — audio buffer is GC'd immediately
      return { transcript: result.text.trim() };
    }),

  // ─── Weekly Review Generation ─────────────────────────────────────────────────
  generateWeeklyReview: protectedProcedure.mutation(async ({ ctx }) => {
    checkLLMRateLimit(ctx.user.id);
    const projects = await getActiveProjects(ctx.user.id);
    const recentCheckIns = await getRecentCheckIns(ctx.user.id, 21);
    const recentPlans = await getRecentDailyPlans(ctx.user.id, 7);

    const distractionMentions = recentCheckIns
      .map(c => c.interruptionsNoted)
      .filter(Boolean)
      .join(", ");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Generate a weekly review summary. Be grounded and informational. Never shame. Return JSON only.",
        },
        {
          role: "user",
          content: `Active projects: ${projects.map(p => p.title).join(", ")}
Recent check-in interruptions mentioned: "${distractionMentions.substring(0, 500)}"
Number of days with plans this week: ${recentPlans.length}

Generate a weekly review.
Return JSON: { 
  summary: string,
  patternsSurfaced: string,
  distractionInsight: string (if patterns found, otherwise empty string)
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "weekly_review",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              patternsSurfaced: { type: "string" },
              distractionInsight: { type: "string" },
            },
            required: ["summary", "patternsSurfaced", "distractionInsight"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = (response.choices[0]?.message?.content as string) ?? "{}";
    return JSON.parse(raw);
  }),
});
