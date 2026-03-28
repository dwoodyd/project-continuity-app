import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createSourceItem,
  getSourceItemById,
  getSourceItems,
  getSourceItemsByState,
  updateSourceItem,
} from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

const sourceTypeEnum = z.enum([
  "paste", "text", "markdown", "pdf", "docx", "google_docs",
  "notion", "chatgpt_export", "claude_export", "notebooklm",
  "transcript", "voice", "url", "other"
]);

const stateEnum = z.enum(["inbox", "mapped", "parked", "active", "today", "done", "archived"]);
const contentClassEnum = z.enum(["idea", "draft", "research", "outline", "decision", "tasks", "archive"]);

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
      title: z.string().optional(),
      content: z.string().min(1),
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
      title: z.string().optional(),
      fileDataBase64: z.string(),
      mimeType: z.string(),
      fileName: z.string(),
      sourceType: sourceTypeEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.fileDataBase64, "base64");
      const suffix = Date.now().toString(36);
      const fileKey = `vault/${ctx.user.id}/${suffix}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const id = await createSourceItem({
        userId: ctx.user.id,
        sourceType: input.sourceType,
        title: input.title ?? input.fileName,
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
      title: z.string().optional(),
      summary: z.string().optional(),
      tags: z.array(z.string()).optional(),
      linkedProjectIds: z.array(z.number()).optional(),
      contentClass: contentClassEnum.optional(),
      state: stateEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, tags, linkedProjectIds, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (tags !== undefined) updates.tags = JSON.stringify(tags);
      if (linkedProjectIds !== undefined) updates.linkedProjectIds = JSON.stringify(linkedProjectIds);
      if (rest.state === "mapped") updates.state = "mapped";
      await updateSourceItem(id, ctx.user.id, updates as any);
      return { success: true };
    }),

  aiProcess: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getSourceItemById(input.id, ctx.user.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const content = item.rawContent ?? item.cleanContent ?? "";
      if (!content.trim()) return { success: false, reason: "No content to process" };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for a productivity app called Project Continuity. 
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

      await updateSourceItem(input.id, ctx.user.id, {
        summary: parsed.summary,
        tags: JSON.stringify(parsed.tags ?? []),
        contentClass: parsed.contentClass as any,
        projectCandidates: JSON.stringify(parsed.projectCandidates ?? []),
        state: "mapped",
      });

      return { success: true, data: parsed };
    }),

  transcribeVoice: protectedProcedure
    .input(z.object({
      audioBase64: z.string(),
      mimeType: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const suffix = Date.now().toString(36);
      const fileKey = `voice/${ctx.user.id}/${suffix}-${input.fileName}`;
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
