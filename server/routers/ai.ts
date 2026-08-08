import { resolveDate, getServerLocalDate } from "../utils/dateUtils";
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
  deleteIdeaCapture,
  updateProject,
  logUnstickInvocation,
  getWrenLetter,
  saveWrenLetter,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { CHAPTER_CONCEPTS, PERMISSION_TO_START_CHAPTERS } from "./readingBridge";
import { checkCrisisRisk, logCrisisFlag } from "../crisisSafety";

// getTodayDate replaced by resolveDate from dateUtils

export const aiRouter = router({
  // ─── Idea Sanctuary ─────────────────────────────────────────────────────────
  captureIdea: protectedProcedure
    .input(z.object({
      content: z.string().min(1).max(5000, "Idea must be under 5,000 characters"),
      capturedDuringTask: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
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

  deleteIdea: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteIdeaCapture(input.id, ctx.user.id);
      return { success: true };
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
      await checkLLMRateLimit(ctx.user.id);
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
      return (await getLatestReEntryCard(ctx.user.id, input.projectId)) ?? null;
    }),

  acknowledgeReEntryCard: protectedProcedure
    .input(z.object({ cardId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await acknowledgeReEntryCard(input.cardId, ctx.user.id);
      return { success: true };
    }),

  // ─── Unstick Protocol (v2 — recursive decomposition + timebox offer) ─────────
  unstickTask: protectedProcedure
    .input(z.object({
      taskTitle: z.string().max(500),
      projectId: z.number().optional(),
      context: z.string().max(2000).optional(),
      // depth > 0 means we're recursively decomposing a step that was still too big
      depth: z.number().min(0).max(3).default(0),
      // entryMethod: 'manual' = user clicked I'm Stuck; 'resolver_offer' = Surface card offered it
      entryMethod: z.enum(["manual", "resolver_offer"]).default("manual"),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
      const project = input.projectId ? await getProjectById(input.projectId, ctx.user.id) : null;

      const systemPrompt = `You are an executive-function support system helping someone who is stuck.
Your job is to remove ALL decisions from the next action.
Rules:
- The first step MUST take under 2 minutes and require zero decisions.
- Steps must be physical, observable actions (open file, write one sentence, set timer).
- Never use motivational language. Never say "just" or "simply".
- If depth > 0, you are breaking down a step that was still too big — go even smaller.
- Return JSON only.`;

      const depthNote = input.depth > 0
        ? `\nNote: The user said the previous step was still too big. Go even smaller. Depth: ${input.depth}.`
        : "";

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Task: "${input.taskTitle}"\nProject: "${project?.title ?? "none"}"\nContext: "${input.context ?? "none"}"${depthNote}\n\nReturn JSON:\n{\n  microSteps: [{step: number, action: string, duration: string, canDecomposeFurther: boolean}],\n  firstAction: string (the single most undeniable physical first action),\n  timeboxOffer: string (offer a 5-minute timebox framing, e.g. "Set a 5-minute timer. Do only step 1."),\n  encouragement: string (1 calm grounded sentence, no exclamation points)\n}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "unstick_protocol_v2",
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
                      canDecomposeFurther: { type: "boolean" },
                    },
                    required: ["step", "action", "duration", "canDecomposeFurther"],
                    additionalProperties: false,
                  },
                },
                firstAction: { type: "string" },
                timeboxOffer: { type: "string" },
                encouragement: { type: "string" },
              },
              required: ["microSteps", "firstAction", "timeboxOffer", "encouragement"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const result = JSON.parse(raw);

      // Log the invocation
      await logUnstickInvocation({
        userId: ctx.user.id,
        taskTitle: input.taskTitle,
        decompositionDepth: input.depth,
        launchedTimebox: 0,
        launchedBodyDoubling: 0,
        entryMethod: input.entryMethod,
        createdAt: Date.now(),
      }).catch(() => {/* non-blocking */});

      return { ...result, depth: input.depth };
    }),

  // ─── Good Enough Threshold Check ─────────────────────────────────────────────
  checkGoodEnough: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
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
      await checkLLMRateLimit(ctx.user.id);

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

  // ─── Weekly Review — get persisted Wren letter for this week ─────────────────
  getWrenLetter: protectedProcedure
    .input(z.object({ weekKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const letter = await getWrenLetter(ctx.user.id, input.weekKey);
      return letter ?? null;
    }),

  // ─── Weekly Review — generate Wren's four-beat letter ─────────────────────────
  generateWeeklyReview: protectedProcedure
    .input(z.object({ weekKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
    await checkLLMRateLimit(ctx.user.id);

    // ── Reading Bridge context ─────────────────────────────────────────────────
    const userProfile = await getUserProfile(ctx.user.id);
    let readingBridgeContext = "";
    if (userProfile?.readingBridgeFinished) {
      readingBridgeContext = `\n\nREADING BRIDGE: The user has finished reading "Permission to Start". You may gently weave in a concept from the book if it fits the week's pattern — the threshold moment, permission before performance, returning without judgment. Only if it fits naturally.`;
    } else if (userProfile?.readingBridgeChapter) {
      const chapterKey = userProfile.readingBridgeChapter;
      const concept = CHAPTER_CONCEPTS[chapterKey] ?? "";
      const chapter = PERMISSION_TO_START_CHAPTERS.find(c => c.key === chapterKey);
      if (concept && chapter) {
        readingBridgeContext = `\n\nREADING BRIDGE: The user is currently reading "${chapter.title}" in "Permission to Start" — a chapter about ${concept}. If the week's patterns touch on this theme, you may gently reference it. Only if it fits naturally.`;
      }
    }

    // ── Gather real data ──────────────────────────────────────────────────────
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekAgoDate = new Date(weekAgo);

    const projects = await getActiveProjects(ctx.user.id);
    // Fetch enough check-ins to cover the week, then filter to the exact 7-day window
    // so the count fed to the prompt matches the stat card exactly.
    const allRecentCheckIns = await getRecentCheckIns(ctx.user.id, 50);
    const weekCheckIns = allRecentCheckIns.filter(
      c => new Date(c.createdAt).getTime() >= weekAgo
    );
    const recentPlansAll = await getRecentDailyPlans(ctx.user.id, 14);
    const weekPlans = recentPlansAll.filter(
      p => new Date(p.createdAt ?? p.date).getTime() >= weekAgo
    );
    const recentSessions = await getRecentFocusSessions(ctx.user.id, 50);

    const weekSessions = recentSessions.filter(s => new Date(s.startedAt).getTime() >= weekAgo);
    const totalFocusSeconds = weekSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
    const completedSessions = weekSessions.filter(s => s.wasCompleted === 1).length;
    const totalFocusMinutes = Math.round(totalFocusSeconds / 60);

    // These counts now match the stat cards exactly
    const checkInCount = weekCheckIns.length;
    const daysWithPlans = weekPlans.length;
    // Use week check-ins for pattern analysis
    const recentCheckIns = weekCheckIns;

    // Distraction mentions — raw, not interpreted
    const distractionMentions = recentCheckIns
      .map(c => c.interruptionsNoted)
      .filter(Boolean)
      .slice(0, 5)
      .join("; ");

    // Morning interruptions pattern (time-of-day)
    const morningCheckIns = recentCheckIns.filter(c => c.type === "morning");
    const morningInterruptions = morningCheckIns
      .map(c => c.interruptionsNoted)
      .filter(Boolean)
      .length;
    const morningInterruptionRate = morningCheckIns.length > 0
      ? Math.round((morningInterruptions / morningCheckIns.length) * 100)
      : 0;

    const activeProjectNames = projects.map(p => p.title).join(", ") || "none";
    const isThinWeek = checkInCount <= 2 && weekSessions.length === 0;

    // ── Prompt ────────────────────────────────────────────────────────────────
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are Wren — a quiet, warm companion who writes a brief personal letter to the user at the end of each week.${readingBridgeContext}

Your letter has exactly four beats:
1. WHAT MOVED — name real progress warmly. Drawn from focus sessions, completed work, what they kept returning to. Specific, not flattering. If the week was thin, say so honestly and gently.
2. WHAT WAS WAITING — name what paused or slipped, with zero shame. "Nothing was lost." Paused threads are allowed. Rest is allowed. Never "you failed to."
3. ONE PATTERN — surface a single real observation from the data. Offer it as a noticing, not a scold. Only include if there is real data to support it.
4. ONE SOFT NUDGE — a single invitation or question for next week. Never a quota or target. One thing to carry.

Close with: the thread continues, nothing was lost.

GUARDRAILS (non-negotiable):
- Never frame rest, personal time, walks, family moments, or life events as distractions or failures.
- Never use words: productivity, optimize, output, deliverable, win, streak, score, should have, failed.
- If the week is thin (few check-ins, no sessions), say so honestly: "a quiet week — and that's okay."
- Real data only. Never invent specifics you don't have.
- Write in second person ("you"), warm and direct, not clinical.
- Sign off as: — Wren
- Return JSON only.`,
        },
        {
          role: "user",
          content: `Here is ${ctx.user.name ?? "the user"}'s week:

- Check-ins completed: ${checkInCount}
- Days with a plan: ${daysWithPlans}
- Focus sessions this week: ${weekSessions.length} (${completedSessions} completed)
- Total deep focus time: ${totalFocusMinutes} minutes
- Active projects: ${activeProjectNames}
${distractionMentions ? `- Interruptions mentioned: ${distractionMentions.substring(0, 400)}` : "- No interruptions recorded"}
${morningInterruptionRate > 50 ? `- Unplanned tasks appeared in ${morningInterruptionRate}% of morning check-ins` : ""}
${isThinWeek ? "\n(This was a quiet week — be honest and gentle about that.)" : ""}

Write Wren's letter. Return JSON: { letterText: string, compassSeed: string }`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "wren_letter",
          strict: true,
          schema: {
            type: "object",
            properties: {
              letterText: { type: "string", description: "The full letter text, plain prose, no markdown headers" },
              compassSeed: { type: "string", description: "Beat 4's nudge as a single short sentence to carry into next week's compass" },
            },
            required: ["letterText", "compassSeed"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = (response.choices[0]?.message?.content as string) ?? "{}";
    const parsed = JSON.parse(raw) as { letterText: string; compassSeed: string };

    // Persist the letter for this week
    await saveWrenLetter(ctx.user.id, input.weekKey, parsed.letterText, parsed.compassSeed);

    return { letterText: parsed.letterText, compassSeed: parsed.compassSeed };
  }),
});

export const crisisRouter = router({
  /** Two-stage crisis check. Returns "none" | "elevated" | "acute". Always free — no tier gate. */
  check: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        surface: z.string().max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const risk = await checkCrisisRisk(input.text);
      if (risk !== "none") {
        void logCrisisFlag(ctx.user.id, risk, input.surface);
      }
      return { risk };
    }),
});

// ── Inline import for focus sessions (avoid circular dep) ─────────────────────
async function getRecentFocusSessions(userId: number, limit: number) {
  const { getRecentFocusSessions: fn } = await import("../db");
  return fn(userId, limit);
}
