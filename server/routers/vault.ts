import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createSourceItem,
  getSourceItemById,
  getSourceItems,
  getSourceItemsByState,
  updateSourceItem,
  createProjectMemoryEvent,
  getProjectById,
} from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";

const sourceTypeEnum = z.enum([
  "paste", "text", "markdown", "pdf", "docx", "google_docs",
  "notion", "chatgpt_export", "claude_export", "notebooklm",
  "transcript", "voice", "url", "other"
]);

const stateEnum = z.enum(["inbox", "mapped", "parked", "active", "today", "done", "archived"]);
const contentClassEnum = z.enum(["idea", "draft", "research", "outline", "decision", "tasks", "archive"]);

// Allowlisted MIME types for file uploads — prevents executable/script uploads
const ALLOWED_FILE_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// Allowlisted MIME types for voice uploads
const ALLOWED_AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
]);

// Sanitize filename: strip path separators and null bytes, keep only safe chars
function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\\x00]/g, "")  // strip path traversal chars and null bytes
    .replace(/[^a-zA-Z0-9._\-\s]/g, "_")  // replace unsafe chars with underscore
    .slice(0, 200);  // hard cap
}

export const vaultRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getSourceItems(ctx.user.id);
  }),

  listByState: protectedProcedure
    .input(z.object({ state: stateEnum }))
    .query(async ({ ctx, input }) => {
      return getSourceItemsByState(ctx.user.id, input.state);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await getSourceItemById(input.id, ctx.user.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),

  addPaste: protectedProcedure
    .input(z.object({
      title: z.string().max(500).optional(),
      content: z.string().min(1).max(50000, "Content must be under 50,000 characters"),
      sourceType: sourceTypeEnum.optional(),
      contentClass: contentClassEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createSourceItem({
        userId: ctx.user.id,
        sourceType: input.sourceType ?? "paste",
        title: input.title,
        rawContent: input.content,
        contentClass: input.contentClass ?? "idea",
        state: "inbox",
      });
      return { id };
    }),

  addFile: protectedProcedure
    .input(z.object({
      title: z.string().max(500).optional(),
      // base64 of 16MB file ≈ 22MB string; cap at 25M chars (~18MB decoded)
      fileDataBase64: z.string().max(25_000_000, "File must be under 18 MB"),
      mimeType: z.string().max(100),
      fileName: z.string().max(255),
      sourceType: sourceTypeEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      // Enforce MIME allowlist — reject executable/script types
      if (!ALLOWED_FILE_MIMES.has(input.mimeType)) {
        const { TRPCError } = await import("@trpc/server");
        throw new TRPCError({ code: "BAD_REQUEST", message: "File type not allowed." });
      }
      const buffer = Buffer.from(input.fileDataBase64, "base64");
      const suffix = Date.now().toString(36);
      const safeFileName = sanitizeFileName(input.fileName);
      const fileKey = `vault/${ctx.user.id}/${suffix}-${safeFileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const id = await createSourceItem({
        userId: ctx.user.id,
        sourceType: input.sourceType,
        title: input.title ?? safeFileName,
        fileUrl: url,
        fileKey,
        mimeType: input.mimeType,
        state: "inbox",
      });
      return { id, url };
    }),

  updateState: protectedProcedure
    .input(z.object({
      id: z.number(),
      state: stateEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      await updateSourceItem(input.id, ctx.user.id, { state: input.state });
      return { success: true };
    }),

  updateItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().max(500).optional(),
      summary: z.string().max(2000).optional(),
      tags: z.array(z.string()).optional(),
      linkedProjectIds: z.array(z.number()).optional(),
      contentClass: contentClassEnum.optional(),
      state: stateEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, tags, linkedProjectIds, ...rest } = input;
      // Fetch item before update to detect new project mapping
      const existingItem = await getSourceItemById(id, ctx.user.id);
      const updates: Record<string, unknown> = { ...rest };
      if (tags !== undefined) updates.tags = JSON.stringify(tags);
      if (linkedProjectIds !== undefined) updates.linkedProjectIds = JSON.stringify(linkedProjectIds);
      if (rest.state === "mapped") updates.state = "mapped";
      await updateSourceItem(id, ctx.user.id, updates as any);
      // Record projectMemoryEvent when a vault item is mapped to a project for the first time
      if (linkedProjectIds && linkedProjectIds.length > 0) {
        const prevLinked: number[] = existingItem?.linkedProjectIds
          ? (() => { try { return JSON.parse(existingItem.linkedProjectIds); } catch { return []; } })()
          : [];
        const newlyLinked = linkedProjectIds.filter((pid) => !prevLinked.includes(pid));
        for (const projectId of newlyLinked) {
          const project = await getProjectById(projectId, ctx.user.id);
          if (project) {
            await createProjectMemoryEvent({
              userId: ctx.user.id,
              projectId,
              eventType: "vault_import",
              content: `Vault item "${existingItem?.title ?? "Untitled"}" mapped to this project.`,
              metadata: JSON.stringify({ sourceItemId: id, contentClass: existingItem?.contentClass }),
            });
          }
        }
      }
      return { success: true };
    }),

  aiProcess: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      const item = await getSourceItemById(input.id, ctx.user.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const content = item.rawContent ?? item.cleanContent ?? "";
      if (!content.trim()) return { success: false, reason: "No content to process" };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for a productivity app called Continuary. 
Your job is to analyze a piece of content and extract structured information from it.
Be concise, grounded, and direct. Never use motivational language.
Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Analyze this content and return a JSON object with these fields:
- summary: 2-3 sentence summary of the content
- tags: array of 3-5 relevant topic tags (lowercase, no spaces)
- contentClass: one of "idea", "draft", "research", "outline", "decision", "tasks", "archive"
- projectCandidates: array of 1-3 possible project names this content belongs to
- nextActions: array of 0-3 specific actionable next steps extracted from the content

Content:
${content.substring(0, 3000)}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "content_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                contentClass: { type: "string" },
                projectCandidates: { type: "array", items: { type: "string" } },
                nextActions: { type: "array", items: { type: "string" } },
              },
              required: ["summary", "tags", "contentClass", "projectCandidates", "nextActions"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const parsed = JSON.parse(raw);

      // Derive confidence: "likely" if 1 candidate, "possible" if 2+, "needs_review" if 0
      const candidateCount = (parsed.projectCandidates ?? []).length;
      const mappingConfidence: "likely" | "possible" | "needs_review" =
        candidateCount === 1 ? "likely" : candidateCount >= 2 ? "possible" : "needs_review";

      await updateSourceItem(input.id, ctx.user.id, {
        summary: parsed.summary,
        tags: JSON.stringify(parsed.tags ?? []),
        contentClass: parsed.contentClass as any,
        projectCandidates: JSON.stringify(parsed.projectCandidates ?? []),
        mappingConfidence,
        state: "mapped",
      });

      return { success: true, data: { ...parsed, mappingConfidence } };
    }),

  reviewQueue: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const { and, eq, or, isNull } = await import("drizzle-orm");
    const { sourceItems } = await import("../../drizzle/schema");
    return db.select().from(sourceItems).where(
      and(
        eq(sourceItems.userId, ctx.user.id),
        or(
          eq(sourceItems.mappingConfidence, "needs_review"),
          eq(sourceItems.mappingConfidence, "possible")
        ),
        isNull(sourceItems.reviewedAt)
      )
    ).orderBy(sourceItems.createdAt).limit(20);
  }),

  markReviewed: protectedProcedure
    .input(z.object({
      id: z.number(),
      confirmedProjectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await getSourceItemById(input.id, ctx.user.id);
      await updateSourceItem(input.id, ctx.user.id, {
        reviewedAt: new Date(),
        mappingConfidence: "likely",
        ...(input.confirmedProjectId
          ? { linkedProjectIds: JSON.stringify([input.confirmedProjectId]) }
          : {}),
      });
      // Record memory event when vault item is confirmed to a project
      if (input.confirmedProjectId && item) {
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId: input.confirmedProjectId,
          eventType: "vault_import",
          content: `Vault item "${item.title ?? "Untitled"}" confirmed and mapped to this project.`,
          metadata: JSON.stringify({ sourceItemId: input.id, contentClass: item.contentClass }),
        });
      }
      return { success: true };
    }),

  // Detect likely duplicate or overlapping notes — groups items sharing project candidates
  detectDuplicates: protectedProcedure.query(async ({ ctx }) => {
    const items = await getSourceItems(ctx.user.id);
    if (items.length < 2) return { groups: [], disconnected: [] };
    const fingerprints = items.map((item: any) => ({
      id: item.id,
      title: item.title ?? "",
      candidates: item.projectCandidates ? JSON.parse(item.projectCandidates) : [] as string[],
      state: item.state,
    }));
    // Group items that share project candidates (potential one body of work)
    const candidateMap = new Map<string, number[]>();
    for (const fp of fingerprints) {
      for (const candidate of fp.candidates) {
        const key = (candidate as string).toLowerCase().trim();
        if (!candidateMap.has(key)) candidateMap.set(key, []);
        candidateMap.get(key)!.push(fp.id);
      }
    }
    const groups: Array<{ candidate: string; itemIds: number[] }> = [];
    for (const [candidate, ids] of Array.from(candidateMap.entries())) {
      if (ids.length >= 2) groups.push({ candidate, itemIds: ids });
    }
    // Disconnected notes: inbox items with no project candidates after AI processing
    const disconnected = fingerprints
      .filter((fp: any) => fp.state === "mapped" && fp.candidates.length === 0)
      .map((fp: any) => fp.id);
    return { groups, disconnected };
  }),

  // Clipboard capture — receives text from frontend navigator.clipboard.readText()
  captureClipboard: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(50000) }))
    .mutation(async ({ ctx, input }) => {
      const id = await createSourceItem({
        userId: ctx.user.id,
        sourceType: "paste",
        title: `Clipboard — ${new Date().toLocaleDateString()}`,
        rawContent: input.text,
        state: "inbox",
      });
      return { id };
    }),

  transcribeVoice: protectedProcedure
    .input(z.object({
      // base64 of 16MB audio ≈ 22MB string; cap at 22M chars
      audioBase64: z.string().max(22_000_000, "Audio file must be under 16 MB"),
      mimeType: z.string().max(100),
      fileName: z.string().max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      // Enforce audio MIME allowlist
      if (!ALLOWED_AUDIO_MIMES.has(input.mimeType)) {
        const { TRPCError } = await import("@trpc/server");
        throw new TRPCError({ code: "BAD_REQUEST", message: "Audio type not allowed." });
      }
      const buffer = Buffer.from(input.audioBase64, "base64");
      const suffix = Date.now().toString(36);
      const safeFileName = sanitizeFileName(input.fileName);
      const fileKey = `voice/${ctx.user.id}/${suffix}-${safeFileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      const { transcribeAudio } = await import("../_core/voiceTranscription");
      const result = await transcribeAudio({ audioUrl: url });
      const transcript = 'text' in result ? result.text : '';

      const id = await createSourceItem({
        userId: ctx.user.id,
        sourceType: "voice",
        title: `Voice note — ${new Date().toLocaleDateString()}`,
        rawContent: transcript,
        fileUrl: url,
        fileKey,
        mimeType: input.mimeType,
        state: "inbox",
      });

      return { id, transcript };
    }),
});
