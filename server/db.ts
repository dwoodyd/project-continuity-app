import { and, desc, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { drizzle } from "drizzle-orm/mysql2";
import {
  CheckIn,
  DailyPlan,
  IdeaCapture,
  InsertCheckIn,
  InsertDailyPlan,
  InsertIdeaCapture,
  InsertProject,
  InsertReEntryCard,
  InsertSourceItem,
  InsertUser,
  InsertUserProfile,
  InsertWeeklyReview,
  Project,
  ReEntryCard,
  SourceItem,
  UserProfile,
  WeeklyReview,
  checkIns,
  dailyPlans,
  ideaCaptures,
  projects,
  reEntryCards,
  sourceItems,
  userProfiles,
  users,
  weeklyReviews,
  focusSessions,
  distractionEvents,
  projectMemoryEvents,
  weeklyCompass,
  decisions,
  DistractionEvent,
  InsertDistractionEvent,
  InsertProjectMemoryEvent,
  ProjectMemoryEvent,
  WeeklyCompass,
  InsertWeeklyCompass,
  Decision,
  InsertDecision,
  FocusSession,
  pushSubscriptions,
  notificationLog,
  projectHealthScores,
  patternInsights,
  ProjectHealthScore,
  InsertProjectHealthScore,
  PatternInsight,
  InsertPatternInsight,
  betaInvites,
  BetaInvite,
  InsertBetaInvite,
  revokedSessions,
  RevokedSession,
  InsertRevokedSession,
  firstMovableSteps,
  FirstMovableStep,
  InsertFirstMovableStep,
  thresholdDiagnoses,
  ThresholdDiagnosis,
  InsertThresholdDiagnosis,
  evidenceLogSummaries,
  EvidenceLogSummary,
  InsertEvidenceLogSummary,
  feedbackSubmissions,
  FeedbackSubmission,
  InsertFeedbackSubmission,
  scratchNotes,
  ScratchNote,
  InsertScratchNote,
  waitlistRequests,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function markWelcomeNotified(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ welcomeNotified: true }).where(eq(users.id, userId));
}

export async function setUserInviteCode(userId: number, code: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ inviteCode: code }).where(eq(users.id, userId));
}

// ─── User Profiles ────────────────────────────────────────────────────────────
export async function getUserProfile(userId: number): Promise<UserProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function upsertUserProfile(profile: InsertUserProfile): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(userProfiles).values(profile).onDuplicateKeyUpdate({ set: profile });
}

export async function updateUserProfile(userId: number, updates: Partial<InsertUserProfile>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(userProfiles).set(updates).where(eq(userProfiles.userId, userId));
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export async function getProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects)
    .where(and(eq(projects.userId, userId), ne(projects.status, "archived")))
    .orderBy(desc(projects.updatedAt));
}

export async function getActiveProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.status, "active")))
    .orderBy(desc(projects.lastTouchedAt));
}

export async function getProjectById(id: number, userId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1);
  return result[0];
}

export async function createProject(project: InsertProject): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(project);
  return (result[0] as any).insertId;
}

export async function updateProject(id: number, userId: number, updates: Partial<InsertProject>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set({ ...updates, lastTouchedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function getColdProjects(userId: number, thresholdDays: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  return db.select().from(projects)
    .where(and(
      eq(projects.userId, userId),
      eq(projects.status, "active"),
      lte(projects.lastTouchedAt, cutoff)
    ));
}

// ─── Source Items ─────────────────────────────────────────────────────────────
export async function getSourceItems(userId: number): Promise<SourceItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceItems)
    .where(eq(sourceItems.userId, userId))
    .orderBy(desc(sourceItems.createdAt));
}

export async function getSourceItemsByState(userId: number, state: SourceItem["state"]): Promise<SourceItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceItems)
    .where(and(eq(sourceItems.userId, userId), eq(sourceItems.state, state)))
    .orderBy(desc(sourceItems.createdAt));
}

export async function getSourceItemById(id: number, userId: number): Promise<SourceItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sourceItems)
    .where(and(eq(sourceItems.id, id), eq(sourceItems.userId, userId))).limit(1);
  return result[0];
}

export async function createSourceItem(item: InsertSourceItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sourceItems).values(item);
  return (result[0] as any).insertId;
}

export async function updateSourceItem(id: number, userId: number, updates: Partial<InsertSourceItem>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(sourceItems).set(updates)
    .where(and(eq(sourceItems.id, id), eq(sourceItems.userId, userId)));
}

export async function batchUpdateSourceItemsState(
  ids: number[],
  userId: number,
  state: SourceItem["state"]
): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  if (!db) return;
  await db.update(sourceItems)
    .set({ state })
    .where(and(eq(sourceItems.userId, userId), sql`${sourceItems.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`));
}

// ─── Daily Plans ──────────────────────────────────────────────────────────────
export async function getDailyPlan(userId: number, date: string): Promise<DailyPlan | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, date))).limit(1);
  return result[0];
}

export async function getRecentDailyPlans(userId: number, limit = 7): Promise<DailyPlan[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyPlans)
    .where(eq(dailyPlans.userId, userId))
    .orderBy(desc(dailyPlans.date))
    .limit(limit);
}

export async function upsertDailyPlan(plan: InsertDailyPlan): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getDailyPlan(plan.userId, plan.date!);
  if (existing) {
    await db.update(dailyPlans).set(plan).where(eq(dailyPlans.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(dailyPlans).values(plan);
  return (result[0] as any).insertId;
}

export async function updateDailyPlan(id: number, userId: number, updates: Partial<InsertDailyPlan>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(dailyPlans).set(updates)
    .where(and(eq(dailyPlans.id, id), eq(dailyPlans.userId, userId)));
}

// ─── Check-Ins ────────────────────────────────────────────────────────────────
export async function getCheckIns(userId: number, date: string): Promise<CheckIn[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checkIns)
    .where(and(eq(checkIns.userId, userId), eq(checkIns.date, date)))
    .orderBy(checkIns.createdAt);
}

export async function getRecentCheckIns(userId: number, limit = 14): Promise<CheckIn[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.createdAt))
    .limit(limit);
}

export async function createCheckIn(checkIn: InsertCheckIn): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(checkIns).values(checkIn);
  return (result[0] as any).insertId;
}

export async function updateCheckIn(id: number, userId: number, updates: Partial<InsertCheckIn>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(checkIns).set(updates)
    .where(and(eq(checkIns.id, id), eq(checkIns.userId, userId)));
}

// ─── Idea Captures ────────────────────────────────────────────────────────────
export async function getIdeaCaptures(userId: number): Promise<IdeaCapture[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ideaCaptures)
    .where(and(eq(ideaCaptures.userId, userId), eq(ideaCaptures.resolvedStatus, false)))
    .orderBy(desc(ideaCaptures.createdAt));
}

export async function createIdeaCapture(idea: InsertIdeaCapture): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ideaCaptures).values(idea);
  return (result[0] as any).insertId;
}

export async function updateIdeaCapture(id: number, userId: number, updates: Partial<InsertIdeaCapture>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(ideaCaptures).set(updates)
    .where(and(eq(ideaCaptures.id, id), eq(ideaCaptures.userId, userId)));
}

// ─── Weekly Reviews ───────────────────────────────────────────────────────────
export async function getWeeklyReview(userId: number, weekStartDate: string): Promise<WeeklyReview | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeklyReviews)
    .where(and(eq(weeklyReviews.userId, userId), eq(weeklyReviews.weekStartDate, weekStartDate))).limit(1);
  return result[0];
}

export async function upsertWeeklyReview(review: InsertWeeklyReview): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getWeeklyReview(review.userId, review.weekStartDate);
  if (existing) {
    await db.update(weeklyReviews).set(review).where(eq(weeklyReviews.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(weeklyReviews).values(review);
  return (result[0] as any).insertId;
}

// ─── Re-Entry Cards ───────────────────────────────────────────────────────────
export async function getLatestReEntryCard(userId: number, projectId: number): Promise<ReEntryCard | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reEntryCards)
    .where(and(eq(reEntryCards.userId, userId), eq(reEntryCards.projectId, projectId)))
    .orderBy(desc(reEntryCards.generatedAt)).limit(1);
  return result[0];
}

export async function createReEntryCard(card: InsertReEntryCard): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reEntryCards).values(card);
  return (result[0] as any).insertId;
}

export async function acknowledgeReEntryCard(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(reEntryCards).set({ acknowledgedAt: new Date() })
    .where(and(eq(reEntryCards.id, id), eq(reEntryCards.userId, userId)));
}

// ─── Weekly Check-In Presence ─────────────────────────────────────────────────
export async function getWeeklyCheckInPresence(userId: number): Promise<{ date: string; hasCheckIn: boolean }[]> {
  const db = await getDb();
  if (!db) return [];
  // Build last 7 days as YYYY-MM-DD strings
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const results = await db
    .select({ date: checkIns.date })
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), gte(checkIns.date, days[0]!)));
  const datesWithCheckIn = new Set(results.map((r) => r.date));
  return days.map((date) => ({ date, hasCheckIn: datesWithCheckIn.has(date) }));
}

export async function getWeeklyThreadData(userId: number, daysBack = 7): Promise<{ date: string; morning: boolean; midday: boolean; evening: boolean; strength: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const days: string[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const results = await db.select({ date: checkIns.date, type: checkIns.type })
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), gte(checkIns.date, days[0]!)));
  return days.map((date) => {
    const dayRows = results.filter((r) => r.date === date);
    const morning = dayRows.some((r) => r.type === "morning");
    const midday = dayRows.some((r) => r.type === "midday");
    const evening = dayRows.some((r) => r.type === "evening");
    const strength = Math.round(((morning ? 1 : 0) + (midday ? 1 : 0) + (evening ? 1 : 0)) / 3 * 100);
    return { date, morning, midday, evening, strength };
  });
}

// ── Heatmap ──────────────────────────────────────────────────────────────────
/**
 * Returns 365 days of daily activity data for the luxury heatmap.
 * Each day: date, checkInCount (0-3), focusSessionCount.
 * Activity level 0-4 for rendering intensity.
 */
export async function getHeatmapData(
  userId: number
): Promise<{ date: string; checkInCount: number; focusCount: number; level: 0 | 1 | 2 | 3 | 4 }[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const [checkInRows, sessionRows] = await Promise.all([
    db.select({ date: checkIns.date, type: checkIns.type })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), gte(checkIns.date, cutoffStr))),
    db.select({ startedAt: focusSessions.startedAt })
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, userId), gte(focusSessions.startedAt, cutoff))),
  ]);

  // Build date map
  const byDate: Record<string, { checkInCount: number; focusCount: number }> = {};
  for (const row of checkInRows) {
    byDate[row.date] = byDate[row.date] ?? { checkInCount: 0, focusCount: 0 };
    byDate[row.date]!.checkInCount++;
  }
  for (const row of sessionRows) {
    const d = row.startedAt.toISOString().slice(0, 10);
    byDate[d] = byDate[d] ?? { checkInCount: 0, focusCount: 0 };
    byDate[d]!.focusCount++;
  }

  // Build 365-day array
  const result: { date: string; checkInCount: number; focusCount: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = byDate[dateStr] ?? { checkInCount: 0, focusCount: 0 };
    const total = entry.checkInCount + entry.focusCount;
    const level: 0 | 1 | 2 | 3 | 4 =
      total === 0 ? 0 :
      total === 1 ? 1 :
      total <= 3 ? 2 :
      total <= 5 ? 3 : 4;
    result.push({ date: dateStr, ...entry, level });
  }
  return result;
}

// ── Focus Sessions ────────────────────────────────────────────────────────────
export async function getFocusSessionsByProject(userId: number, projectId: number, limit = 10): Promise<FocusSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(focusSessions)
    .where(and(eq(focusSessions.userId, userId), eq(focusSessions.projectId, projectId)))
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit);
}

export async function getRecentFocusSessions(userId: number, limit = 20): Promise<FocusSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(focusSessions)
    .where(eq(focusSessions.userId, userId))
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit);
}

export async function saveFocusSession(session: {
  userId: number;
  projectId?: number | null;
  intention: string;
  startedAt: Date;
  durationSeconds: number;
  completedAt?: Date | null;
  notes?: string | null;
  wasCompleted: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(focusSessions).values({
    userId: session.userId,
    projectId: session.projectId ?? null,
    intention: session.intention,
    startedAt: session.startedAt,
    durationSeconds: session.durationSeconds,
    completedAt: session.completedAt ?? null,
    notes: session.notes ?? null,
    wasCompleted: session.wasCompleted ? 1 : 0,
  });
  return (result as any).insertId ?? 0;
}

// ── Distraction Events ────────────────────────────────────────────────────────
export async function createDistractionEvent(event: InsertDistractionEvent): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(distractionEvents).values(event);
  return (result as any).insertId ?? 0;
}

export async function getDistractionEventsByUser(userId: number, limit = 50): Promise<DistractionEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(distractionEvents)
    .where(eq(distractionEvents.userId, userId))
    .orderBy(desc(distractionEvents.date))
    .limit(limit);
}

export async function getDistractionWeeklyAggregates(userId: number): Promise<{
  topCategory: string | null;
  topTimeOfDay: string | null;
  topProjectId: number | null;
  totalEvents: number;
}> {
  const db = await getDb();
  if (!db) return { topCategory: null, topTimeOfDay: null, topProjectId: null, totalEvents: 0 };
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const events = await db.select().from(distractionEvents)
    .where(and(eq(distractionEvents.userId, userId), gte(distractionEvents.date, sevenDaysAgo)));
  if (!events.length) return { topCategory: null, topTimeOfDay: null, topProjectId: null, totalEvents: 0 };
  const catCount: Record<string, number> = {};
  const todCount: Record<string, number> = {};
  const projCount: Record<number, number> = {};
  for (const e of events) {
    catCount[e.category] = (catCount[e.category] ?? 0) + 1;
    todCount[e.timeOfDay] = (todCount[e.timeOfDay] ?? 0) + 1;
    if (e.projectId) projCount[e.projectId] = (projCount[e.projectId] ?? 0) + 1;
  }
  const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topTimeOfDay = Object.entries(todCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topProjectId = Object.entries(projCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    topCategory,
    topTimeOfDay,
    topProjectId: topProjectId ? Number(topProjectId) : null,
    totalEvents: events.length,
  };
}

// ── Project Memory Events ─────────────────────────────────────────────────────
export async function createProjectMemoryEvent(event: InsertProjectMemoryEvent): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(projectMemoryEvents).values(event);
  return (result as any).insertId ?? 0;
}

export async function batchCreateProjectMemoryEvents(events: InsertProjectMemoryEvent[]): Promise<void> {
  if (events.length === 0) return;
  const db = await getDb();
  if (!db) return;
  await db.insert(projectMemoryEvents).values(events);
}

export async function getProjectMemoryEvents(userId: number, projectId: number): Promise<ProjectMemoryEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectMemoryEvents)
    .where(and(eq(projectMemoryEvents.userId, userId), eq(projectMemoryEvents.projectId, projectId)))
    .orderBy(desc(projectMemoryEvents.occurredAt))
    .limit(100);
}

export async function getLastDecisionForProject(userId: number, projectId: number): Promise<ProjectMemoryEvent | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectMemoryEvents)
    .where(and(
      eq(projectMemoryEvents.userId, userId),
      eq(projectMemoryEvents.projectId, projectId),
      eq(projectMemoryEvents.eventType, "decision"),
    ))
    .orderBy(desc(projectMemoryEvents.occurredAt))
    .limit(1);
  return result[0];
}

// ── Weekly Compass ────────────────────────────────────────────────────────────
export async function getWeeklyCompass(userId: number, weekStart: Date): Promise<WeeklyCompass | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeklyCompass)
    .where(and(eq(weeklyCompass.userId, userId), eq(weeklyCompass.weekStart, weekStart)))
    .limit(1);
  return result[0];
}

export async function getLatestWeeklyCompass(userId: number): Promise<WeeklyCompass | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeklyCompass)
    .where(eq(weeklyCompass.userId, userId))
    .orderBy(desc(weeklyCompass.weekStart))
    .limit(1);
  return result[0];
}

export async function upsertWeeklyCompass(data: InsertWeeklyCompass): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const existing = await getWeeklyCompass(data.userId, data.weekStart);
  if (existing) {
    await db.update(weeklyCompass)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(weeklyCompass.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(weeklyCompass).values(data);
  return (result as any).insertId ?? 0;
}

// ── Decisions ─────────────────────────────────────────────────────────────────
export async function createDecision(decision: InsertDecision): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(decisions).values(decision);
  return (result as any).insertId ?? 0;
}

export async function getDecisionsByProject(userId: number, projectId: number, limit = 20): Promise<Decision[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(decisions)
    .where(and(eq(decisions.userId, userId), eq(decisions.projectId, projectId)))
    .orderBy(desc(decisions.date))
    .limit(limit);
}

export async function getRecentDecisions(userId: number, limit = 10): Promise<Decision[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(decisions)
    .where(eq(decisions.userId, userId))
    .orderBy(desc(decisions.date))
    .limit(limit);
}

// ── Push Subscriptions ────────────────────────────────────────────────────────
export async function upsertPushSubscription(data: {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete old subscription for this user+endpoint combo, then insert fresh
  await db.delete(pushSubscriptions).where(
    and(eq(pushSubscriptions.userId, data.userId), eq(pushSubscriptions.endpoint, data.endpoint))
  );
  await db.insert(pushSubscriptions).values(data);
}

export async function deletePushSubscription(userId: number, endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(
    and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint))
  );
}

export async function getPushSubscriptionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function getAllUsersWithPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  // Use raw SQL for distinct — Drizzle selectDistinct has a MySQL driver issue
  const result = await db.execute(sql`SELECT DISTINCT userId FROM push_subscriptions`);
  return (result[0] as unknown as Array<{ userId: number }>).map((r) => r.userId);
}

// ── Notification Log ──────────────────────────────────────────────────────────
export async function logNotificationSent(data: {
  userId: number;
  type: "morning" | "midday" | "evening" | "cold_project" | "sanctuary" | "thread_thinning" | "beta_expiry";
  projectId?: number;
  suppressedBy?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notificationLog).values(data);
}

export async function getRecentNotificationLog(
  userId: number,
  type: "morning" | "midday" | "evening" | "cold_project" | "sanctuary" | "thread_thinning" | "beta_expiry",
  sinceMs: number
): Promise<{ sentAt: Date }[]> {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - sinceMs);
  return db.select({ sentAt: notificationLog.sentAt })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.type, type),
        gte(notificationLog.sentAt, since)
      )
    )
    .orderBy(desc(notificationLog.sentAt))
    .limit(1);
}

// ─── Project Health Scores ────────────────────────────────────────────────────
export async function getHealthScoresForUser(userId: number): Promise<ProjectHealthScore[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectHealthScores)
    .where(eq(projectHealthScores.userId, userId))
    .orderBy(desc(projectHealthScores.generatedAt));
}

export async function getHealthScoreForProject(userId: number, projectId: number): Promise<ProjectHealthScore | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectHealthScores)
    .where(and(eq(projectHealthScores.userId, userId), eq(projectHealthScores.projectId, projectId)))
    .orderBy(desc(projectHealthScores.generatedAt))
    .limit(1);
  return result[0];
}

export async function upsertHealthScore(data: InsertProjectHealthScore): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete old score for this project first, then insert fresh
  await db.delete(projectHealthScores)
    .where(and(eq(projectHealthScores.userId, data.userId), eq(projectHealthScores.projectId, data.projectId!)));
  await db.insert(projectHealthScores).values(data);
}

// ─── Pattern Insights ─────────────────────────────────────────────────────────
export async function getActivePatternInsights(userId: number): Promise<PatternInsight[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(patternInsights)
    .where(and(
      eq(patternInsights.userId, userId),
      sql`${patternInsights.dismissedAt} IS NULL`
    ))
    .orderBy(desc(patternInsights.generatedAt))
    .limit(20);
}

export async function insertPatternInsight(data: InsertPatternInsight): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(patternInsights).values(data);
  return (result[0] as any).insertId;
}

export async function dismissPatternInsight(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(patternInsights)
    .set({ dismissedAt: new Date() })
    .where(and(eq(patternInsights.id, id), eq(patternInsights.userId, userId)));
}

export async function clearOldPatternInsights(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Remove insights older than 14 days
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  await db.delete(patternInsights)
    .where(and(eq(patternInsights.userId, userId), lte(patternInsights.generatedAt, cutoff)));
}

// ─── Account Deletion ─────────────────────────────────────────────────────────
import {
  frictionLogs,
  claritySessions,
} from "../drizzle/schema";

/**
 * Hard-delete all data owned by a user, then delete the user record itself.
 * Order matters: delete child rows before parent rows to avoid FK violations.
 */
export async function deleteAllUserData(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Leaf tables first (no FK children)
  await db.delete(notificationLog).where(eq(notificationLog.userId, userId));
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  await db.delete(frictionLogs).where(eq(frictionLogs.userId, userId));
  await db.delete(patternInsights).where(eq(patternInsights.userId, userId));
  await db.delete(projectHealthScores).where(eq(projectHealthScores.userId, userId));
  await db.delete(claritySessions).where(eq(claritySessions.userId, userId));
  await db.delete(distractionEvents).where(eq(distractionEvents.userId, userId));
  await db.delete(decisions).where(eq(decisions.userId, userId));
  await db.delete(projectMemoryEvents).where(eq(projectMemoryEvents.userId, userId));
  await db.delete(focusSessions).where(eq(focusSessions.userId, userId));
  await db.delete(weeklyCompass).where(eq(weeklyCompass.userId, userId));
  await db.delete(reEntryCards).where(eq(reEntryCards.userId, userId));
  await db.delete(weeklyReviews).where(eq(weeklyReviews.userId, userId));
  await db.delete(ideaCaptures).where(eq(ideaCaptures.userId, userId));
  await db.delete(checkIns).where(eq(checkIns.userId, userId));
  await db.delete(dailyPlans).where(eq(dailyPlans.userId, userId));
  await db.delete(sourceItems).where(eq(sourceItems.userId, userId));
  await db.delete(projects).where(eq(projects.userId, userId));
  // Parent tables last
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

// ─── Beta Invite Helpers ──────────────────────────────────────────────────────

export async function createInviteCode(
  createdByUserId: number,
  label?: string,
  expiresAt?: Date
): Promise<BetaInvite> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { randomBytes } = await import("crypto");
  // 12 random bytes → 24 hex chars, easy to read/share
  const code = randomBytes(12).toString("hex").toUpperCase();
  await db.insert(betaInvites).values({ code, createdByUserId, label, expiresAt });
  const [row] = await db
    .select()
    .from(betaInvites)
    .where(eq(betaInvites.code, code))
    .limit(1);
  return row;
}

export async function getInviteCodes(
  createdByUserId: number
): Promise<BetaInvite[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(betaInvites)
    .where(eq(betaInvites.createdByUserId, createdByUserId))
    .orderBy(desc(betaInvites.createdAt));
}

/**
 * Validates a code and returns it if it is valid and unused.
 * Returns null if the code does not exist or has already been used.
 */
export async function validateInviteCode(
  code: string
): Promise<BetaInvite | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(betaInvites)
    .where(eq(betaInvites.code, code.toUpperCase().trim()))
    .limit(1);
  if (!row || row.usedAt !== null) return null;
  // Reject expired codes
  if (row.expiresAt !== null && row.expiresAt < new Date()) return null;
  return row;
}

/**
 * Atomically marks an invite code as used by a specific user.
 * Returns false if the code was already used (race-condition guard).
 */
export async function markInviteUsed(
  code: string,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(betaInvites)
    .set({ usedByUserId: userId, usedAt: new Date() })
    .where(
      and(
        eq(betaInvites.code, code.toUpperCase().trim()),
        isNull(betaInvites.usedAt)
      )
    );
  // affectedRows === 1 means we won the race; 0 means already used
  return (result as any)[0]?.affectedRows === 1;
}

// ─── Session Revocation Helpers ───────────────────────────────────────────────

/**
 * Records a JWT jti as revoked. expiresAt should match the token's exp claim
 * so that a background job can prune old rows without breaking active sessions.
 */
export async function revokeSession(
  jti: string,
  userId: number,
  expiresAt: Date
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // INSERT IGNORE: if the jti is already revoked, silently skip
  await db
    .insert(revokedSessions)
    .values({ jti, userId, expiresAt })
    .onDuplicateKeyUpdate({ set: { revokedAt: new Date() } });
}

/**
 * Returns true if the given jti has been revoked.
 * Called on every authenticated request.
 */
export async function isSessionRevoked(jti: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [row] = await db
    .select({ id: revokedSessions.id })
    .from(revokedSessions)
    .where(eq(revokedSessions.jti, jti))
    .limit(1);
  return !!row;
}

// ─── First Movable Steps ──────────────────────────────────────────────────────

export async function createFirstMovableStep(
  data: InsertFirstMovableStep
): Promise<FirstMovableStep> {
  const db = await getDb();
  const [result] = await db!.insert(firstMovableSteps).values(data);
  const [row] = await db!
    .select()
    .from(firstMovableSteps)
    .where(eq(firstMovableSteps.id, (result as any).insertId))
    .limit(1);
  return row;
}

export async function markFirstMovableStepUsed(
  id: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  await db!
    .update(firstMovableSteps)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(firstMovableSteps.id, id),
        eq(firstMovableSteps.userId, userId)
      )
    );
}

export async function getRecentFirstMovableSteps(
  userId: number,
  limit = 10
): Promise<FirstMovableStep[]> {
  const db = await getDb();
  return db!
    .select()
    .from(firstMovableSteps)
    .where(eq(firstMovableSteps.userId, userId))
    .orderBy(desc(firstMovableSteps.createdAt))
    .limit(limit);
}

// ─── Threshold Diagnoses ──────────────────────────────────────────────────────

export async function createThresholdDiagnosis(
  data: InsertThresholdDiagnosis
): Promise<ThresholdDiagnosis> {
  const db = await getDb();
  const [result] = await db!.insert(thresholdDiagnoses).values(data);
  const [row] = await db!
    .select()
    .from(thresholdDiagnoses)
    .where(eq(thresholdDiagnoses.id, (result as any).insertId))
    .limit(1);
  return row;
}

export async function getRecentThresholdDiagnoses(
  userId: number,
  limit = 10
): Promise<ThresholdDiagnosis[]> {
  const db = await getDb();
  return db!
    .select()
    .from(thresholdDiagnoses)
    .where(eq(thresholdDiagnoses.userId, userId))
    .orderBy(desc(thresholdDiagnoses.createdAt))
    .limit(limit);
}

// ─── Evidence Log Summaries ───────────────────────────────────────────────────
export async function upsertEvidenceSummary(
  data: InsertEvidenceLogSummary
): Promise<EvidenceLogSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Try update first
  const existing = await db
    .select()
    .from(evidenceLogSummaries)
    .where(
      and(
        eq(evidenceLogSummaries.userId, data.userId),
        eq(evidenceLogSummaries.month, data.month!)
      )
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(evidenceLogSummaries)
      .set({ ...data, generatedAt: new Date() })
      .where(eq(evidenceLogSummaries.id, existing[0].id));
    const [updated] = await db
      .select()
      .from(evidenceLogSummaries)
      .where(eq(evidenceLogSummaries.id, existing[0].id))
      .limit(1);
    return updated;
  }
  const result = await db.insert(evidenceLogSummaries).values(data);
  const [row] = await db
    .select()
    .from(evidenceLogSummaries)
    .where(eq(evidenceLogSummaries.id, (result[0] as any).insertId))
    .limit(1);
  return row;
}

export async function getEvidenceSummaries(
  userId: number,
  limit = 6
): Promise<EvidenceLogSummary[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(evidenceLogSummaries)
    .where(eq(evidenceLogSummaries.userId, userId))
    .orderBy(desc(evidenceLogSummaries.month))
    .limit(limit);
}

export async function getEvidenceSummaryForMonth(
  userId: number,
  month: string
): Promise<EvidenceLogSummary | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(evidenceLogSummaries)
    .where(
      and(
        eq(evidenceLogSummaries.userId, userId),
        eq(evidenceLogSummaries.month, month)
      )
    )
    .limit(1);
  return result[0];
}

// Evidence streak data: returns focus sessions for the last 30 days
export async function getEvidenceStreakData(
  userId: number
): Promise<{ date: string; sessionsCount: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sessions = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.startedAt, cutoff)
      )
    )
    .orderBy(focusSessions.startedAt);

  // Group by date
  const byDate: Record<string, number> = {};
  for (const s of sessions) {
    const d = s.startedAt.toISOString().slice(0, 10);
    byDate[d] = (byDate[d] ?? 0) + 1;
  }
  return Object.entries(byDate).map(([date, sessionsCount]) => ({ date, sessionsCount }));
}

// ── Streak ────────────────────────────────────────────────────────────────────
/** Returns the current consecutive-days streak based on daily plans. */
export async function getStreak(userId: number): Promise<{ streak: number; longestStreak: number }> {
  const db = await getDb();
  if (!db) return { streak: 0, longestStreak: 0 };
  const rows = await db
    .select({ date: dailyPlans.date })
    .from(dailyPlans)
    .where(eq(dailyPlans.userId, userId))
    .orderBy(desc(dailyPlans.date))
    .limit(365);
  if (rows.length === 0) return { streak: 0, longestStreak: 0 };
  const dates = new Set(rows.map((r) => r.date));
  // Current streak: count consecutive days ending today or yesterday
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  // Longest streak over all history
  const sorted = Array.from(dates).sort();
  let longest = 0, current = 0;
  let prev: Date | null = null;
  for (const d of sorted) {
    const dt = new Date(d);
    if (prev) {
      const diff = (dt.getTime() - prev.getTime()) / 86400000;
      current = diff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    if (current > longest) longest = current;
    prev = dt;
  }
  return { streak, longestStreak: longest };
}



// ─── Member Count ─────────────────────────────────────────────────────────────
export async function getMemberCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users);
  return Number(result[0]?.count ?? 0);
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export async function insertFeedback(data: InsertFeedbackSubmission): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(feedbackSubmissions).values(data);
}

export async function getFeedbackList(limit = 100): Promise<FeedbackSubmission[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feedbackSubmissions).orderBy(desc(feedbackSubmissions.createdAt)).limit(limit);
}

export async function resolveFeedback(id: number, resolved: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(feedbackSubmissions)
    .set({ resolved, resolvedAt: resolved ? new Date() : null })
    .where(eq(feedbackSubmissions.id, id));
}

// ─── Scratch Pad ──────────────────────────────────────────────────────────────
export async function getScratchNotes(userId: number): Promise<ScratchNote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scratchNotes).where(eq(scratchNotes.userId, userId)).orderBy(desc(scratchNotes.pinned), desc(scratchNotes.updatedAt));
}

export async function createScratchNote(data: Omit<InsertScratchNote, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(scratchNotes).values(data);
  return (result[0] as any).insertId ?? 0;
}

export async function updateScratchNote(id: number, userId: number, content: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(scratchNotes).set({ content }).where(and(eq(scratchNotes.id, id), eq(scratchNotes.userId, userId)));
}

export async function deleteScratchNote(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(scratchNotes).where(and(eq(scratchNotes.id, id), eq(scratchNotes.userId, userId)));
}

export async function togglePinScratchNote(id: number, userId: number, pinned: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(scratchNotes).set({ pinned }).where(and(eq(scratchNotes.id, id), eq(scratchNotes.userId, userId)));
}

export async function setColourScratchNote(id: number, userId: number, colour: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(scratchNotes).set({ colour }).where(and(eq(scratchNotes.id, id), eq(scratchNotes.userId, userId)));
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────
export async function createWaitlistRequest(data: { email: string; name?: string; reason?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(waitlistRequests).values({
    email: data.email,
    name: data.name ?? null,
    reason: data.reason ?? null,
    createdAt: Date.now(),
  });
}

export async function getWaitlistRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waitlistRequests).orderBy(desc(waitlistRequests.createdAt));
}

// ─── Security helper ─────────────────────────────────────────────────────────
// Throws TRPCError NOT_FOUND (not FORBIDDEN — avoids leaking id existence)
// if the caller does not own the project. Call before any write that accepts
// a projectId from client input.
export async function assertProjectOwnedBy(projectId: number, userId: number): Promise<void> {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
}
