import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { fileTypeFromBuffer } from "file-type";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  projectFiles,
  projectNotes,
  projectMessages,
  projects,
} from "../../drizzle/schema";
import { getProjectById } from "../db";

// ─── Allowed file types for project workspace uploads ─────────────────────────
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\\x00]/g, "")
    .replace(/[^a-zA-Z0-9._\-\s]/g, "_")
    .slice(0, 200);
}

async function assertProjectOwner(projectId: number, userId: number) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  return project;
}

export const workspaceRouter = router({
  // ── Files ──────────────────────────────────────────────────────────────────
  listFiles: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(projectFiles)
        .where(
          and(
            eq(projectFiles.projectId, input.projectId),
            eq(projectFiles.userId, ctx.user.id)
          )
        )
        .orderBy(desc(projectFiles.createdAt));
    }),

  uploadFile: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      fileName: z.string().max(255),
      // base64 of up to 16MB
      fileDataBase64: z.string().max(25_000_000, "File must be under 18 MB"),
      mimeType: z.string().max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      if (!ALLOWED_MIMES.has(input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File type not allowed." });
      }
      const buffer = Buffer.from(input.fileDataBase64, "base64");
      const detectedType = await fileTypeFromBuffer(buffer);
      const textMimes = new Set(["text/plain", "text/markdown", "text/csv"]);
      if (detectedType && !ALLOWED_MIMES.has(detectedType.mime)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File content does not match the declared type." });
      }
      if (!detectedType && !textMimes.has(input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not verify file type." });
      }
      const suffix = Date.now().toString(36);
      const safeFileName = sanitizeFileName(input.fileName);
      const fileKey = `projects/${ctx.user.id}/${input.projectId}/${suffix}-${safeFileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(projectFiles).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        name: safeFileName,
        fileKey,
        fileUrl: url,
        mimeType: input.mimeType,
        sizeBytes: buffer.length,
      });
      return { url, name: safeFileName };
    }),

  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [file] = await db
        .select()
        .from(projectFiles)
        .where(and(eq(projectFiles.id, input.fileId), eq(projectFiles.userId, ctx.user.id)))
        .limit(1);
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });
      await db.delete(projectFiles).where(eq(projectFiles.id, input.fileId));
      return { success: true };
    }),

  // ── Notes ──────────────────────────────────────────────────────────────────
  listNotes: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(projectNotes)
        .where(
          and(
            eq(projectNotes.projectId, input.projectId),
            eq(projectNotes.userId, ctx.user.id)
          )
        )
        .orderBy(desc(projectNotes.updatedAt));
    }),

  createNote: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      title: z.string().max(500).optional(),
      content: z.string().max(100_000),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(projectNotes).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        title: input.title ?? "Untitled note",
        content: input.content,
      });
      return { id: (result as any).insertId as number };
    }),

  updateNote: protectedProcedure
    .input(z.object({
      noteId: z.number(),
      title: z.string().max(500).optional(),
      content: z.string().max(100_000).optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [note] = await db
        .select()
        .from(projectNotes)
        .where(and(eq(projectNotes.id, input.noteId), eq(projectNotes.userId, ctx.user.id)))
        .limit(1);
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.content !== undefined) updates.content = input.content;
      if (input.isPinned !== undefined) updates.isPinned = input.isPinned;
      if (Object.keys(updates).length > 0) {
        await db.update(projectNotes).set(updates as any).where(eq(projectNotes.id, input.noteId));
      }
      return { success: true };
    }),

  deleteNote: protectedProcedure
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [note] = await db
        .select()
        .from(projectNotes)
        .where(and(eq(projectNotes.id, input.noteId), eq(projectNotes.userId, ctx.user.id)))
        .limit(1);
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      await db.delete(projectNotes).where(eq(projectNotes.id, input.noteId));
      return { success: true };
    }),

  // ── AI Chat ────────────────────────────────────────────────────────────────
  listMessages: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(projectMessages)
        .where(
          and(
            eq(projectMessages.projectId, input.projectId),
            eq(projectMessages.userId, ctx.user.id)
          )
        )
        .orderBy(projectMessages.createdAt);
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      message: z.string().min(1).max(10_000),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await assertProjectOwner(input.projectId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Save user message
      await db.insert(projectMessages).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        role: "user" as const,
        content: input.message,
      });

      // Fetch recent chat history (last 20 messages for context)
      const history = await db
        .select()
        .from(projectMessages)
        .where(
          and(
            eq(projectMessages.projectId, input.projectId),
            eq(projectMessages.userId, ctx.user.id)
          )
        )
        .orderBy(projectMessages.createdAt)
        .limit(20);

      // Fetch project notes for context (first 3 pinned or recent)
      const notes = await db
        .select({ title: projectNotes.title, content: projectNotes.content })
        .from(projectNotes)
        .where(
          and(
            eq(projectNotes.projectId, input.projectId),
            eq(projectNotes.userId, ctx.user.id)
          )
        )
        .orderBy(desc(projectNotes.isPinned), desc(projectNotes.updatedAt))
        .limit(3);

      const notesContext = notes.length > 0
        ? `\n\nProject notes:\n${notes.map(n => `### ${n.title}\n${n.content}`).join("\n\n")}`
        : "";

      const systemPrompt = `You are a focused project assistant for "${project.title}". 
Your job is to help the user think through, plan, and make progress on this specific project.

Project context:
- Title: ${project.title}
- Description: ${project.description ?? "No description provided"}
- Why it matters: ${project.whyItMatters ?? "Not specified"}
- Current status: ${project.status}
- Next step: ${project.nextStep ?? "Not defined"}
- Blockers: ${project.blockers ?? "None noted"}${notesContext}

Be concise, practical, and action-oriented. Help the user move forward, not just think about it. 
When appropriate, suggest concrete next steps, help break down tasks, or identify blockers.`;

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...history.slice(-19).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages: messages as any });
      const rawContent = response.choices[0]?.message?.content;
      const assistantContent: string = typeof rawContent === "string" ? rawContent : (rawContent ? JSON.stringify(rawContent) : "I'm not sure how to respond to that.");

      // Save assistant response
      await db.insert(projectMessages).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        role: "assistant" as const,
        content: assistantContent,
      });

      return { reply: assistantContent };
    }),

  clearChat: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .delete(projectMessages)
        .where(
          and(
            eq(projectMessages.projectId, input.projectId),
            eq(projectMessages.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});
