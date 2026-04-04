/**
 * Weekly Digest — Monday morning summary
 *
 * Compiles a rich summary of last week's activity and sends it via the
 * Manus notification system. Runs automatically every Monday at 8:00 AM
 * (server local time). Can also be triggered manually via the tRPC procedure.
 */
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import {
  dailyPlans,
  claritySessions,
  projects,
  users,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface WeeklyDigestData {
  weekLabel: string;
  completedTaskCount: number;
  checkInDays: number;
  topProjects: string[];
  claritySessionCount: number;
  topClarityInsight: string | null;
  activeProjectCount: number;
  streakAtEndOfWeek: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLastWeekRange(): { start: string; end: string; label: string } {
  const now = new Date();
  // Last Monday
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const daysToLastMonday = day === 0 ? 6 : day - 1;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysToLastMonday - 7);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const label = `${lastMonday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${lastSunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  return { start: fmt(lastMonday), end: fmt(lastSunday), label };
}

// ── Core digest builder ───────────────────────────────────────────────────────
export async function buildWeeklyDigest(userId: number): Promise<WeeklyDigestData | null> {
  const db = await getDb();
  if (!db) return null;

  const { start, end, label } = getLastWeekRange();

  // Daily plans in the last week
  const plans = await db
    .select()
    .from(dailyPlans)
    .where(
      and(
        eq(dailyPlans.userId, userId),
        gte(dailyPlans.date, start),
        lte(dailyPlans.date, end)
      )
    );

  // Count completed tasks across all plans
  let completedTaskCount = 0;
  const projectTaskCounts: Record<number, number> = {};
  for (const plan of plans) {
    try {
      const tasks: { done?: boolean; projectId?: number | null }[] = JSON.parse(plan.criticalTasks ?? "[]");
      for (const t of tasks) {
        if (t.done) {
          completedTaskCount++;
          if (t.projectId) {
            projectTaskCounts[t.projectId] = (projectTaskCounts[t.projectId] ?? 0) + 1;
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Clarity sessions last week
  const sessions = await db
    .select({ id: claritySessions.id, signalLine: claritySessions.signalLine, nextRightStep: claritySessions.nextRightStep })
    .from(claritySessions)
    .where(
      and(
        eq(claritySessions.userId, userId),
        gte(claritySessions.createdAt, new Date(start + "T00:00:00Z")),
        lte(claritySessions.createdAt, new Date(end + "T23:59:59Z"))
      )
    )
    .orderBy(desc(claritySessions.createdAt));

  // Top insight: first session's signal line
  const topClarityInsight = sessions[0]?.signalLine ?? sessions[0]?.nextRightStep ?? null;

  // Active projects
  const activeProjects = await db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.status, "active")));

  // Top projects by task count
  const topProjectIds = Object.entries(projectTaskCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => Number(id));
  const topProjects = topProjectIds
    .map((id) => activeProjects.find((p) => p.id === id)?.title)
    .filter(Boolean) as string[];

  return {
    weekLabel: label,
    completedTaskCount,
    checkInDays: plans.length,
    topProjects,
    claritySessionCount: sessions.length,
    topClarityInsight,
    activeProjectCount: activeProjects.length,
    streakAtEndOfWeek: plans.length, // simplified: days with plans last week
  };
}

// ── Notification formatter ────────────────────────────────────────────────────
export function formatDigestNotification(data: WeeklyDigestData): { title: string; content: string } {
  const lines: string[] = [];

  lines.push(`Week of ${data.weekLabel}`);
  lines.push("");

  if (data.checkInDays > 0) {
    lines.push(`You showed up ${data.checkInDays} day${data.checkInDays !== 1 ? "s" : ""} last week.`);
  } else {
    lines.push("You had a quiet week. That's okay — you're still here.");
  }

  if (data.completedTaskCount > 0) {
    lines.push(`${data.completedTaskCount} task${data.completedTaskCount !== 1 ? "s" : ""} completed.`);
  }

  if (data.topProjects.length > 0) {
    lines.push(`Most active: ${data.topProjects.join(", ")}.`);
  }

  if (data.claritySessionCount > 0) {
    lines.push(`${data.claritySessionCount} Clarity Engine session${data.claritySessionCount !== 1 ? "s" : ""} run.`);
    if (data.topClarityInsight) {
      lines.push(`Top insight: "${data.topClarityInsight}"`);
    }
  }

  lines.push("");
  lines.push(`${data.activeProjectCount} active project${data.activeProjectCount !== 1 ? "s" : ""} heading into this week.`);

  return {
    title: `Weekly Digest — ${data.weekLabel}`,
    content: lines.join("\n"),
  };
}

// ── Owner digest sender ───────────────────────────────────────────────────────
export async function sendWeeklyDigestForOwner(userId: number): Promise<boolean> {
  try {
    const data = await buildWeeklyDigest(userId);
    if (!data) return false;
    const { title, content } = formatDigestNotification(data);
    return await notifyOwner({ title, content });
  } catch (err) {
    console.error("[WeeklyDigest] Error building/sending digest:", err);
    return false;
  }
}

// ── Cron runner ───────────────────────────────────────────────────────────────
let digestCronHandle: ReturnType<typeof setInterval> | null = null;

export function startWeeklyDigestCron(ownerUserId: number): void {
  if (digestCronHandle) return;
  console.log("[WeeklyDigest] Digest cron started — checks every hour for Monday 8 AM");

  const checkAndSend = async () => {
    const now = new Date();
    // Monday = 1, 8 AM
    if (now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() < 60) {
      // Check if we already sent today (use a simple in-memory flag)
      const todayKey = now.toISOString().slice(0, 10);
      if ((checkAndSend as any)._lastSentDate !== todayKey) {
        (checkAndSend as any)._lastSentDate = todayKey;
        console.log("[WeeklyDigest] Sending Monday morning digest...");
        await sendWeeklyDigestForOwner(ownerUserId);
      }
    }
  };

  // Check every hour
  digestCronHandle = setInterval(() => {
    checkAndSend().catch(console.error);
  }, 60 * 60 * 1000);

  // Also check immediately on startup
  checkAndSend().catch(console.error);
}

export function stopWeeklyDigestCron(): void {
  if (digestCronHandle) {
    clearInterval(digestCronHandle);
    digestCronHandle = null;
  }
}
