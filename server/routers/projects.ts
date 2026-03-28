import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createProject,
  createProjectMemoryEvent,
  getActiveProjects,
  getColdProjects,
  getProjectById,
  getProjects,
  updateProject,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const projectStatusEnum = z.enum(["idea", "mapped", "active", "paused", "completed", "archived"]);
const projectPhaseEnum = z.enum(["defining", "building", "refining", "publishing", "maintaining"]);
const priorityEnum = z.enum(["low", "medium", "high"]);

const milestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().default(false),
  goodEnoughThreshold: z.string().optional(),
});

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getProjects(ctx.user.id);
  }),

  listActive: protectedProcedure.query(async ({ ctx }) => {
    return getActiveProjects(ctx.user.id);
  }),

  listCold: protectedProcedure.query(async ({ ctx }) => {
    return getColdProjects(ctx.user.id, 5);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await getProjectById(input.id, ctx.user.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return project;
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      category: z.string().optional(),
      whyItMatters: z.string().optional(),
      status: projectStatusEnum.optional(),
      phase: projectPhaseEnum.optional(),
      priorityLevel: priorityEnum.optional(),
      milestones: z.array(milestoneSchema).optional(),
      goodEnoughThreshold: z.string().optional(),
      nextStep: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createProject({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        whyItMatters: input.whyItMatters,
        status: input.status ?? "idea",
        phase: input.phase ?? "defining",
        priorityLevel: input.priorityLevel ?? "medium",
        milestones: input.milestones ? JSON.stringify(input.milestones) : null,
        goodEnoughThreshold: input.goodEnoughThreshold,
        nextStep: input.nextStep,
        lastTouchedAt: new Date(),
      });

      // Record creation event in project memory timeline
      try {
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId: id,
          eventType: "created",
          content: `Project created: "${input.title}"${input.description ? ` — ${input.description.substring(0, 200)}` : ""}`,
        });
        if (input.nextStep) {
          await createProjectMemoryEvent({
            userId: ctx.user.id,
            projectId: id,
            eventType: "next_step_change",
            content: `First next step set: ${input.nextStep}`,
          });
        }
      } catch (_) { /* non-blocking */ }

      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      whyItMatters: z.string().optional(),
      status: projectStatusEnum.optional(),
      phase: projectPhaseEnum.optional(),
      priorityLevel: priorityEnum.optional(),
      milestones: z.array(milestoneSchema).optional(),
      goodEnoughThreshold: z.string().optional(),
      nextStep: z.string().optional(),
      blockers: z.string().optional(),
      contextBreadcrumb: z.string().optional(),
      archiveSummary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, milestones, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (milestones !== undefined) updates.milestones = JSON.stringify(milestones);
      if (rest.status === "completed") updates.completedAt = new Date();
      await updateProject(id, ctx.user.id, updates as any);

      // Record meaningful changes in project memory timeline
      try {
        if (rest.nextStep) {
          await createProjectMemoryEvent({
            userId: ctx.user.id,
            projectId: id,
            eventType: "next_step_change",
            content: `Next step updated: ${rest.nextStep}`,
          });
        }
        if (rest.status === "completed") {
          await createProjectMemoryEvent({
            userId: ctx.user.id,
            projectId: id,
            eventType: "milestone",
            content: `Project marked complete${rest.archiveSummary ? `: ${rest.archiveSummary.substring(0, 300)}` : ""}`,
          });
        }
        if (rest.blockers) {
          await createProjectMemoryEvent({
            userId: ctx.user.id,
            projectId: id,
            eventType: "blocker",
            content: `Blocker recorded: ${rest.blockers.substring(0, 300)}`,
          });
        }
      } catch (_) { /* non-blocking */ }

      return { success: true };
    }),

  updateContextBreadcrumb: protectedProcedure
    .input(z.object({
      id: z.number(),
      breadcrumb: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateProject(input.id, ctx.user.id, { contextBreadcrumb: input.breadcrumb });

      // Record stopping point in project memory timeline
      try {
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId: input.id,
          eventType: "blocker",
          content: `Stopping point saved: ${input.breadcrumb}`,
        });
      } catch (_) { /* non-blocking */ }

      return { success: true };
    }),

  archive: protectedProcedure
    .input(z.object({
      id: z.number(),
      archiveSummary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateProject(input.id, ctx.user.id, {
        status: "archived",
        archiveSummary: input.archiveSummary,
      });

      try {
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId: input.id,
          eventType: "milestone",
          content: `Project archived${input.archiveSummary ? `: ${input.archiveSummary.substring(0, 300)}` : ""}`,
        });
      } catch (_) { /* non-blocking */ }

      return { success: true };
    }),
});
