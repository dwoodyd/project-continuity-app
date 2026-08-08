import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../_core/trpc";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { invokeLLM } from "../_core/llm";
import { getWrenToneDirective } from "../wrenTone";
import {
  getCoworkingRooms,
  createCoworkingSession,
  getCoworkingSession,
  closeCoworkingSession,
  updateCoworkingSessionStatus,
  getRecentCoworkingSessions,
  getActiveProjects,
} from "../db";

export const coworkingRouter = {
  // List all active rooms
  listRooms: publicProcedure.query(async () => {
    return getCoworkingRooms();
  }),

  // Record session start in DB
  joinSession: protectedProcedure
    .input(z.object({
      roomId: z.number(),
      workingOn: z.string().max(500),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sessionId = await createCoworkingSession({
        userId: ctx.user.id,
        roomId: input.roomId,
        workingOn: input.workingOn,
        projectId: input.projectId,
      });
      return { sessionId };
    }),

  // Record session end + optional AI next-step generation
  leaveSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      generateNextStep: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await getCoworkingSession(input.sessionId, ctx.user.id);
      if (!session) return { aiNextStep: null, durationMinutes: 0 };

      const durationMs = Date.now() - session.joinedAt.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      let aiNextStep: string | null = null;

      if (input.generateNextStep && session.workingOn) {
        try {
          await checkLLMRateLimit(ctx.user.id);
          const activeProjects = await getActiveProjects(ctx.user.id);
          const projectContext = session.projectId
            ? activeProjects.find((p) => p.id === session.projectId)?.title ?? ""
            : "";
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are Wren, a calm continuity assistant. You help people with ADHD pick up exactly where they left off. Be brief — one sentence only.${await getWrenToneDirective(ctx.user.id).then(d => d ? ` ${d}` : "")}`,
              },
              {
                role: "user",
                content: `I just finished a ${durationMinutes}-minute co-working session. I was working on: "${session.workingOn}"${projectContext ? ` (project: ${projectContext})` : ""}. What's my suggested next step when I return?`,
              },
            ],
          });
          const content = result.choices?.[0]?.message?.content;
          aiNextStep = typeof content === "string" ? content.trim() : null;
        } catch {
          aiNextStep = null;
        }
      }

      await closeCoworkingSession(input.sessionId, durationMinutes, aiNextStep);
      return { aiNextStep, durationMinutes };
    }),

  // Update status in DB (WS handles real-time broadcast separately)
  updateStatus: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      status: z.enum(["working", "stuck", "done"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateCoworkingSessionStatus(input.sessionId, ctx.user.id, input.status);
      return { ok: true };
    }),

  // Get user's recent sessions for history
  myRecentSessions: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      return getRecentCoworkingSessions(ctx.user.id, input.limit);
    }),
};
