import { z } from "zod";
import {
  createCheckIn,
  getDailyPlan,
  getCheckIns,
  getRecentCheckIns,
  updateCheckIn,
  updateDailyPlan,
  upsertDailyPlan,
  getActiveProjects,
  getUserProfile,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!;
}

export const checkInsRouter = router({
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const date = getTodayDate();
    return getCheckIns(ctx.user.id, date);
  }),

  getRecent: protectedProcedure.query(async ({ ctx }) => {
    return getRecentCheckIns(ctx.user.id, 14);
  }),

  submitMorning: protectedProcedure
    .input(z.object({
      capacityLevel: z.enum(["full", "partial", "low"]),
      primaryProjectId: z.number().optional(),
      secondaryProjectId: z.number().optional(),
      userNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = getTodayDate();
      const profile = await getUserProfile(ctx.user.id);
      const activeProjects = await getActiveProjects(ctx.user.id);
      const toneMap = {
        gentle: "warm and supportive, but never chirpy",
        direct: "calm and direct",
        firm: "concise and firm",
      };
      const tone = toneMap[profile?.tonePreference ?? "direct"];

      // Generate AI plan guidance
      const planPrompt = `You are a thoughtful productivity assistant for someone with ADHD. 
Tone: ${tone}. Never use exclamation points, gamification, or motivational poster language.
The user's capacity today is: ${input.capacityLevel}.
Active projects: ${activeProjects.slice(0, 5).map(p => `"${p.title}" (next step: ${p.nextStep ?? "not set"})`).join(", ") || "none yet"}.
User notes: ${input.userNotes ?? "none"}.

Generate a morning guidance message (2-3 sentences) and suggest 1-3 critical tasks based on capacity:
- full: up to 3 tasks, primary + secondary project
- partial: 1-2 tasks, primary project only
- low: 1 task only, rest permission statement

Return JSON: { guidance: string, criticalTasks: [{title: string, projectId: number|null}], timeBlocks: [{label: string, duration: string}] }`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a calm, grounded productivity assistant. Return valid JSON only." },
          { role: "user", content: planPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "morning_plan",
            strict: true,
            schema: {
              type: "object",
              properties: {
                guidance: { type: "string" },
                criticalTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      projectId: { type: ["number", "null"] },
                    },
                    required: ["title", "projectId"],
                    additionalProperties: false,
                  },
                },
                timeBlocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      duration: { type: "string" },
                    },
                    required: ["label", "duration"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["guidance", "criticalTasks", "timeBlocks"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const parsed = JSON.parse(raw);

      // Assign project IDs from input if provided
      const tasksWithIds = parsed.criticalTasks.map((t: any, i: number) => ({
        ...t,
        id: `task-${Date.now()}-${i}`,
        done: false,
        projectId: t.projectId ?? input.primaryProjectId ?? null,
      }));

      const planId = await upsertDailyPlan({
        userId: ctx.user.id,
        date,
        capacityLevel: input.capacityLevel,
        primaryProjectId: input.primaryProjectId,
        secondaryProjectId: input.capacityLevel === "full" ? input.secondaryProjectId : undefined,
        criticalTasks: JSON.stringify(tasksWithIds),
        timeBlocks: JSON.stringify(parsed.timeBlocks),
        generatedGuidance: parsed.guidance,
      });

      const checkInId = await createCheckIn({
        userId: ctx.user.id,
        dailyPlanId: planId,
        date,
        type: "morning",
        userInput: JSON.stringify({ capacityLevel: input.capacityLevel, notes: input.userNotes }),
        generatedResponse: parsed.guidance,
        completedAt: new Date(),
      });

      return { checkInId, planId, guidance: parsed.guidance, criticalTasks: tasksWithIds, timeBlocks: parsed.timeBlocks };
    }),

  submitMidday: protectedProcedure
    .input(z.object({
      workedOn: z.string(),
      wasOnPlan: z.boolean(),
      interruptions: z.string().optional(),
      nextMove: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = getTodayDate();
      const plan = await getDailyPlan(ctx.user.id, date);
      const profile = await getUserProfile(ctx.user.id);
      const toneMap = { gentle: "warm but honest", direct: "calm and direct", firm: "concise and firm" };
      const tone = toneMap[profile?.tonePreference ?? "direct"];

      const planContext = plan ? `Today's plan had tasks: ${plan.criticalTasks}` : "No morning plan was set.";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a calm productivity assistant. Tone: ${tone}. 
Never shame the user. Never use urgency language. Keep responses to 2-3 sentences.
Return JSON only.`,
          },
          {
            role: "user",
            content: `Midday check-in. ${planContext}
User worked on: "${input.workedOn}"
Was it on plan: ${input.wasOnPlan}
Interruptions: "${input.interruptions ?? "none"}"
Next move: "${input.nextMove ?? "not specified"}"

Determine alignment status (aligned/recovering/redirect) and write a 2-3 sentence response.
Return JSON: { alignmentStatus: "aligned"|"recovering"|"redirect", response: string, afternoonSuggestion: string }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "midday_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                alignmentStatus: { type: "string" },
                response: { type: "string" },
                afternoonSuggestion: { type: "string" },
              },
              required: ["alignmentStatus", "response", "afternoonSuggestion"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const parsed = JSON.parse(raw);

      const checkInId = await createCheckIn({
        userId: ctx.user.id,
        dailyPlanId: plan?.id,
        date,
        type: "midday",
        userInput: JSON.stringify(input),
        alignmentStatus: parsed.alignmentStatus as any,
        generatedResponse: parsed.response,
        interruptionsNoted: input.interruptions,
        completedAt: new Date(),
      });

      return { checkInId, ...parsed };
    }),

  submitEvening: protectedProcedure
    .input(z.object({
      whatMoved: z.string(),
      whatRemains: z.string(),
      whatLearned: z.string(),
      tomorrowFirst: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = getTodayDate();
      const plan = await getDailyPlan(ctx.user.id, date);
      const profile = await getUserProfile(ctx.user.id);
      const toneMap = { gentle: "warm and grounded", direct: "calm and direct", firm: "concise and firm" };
      const tone = toneMap[profile?.tonePreference ?? "direct"];

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a calm productivity assistant. Tone: ${tone}. 
Generate an evening closure summary and tomorrow brief. Never use motivational language or exclamation points.
Return JSON only.`,
          },
          {
            role: "user",
            content: `Evening closure.
What moved today: "${input.whatMoved}"
What remains: "${input.whatRemains}"
What was learned or decided: "${input.whatLearned}"
What goes first tomorrow: "${input.tomorrowFirst}"

Generate:
1. A 2-sentence progress summary
2. The tomorrow brief (2-3 sentences that will greet the user tomorrow morning)
3. 1-3 specific carryover tasks
4. Any patterns or insights worth noting

Return JSON: { summary: string, tomorrowBrief: string, carryoverTasks: string[], insights: string }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "evening_closure",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                tomorrowBrief: { type: "string" },
                carryoverTasks: { type: "array", items: { type: "string" } },
                insights: { type: "string" },
              },
              required: ["summary", "tomorrowBrief", "carryoverTasks", "insights"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const parsed = JSON.parse(raw);

      const checkInId = await createCheckIn({
        userId: ctx.user.id,
        dailyPlanId: plan?.id,
        date,
        type: "evening",
        userInput: JSON.stringify(input),
        generatedResponse: parsed.summary,
        extractedNextSteps: JSON.stringify(parsed.carryoverTasks),
        completedAt: new Date(),
      });

      // Store tomorrow brief in daily plan
      if (plan) {
        await updateDailyPlan(plan.id, ctx.user.id, {
          tomorrowBrief: parsed.tomorrowBrief,
          tomorrowBriefGeneratedAt: new Date(),
        });
      }

      return { checkInId, ...parsed };
    }),

  completeTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      date: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = input.date ?? getTodayDate();
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };

      const tasks = JSON.parse(plan.criticalTasks ?? "[]");
      const updated = tasks.map((t: any) =>
        t.id === input.taskId ? { ...t, done: true } : t
      );
      await updateDailyPlan(plan.id, ctx.user.id, { criticalTasks: JSON.stringify(updated) });

      const allDone = updated.every((t: any) => t.done);
      return { success: true, allTasksDone: allDone };
    }),
});
