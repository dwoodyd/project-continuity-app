/**
 * Intelligence Insights router — cross-project pattern detection and health scoring.
 * Two on-demand mutations (one LLM call each) + lightweight query procedures.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import {
  getActiveProjects,
  getProjects,
  getRecentCheckIns,
  getDistractionEventsByUser,
  getRecentDecisions,
  getRecentFocusSessions,
  getHealthScoresForUser,
  getHealthScoreForProject,
  upsertHealthScore,
  getActivePatternInsights,
  insertPatternInsight,
  dismissPatternInsight,
  clearOldPatternInsights,
  getFocusSessionsByProject,
  getDecisionsByProject,
  getProjectMemoryEvents,
} from "../db";

// ── Helpers ────────────────────────────────────────────────────────────────────
function daysSince(date: Date | null | undefined): number {
  if (!date) return 999;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Router ─────────────────────────────────────────────────────────────────────
export const intelligenceInsightsRouter = router({

  // ── Query: get cached health scores ────────────────────────────────────────
  getHealthScores: protectedProcedure.query(async ({ ctx }) => {
    return getHealthScoresForUser(ctx.user.id);
  }),

  // ── Query: get active (non-dismissed) pattern insights ─────────────────────
  getPatternInsights: protectedProcedure.query(async ({ ctx }) => {
    return getActivePatternInsights(ctx.user.id);
  }),

  // ── Mutation: dismiss a pattern insight ────────────────────────────────────
  dismissInsight: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await dismissPatternInsight(input.id, ctx.user.id);
      return { ok: true };
    }),

  // ── Mutation: score all active projects (1 LLM call total) ─────────────────
  scoreAllProjects: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
    const allProjects = await getActiveProjects(userId);
    if (allProjects.length === 0) return { scores: [] };

    // Gather per-project signals
    const projectData = await Promise.all(allProjects.map(async (p) => {
      const sessions = await getFocusSessionsByProject(userId, p.id, 10);
      const decisions = await getDecisionsByProject(userId, p.id, 5);
      const memoryEvents = await getProjectMemoryEvents(userId, p.id);

      // Compute raw metrics
      const lastTouched = p.lastTouchedAt ?? p.updatedAt ?? p.createdAt;
      const stalledDays = daysSince(lastTouched);
      // completionRate derived from focus sessions as a proxy (no tasks array on project)
      const completionRate = sessions.length > 0 ? Math.min(100, sessions.filter(s => s.wasCompleted).length * 20) : 0;
      const recentSessionCount = sessions.filter(s => daysSince(s.startedAt) <= 14).length;

      return {
        id: p.id,
        title: p.title,
        status: p.status,
        stalledDays,
        completionRate,
        recentSessionCount,
        decisionCount: decisions.length,
        memoryEventCount: memoryEvents.length,
        nextStep: p.nextStep ?? null,
        whyItMatters: p.whyItMatters ?? null,
      };
    }));

    // Single LLM call for all projects
    const prompt = `You are a project health analyst. For each project below, output a JSON array of health score objects.

Projects:
${JSON.stringify(projectData, null, 2)}

For each project return:
{
  "projectId": number,
  "score": number (0-100, where 100 = thriving, 0 = abandoned),
  "momentum": "rising" | "steady" | "fading" | "stalled",
  "riskLevel": "low" | "medium" | "high",
  "narrative": string (one sentence, max 15 words, plain language, no quotes)
}

Scoring guide:
- stalledDays > 14 → score drops significantly, riskLevel high
- stalledDays 7-14 → fading momentum, riskLevel medium
- stalledDays < 7 + recentSessions > 0 → rising or steady
- completionRate > 60 → positive signal
- No nextStep defined → riskLevel at least medium
- recentSessionCount = 0 in 14 days → stalled

Return ONLY a JSON array, no explanation.`;

    let scores: Array<{
      projectId: number;
      score: number;
      momentum: "rising" | "steady" | "fading" | "stalled";
      riskLevel: "low" | "medium" | "high";
      narrative: string;
    }> = [];

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a project health analyst. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      });
      const rawContent = response.choices?.[0]?.message?.content;
      const raw = typeof rawContent === "string" ? rawContent : "[]";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      scores = JSON.parse(cleaned);
    } catch {
      // Fallback: compute scores algorithmically without LLM
      scores = projectData.map(p => {
        let score = 70;
        if (p.stalledDays > 14) score -= 30;
        else if (p.stalledDays > 7) score -= 15;
        if (p.recentSessionCount === 0) score -= 10;
        if (p.completionRate > 60) score += 10;
        if (!p.nextStep) score -= 10;
        score = Math.max(0, Math.min(100, score));
        const momentum = p.stalledDays > 14 ? "stalled" : p.stalledDays > 7 ? "fading" : p.recentSessionCount > 2 ? "rising" : "steady";
        const riskLevel = p.stalledDays > 14 || !p.nextStep ? "high" : p.stalledDays > 7 ? "medium" : "low";
        return { projectId: p.id, score, momentum, riskLevel, narrative: "No AI narrative available." };
      });
    }

    // Persist scores
    const now = new Date();
    for (const s of scores) {
      const pd = projectData.find(p => p.id === s.projectId);
      if (!pd) continue;
      await upsertHealthScore({
        userId,
        projectId: s.projectId,
        score: s.score,
        momentum: s.momentum,
        riskLevel: s.riskLevel,
        narrative: s.narrative,
        completionRate: pd.completionRate,
        stalledDays: pd.stalledDays,
        lastActivityAt: pd.stalledDays < 999 ? new Date(Date.now() - pd.stalledDays * 86400000) : null,
        generatedAt: now,
      });
    }

    return { scores };
  }),

  // ── Mutation: detect cross-project patterns (1 LLM call) ───────────────────
  detectPatterns: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Gather signals from the last 30 days
    const [projects, checkIns, distractions, decisions, sessions] = await Promise.all([
      getActiveProjects(userId),
      getRecentCheckIns(userId, 30),
      getDistractionEventsByUser(userId, 60),
      getRecentDecisions(userId, 30),
      getRecentFocusSessions(userId, 30),
    ]);

    if (projects.length === 0) return { insights: [] };

    const context = {
      projectCount: projects.length,
      projects: projects.map(p => ({
        id: p.id,
        title: p.title,
        stalledDays: daysSince(p.lastTouchedAt ?? p.updatedAt),
        hasNextStep: !!p.nextStep,
      })),
      checkInCount: checkIns.length,
      recentCheckInTypes: checkIns.slice(0, 10).map(c => c.type),
      distractionCategories: distractions.slice(0, 30).map(d => d.category),
      decisionCount: decisions.length,
      recentDecisions: decisions.slice(0, 10).map(d => ({ content: d.content, projectId: d.projectId })),
      focusSessionCount: sessions.length,
      sessionDurations: sessions.slice(0, 10).map(s => s.durationSeconds),
    };

    const prompt = `You are a productivity pattern analyst reviewing 30 days of work data. Identify 2-4 meaningful cross-project patterns.

Data:
${JSON.stringify(context, null, 2)}

Return a JSON array of insight objects:
{
  "type": "distraction_pattern" | "stall_pattern" | "decision_debt" | "capacity_mismatch" | "momentum_drop" | "cross_project_conflict" | "positive_pattern",
  "title": string (max 8 words, plain language),
  "body": string (2-3 sentences, actionable, non-judgmental, calm tone),
  "affectedProjectIds": number[] (project IDs from the data, empty array if cross-cutting),
  "severity": "info" | "warning" | "critical"
}

Rules:
- Only surface patterns that are genuinely actionable
- Prefer "positive_pattern" if there is clear momentum or consistency
- "critical" severity only for clear stall risk (7+ days no activity on primary project)
- Keep body text calm and supportive, not alarming
- Return ONLY a JSON array, no explanation`;

    let insights: Array<{
      type: "distraction_pattern" | "stall_pattern" | "decision_debt" | "capacity_mismatch" | "momentum_drop" | "cross_project_conflict" | "positive_pattern";
      title: string;
      body: string;
      affectedProjectIds: number[];
      severity: "info" | "warning" | "critical";
    }> = [];

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a productivity pattern analyst. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      });
      const rawContent2 = response.choices?.[0]?.message?.content;
      const raw = typeof rawContent2 === "string" ? rawContent2 : "[]";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch {
      insights = [];
    }

    // Clear old insights and persist new ones
    await clearOldPatternInsights(userId);
    const now = new Date();
    const savedIds: number[] = [];
    for (const ins of insights.slice(0, 5)) {
      const id = await insertPatternInsight({
        userId,
        type: ins.type,
        title: ins.title,
        body: ins.body,
        affectedProjectIds: ins.affectedProjectIds ?? [],
        severity: ins.severity,
        generatedAt: now,
      });
      savedIds.push(id);
    }

    return { insights, count: savedIds.length };
  }),
});
