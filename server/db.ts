import { and, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";
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
  // Return distinct user IDs that have at least one push subscription
  const rows = await db.selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  return rows.map((r) => r.userId);
}

// ── Notification Log ──────────────────────────────────────────────────────────
export async function logNotificationSent(data: {
  userId: number;
  type: "morning" | "midday" | "evening" | "cold_project" | "sanctuary";
  projectId?: number;
  suppressedBy?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notificationLog).values(data);
}

export async function getRecentNotificationLog(
  userId: number,
  type: "morning" | "midday" | "evening" | "cold_project" | "sanctuary",
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
