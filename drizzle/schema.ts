import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── User Profiles ────────────────────────────────────────────────────────────
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("America/New_York"),
  tonePreference: mysqlEnum("tonePreference", ["gentle", "direct", "firm"]).default("direct"),
  focusHoursStart: varchar("focusHoursStart", { length: 8 }).default("09:00"),
  focusHoursEnd: varchar("focusHoursEnd", { length: 8 }).default("17:00"),
  morningCheckInTime: varchar("morningCheckInTime", { length: 8 }).default("08:00"),
  middayCheckInTime: varchar("middayCheckInTime", { length: 8 }).default("12:00"),
  eveningCheckInTime: varchar("eveningCheckInTime", { length: 8 }).default("17:00"),
  coldProjectThresholdDays: int("coldProjectThresholdDays").default(5),
  weeklyReviewDay: mysqlEnum("weeklyReviewDay", ["sunday", "saturday", "monday"]).default("sunday"),
  fontSizePreference: mysqlEnum("fontSizePreference", ["small", "medium", "large"]).default("medium"),
  notificationsEnabled: boolean("notificationsEnabled").default(true),
  morningNotifEnabled: boolean("morningNotifEnabled").default(true),
  middayNotifEnabled: boolean("middayNotifEnabled").default(true),
  eveningNotifEnabled: boolean("eveningNotifEnabled").default(true),
  coldProjectNotifEnabled: boolean("coldProjectNotifEnabled").default(true),
  sanctuaryNotifEnabled: boolean("sanctuaryNotifEnabled").default(true),
  notifMessageRotation: text("notifMessageRotation"), // JSON: {morning:0,midday:0,evening:0}
  onboardingCompleted: boolean("onboardingCompleted").default(false),
  workStyle: mysqlEnum("workStyle", ["writing_creative", "business_product", "ministry_coaching", "consulting_client", "multiple"]),
  preferredFocusHours: mysqlEnum("preferredFocusHours", ["morning", "midday", "afternoon", "evening", "varies"]).default("morning"),
  workTypes: text("workTypes"), // JSON string of work type strings
  distractionPatterns: text("distractionPatterns"), // JSON string
  primaryDistraction: varchar("primaryDistraction", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  whyItMatters: text("whyItMatters"),
  status: mysqlEnum("status", ["idea", "mapped", "active", "paused", "completed", "archived"]).default("idea").notNull(),
  phase: mysqlEnum("phase", ["defining", "building", "refining", "publishing", "maintaining"]).default("defining"),
  priorityLevel: mysqlEnum("priorityLevel", ["low", "medium", "high"]).default("medium"),
  milestones: text("milestones"), // JSON array of milestone objects
  goodEnoughThreshold: text("goodEnoughThreshold"),
  nextStep: text("nextStep"),
  blockers: text("blockers"),
  contextBreadcrumb: text("contextBreadcrumb"), // last "stepping away" note
  lastTouchedAt: timestamp("lastTouchedAt").defaultNow(),
  completedAt: timestamp("completedAt"),
  archiveSummary: text("archiveSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Source Items (Knowledge Vault) ───────────────────────────────────────────
export const sourceItems = mysqlTable("source_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceType: mysqlEnum("sourceType", [
    "paste", "text", "markdown", "pdf", "docx", "google_docs",
    "notion", "chatgpt_export", "claude_export", "notebooklm",
    "transcript", "voice", "url", "other"
  ]).default("paste").notNull(),
  title: varchar("title", { length: 500 }),
  rawContent: text("rawContent"),
  cleanContent: text("cleanContent"),
  summary: text("summary"),
  tags: text("tags"), // JSON array of tag strings
  projectCandidates: text("projectCandidates"), // JSON array of suggested project titles
  linkedProjectIds: text("linkedProjectIds"), // JSON array of project IDs
  contentClass: mysqlEnum("contentClass", [
    "idea", "draft", "research", "outline", "decision", "tasks", "archive"
  ]).default("idea"),
  state: mysqlEnum("state", [
    "inbox", "mapped", "parked", "active", "today", "done", "archived"
  ]).default("inbox").notNull(),
  fileUrl: text("fileUrl"), // S3 URL for uploaded files
  fileKey: varchar("fileKey", { length: 500 }),
  mimeType: varchar("mimeType", { length: 100 }),
  mappingConfidence: mysqlEnum("mappingConfidence", ["likely", "possible", "needs_review"]).default("needs_review"),
  reviewedAt: timestamp("reviewedAt"),
  isDuplicate: int("isDuplicate").default(0).notNull(), // tinyint(1) boolean
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SourceItem = typeof sourceItems.$inferSelect;
export type InsertSourceItem = typeof sourceItems.$inferInsert;

// ─── Daily Plans ──────────────────────────────────────────────────────────────
export const dailyPlans = mysqlTable("daily_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  capacityLevel: mysqlEnum("capacityLevel", ["full", "partial", "low"]).default("full"),
  primaryProjectId: int("primaryProjectId"),
  secondaryProjectId: int("secondaryProjectId"),
  criticalTasks: text("criticalTasks"), // JSON array of task objects {id, title, done, projectId}
  timeBlocks: text("timeBlocks"), // JSON array of time block objects
  likelyDistractions: text("likelyDistractions"),
  notesToReview: text("notesToReview"), // JSON array of source item IDs
  generatedGuidance: text("generatedGuidance"),
  tomorrowBrief: text("tomorrowBrief"),
  tomorrowBriefGeneratedAt: timestamp("tomorrowBriefGeneratedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyPlan = typeof dailyPlans.$inferSelect;
export type InsertDailyPlan = typeof dailyPlans.$inferInsert;

// ─── Check-Ins ────────────────────────────────────────────────────────────────
export const checkIns = mysqlTable("check_ins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dailyPlanId: int("dailyPlanId"),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  type: mysqlEnum("type", ["morning", "midday", "evening"]).notNull(),
  userInput: text("userInput"), // JSON object with answers
  alignmentStatus: mysqlEnum("alignmentStatus", ["aligned", "recovering", "redirect"]),
  generatedResponse: text("generatedResponse"),
  extractedNextSteps: text("extractedNextSteps"), // JSON array
  linkedProjectIds: text("linkedProjectIds"), // JSON array
  interruptionsNoted: text("interruptionsNoted"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = typeof checkIns.$inferInsert;

// ─── Idea Captures ────────────────────────────────────────────────────────────
export const ideaCaptures = mysqlTable("idea_captures", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  rawContent: text("rawContent").notNull(),
  parsedIntent: text("parsedIntent"),
  relatedProjectId: int("relatedProjectId"),
  capturedDuringTask: boolean("capturedDuringTask").default(false),
  parkedStatus: boolean("parkedStatus").default(true),
  scheduledReviewDate: varchar("scheduledReviewDate", { length: 10 }),
  resolvedStatus: boolean("resolvedStatus").default(false),
  resolvedAt: timestamp("resolvedAt"),
  sourceItemId: int("sourceItemId"), // if promoted to vault
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IdeaCapture = typeof ideaCaptures.$inferSelect;
export type InsertIdeaCapture = typeof ideaCaptures.$inferInsert;

// ─── Weekly Reviews ───────────────────────────────────────────────────────────
export const weeklyReviews = mysqlTable("weekly_reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStartDate: varchar("weekStartDate", { length: 10 }).notNull(), // YYYY-MM-DD
  projectsMoved: text("projectsMoved"), // JSON array of project IDs
  projectsStalled: text("projectsStalled"), // JSON array of project IDs
  patternsSurfaced: text("patternsSurfaced"),
  primaryProjectIntention: int("primaryProjectIntention"), // project ID
  userNotes: text("userNotes"),
  generatedSummary: text("generatedSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type InsertWeeklyReview = typeof weeklyReviews.$inferInsert;

// ─── Re-Entry Cards ───────────────────────────────────────────────────────────
export const reEntryCards = mysqlTable("re_entry_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  stoppingPoint: text("stoppingPoint"),
  unresolvedDecision: text("unresolvedDecision"),
  whatWasRuledOut: text("whatWasRuledOut"),
  nextPhysicalAction: text("nextPhysicalAction"),
  whyItMattersQuote: text("whyItMattersQuote"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReEntryCard = typeof reEntryCards.$inferSelect;
export type InsertReEntryCard = typeof reEntryCards.$inferInsert;

export const focusSessions = mysqlTable("focus_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  intention: text("intention").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  durationSeconds: int("durationSeconds").notNull().default(0),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  wasCompleted: int("wasCompleted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FocusSession = typeof focusSessions.$inferSelect;
export type InsertFocusSession = typeof focusSessions.$inferInsert;

// ── Distraction Events ────────────────────────────────────────────────────────
export const distractionEvents = mysqlTable("distraction_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  date: timestamp("date").defaultNow().notNull(),
  checkInType: mysqlEnum("checkInType", ["midday", "evening"]).notNull(),
  rawInput: text("rawInput").notNull(),
  category: mysqlEnum("category", [
    "social_media",
    "research_rabbit_hole",
    "unplanned_task",
    "communication",
    "context_switch",
    "unknown",
  ])
    .default("unknown")
    .notNull(),
  timeOfDay: mysqlEnum("timeOfDay", ["morning", "afternoon", "evening"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DistractionEvent = typeof distractionEvents.$inferSelect;
export type InsertDistractionEvent = typeof distractionEvents.$inferInsert;

// ── Project Memory Events ─────────────────────────────────────────────────────
export const projectMemoryEvents = mysqlTable("project_memory_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  eventType: mysqlEnum("eventType", [
    "created",
    "vault_import",
    "check_in",
    "focus_session",
    "milestone",
    "blocker",
    "next_step_change",
    "decision",
    "status_change",
  ]).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string for extra fields
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectMemoryEvent = typeof projectMemoryEvents.$inferSelect;
export type InsertProjectMemoryEvent = typeof projectMemoryEvents.$inferInsert;

// ── Weekly Compass ────────────────────────────────────────────────────────────
export const weeklyCompass = mysqlTable("weekly_compass", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStart: timestamp("weekStart").notNull(), // Monday 00:00 UTC
  primaryProjectId: int("primaryProjectId"),
  secondaryProjectId: int("secondaryProjectId"),
  adminLane: text("adminLane"), // free-text description of maintenance/admin focus
  mustMove: text("mustMove"), // JSON array of project ids / task descriptions
  canWait: text("canWait"),
  shouldPark: text("shouldPark"),
  generatedGuidance: text("generatedGuidance"),
  userConfirmedAt: timestamp("userConfirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WeeklyCompass = typeof weeklyCompass.$inferSelect;
export type InsertWeeklyCompass = typeof weeklyCompass.$inferInsert;

// ── Decisions ─────────────────────────────────────────────────────────────────
export const decisions = mysqlTable("decisions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  content: text("content").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  source: mysqlEnum("source", ["manual", "extracted"]).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Decision = typeof decisions.$inferSelect;
export type InsertDecision = typeof decisions.$inferInsert;
// ── Push Subscriptions ────────────────────────────────────────────────────────
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
// ── Notification Log ──────────────────────────────────────────────────────────
export const notificationLog = mysqlTable("notification_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["morning", "midday", "evening", "cold_project", "sanctuary"]).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  projectId: int("projectId"), // for cold_project type
  suppressedBy: varchar("suppressedBy", { length: 64 }), // e.g. "in_app_checkin"
});
export type NotificationLog = typeof notificationLog.$inferSelect;
export type InsertNotificationLog = typeof notificationLog.$inferInsert;

// ─── Friction Logs ────────────────────────────────────────────────────────────
export const frictionLogs = mysqlTable("friction_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  note: text("note").notNull(),
  pageContext: varchar("pageContext", { length: 255 }), // optional: which page/feature
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FrictionLog = typeof frictionLogs.$inferSelect;
export type InsertFrictionLog = typeof frictionLogs.$inferInsert;

// ─── Project Health Scores ────────────────────────────────────────────────────
export const projectHealthScores = mysqlTable("project_health_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  score: int("score").notNull().default(50), // 0-100
  momentum: mysqlEnum("momentum", ["rising", "steady", "fading", "stalled"]).default("steady"),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).default("low"),
  completionRate: int("completionRate").default(0), // 0-100 percent
  stalledDays: int("stalledDays").default(0),
  lastActivityAt: timestamp("lastActivityAt"),
  narrative: text("narrative"), // short AI-generated sentence
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});
export type ProjectHealthScore = typeof projectHealthScores.$inferSelect;
export type InsertProjectHealthScore = typeof projectHealthScores.$inferInsert;

// ─── Pattern Insights ─────────────────────────────────────────────────────────
export const patternInsights = mysqlTable("pattern_insights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "distraction_pattern",
    "stall_pattern",
    "decision_debt",
    "capacity_mismatch",
    "momentum_drop",
    "cross_project_conflict",
    "positive_pattern",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  affectedProjectIds: json("affectedProjectIds").$type<number[]>().default([]),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  dismissedAt: timestamp("dismissedAt"),
});
export type PatternInsight = typeof patternInsights.$inferSelect;
export type InsertPatternInsight = typeof patternInsights.$inferInsert;
