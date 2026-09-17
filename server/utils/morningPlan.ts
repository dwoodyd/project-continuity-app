export type MorningPlanTask = {
  title: string;
  projectId: number | null;
  carryoverCount: number;
};

export type MorningPlanTimeBlock = {
  label: string;
  duration: string;
};

export type MorningPlanPayload = {
  guidance: string;
  divergenceNote: string | null;
  criticalTasks: MorningPlanTask[];
  timeBlocks: MorningPlanTimeBlock[];
};

export const FALLBACK_MORNING_GUIDANCE = "Your plan is held. Begin with the next clear step when you are ready.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPayload(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(raw) ? raw : {};
}

/**
 * Keeps morning check-ins durable when an LLM response is incomplete or malformed.
 * Generated copy is optional assistance; the member's check-in must still save.
 */
export function normalizeMorningPlanPayload(raw: unknown): MorningPlanPayload {
  const payload = asPayload(raw);
  const criticalTasks = Array.isArray(payload.criticalTasks)
    ? payload.criticalTasks.flatMap((value): MorningPlanTask[] => {
        if (!isRecord(value) || typeof value.title !== "string" || !value.title.trim()) return [];
        return [{
          title: value.title.trim(),
          projectId: typeof value.projectId === "number" ? value.projectId : null,
          carryoverCount: typeof value.carryoverCount === "number" && Number.isFinite(value.carryoverCount)
            ? Math.max(0, value.carryoverCount)
            : 0,
        }];
      })
    : [];
  const timeBlocks = Array.isArray(payload.timeBlocks)
    ? payload.timeBlocks.flatMap((value): MorningPlanTimeBlock[] => {
        if (!isRecord(value) || typeof value.label !== "string" || typeof value.duration !== "string") return [];
        if (!value.label.trim() || !value.duration.trim()) return [];
        return [{ label: value.label.trim(), duration: value.duration.trim() }];
      })
    : [];

  return {
    guidance: typeof payload.guidance === "string" && payload.guidance.trim()
      ? payload.guidance.trim()
      : FALLBACK_MORNING_GUIDANCE,
    divergenceNote: typeof payload.divergenceNote === "string" && payload.divergenceNote.trim()
      ? payload.divergenceNote.trim()
      : null,
    criticalTasks,
    timeBlocks,
  };
}
