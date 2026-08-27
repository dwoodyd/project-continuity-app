import {
  bigint,
  boolean,
  float,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
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
  welcomeNotified: boolean("welcomeNotified").default(false).notNull(),
  inviteCode: varchar("inviteCode", { length: 32 }),
  paypalSubscriptionId: varchar("paypalSubscriptionId", { length: 64 }),
  isPro: boolean("isPro").default(false).notNull(),
  proSince: timestamp("proSince"),
  isBeta: boolean("isBeta").default(false).notNull(),
  betaExpiresAt: timestamp("betaExpiresAt"),
  // ── Founding Member fields ──────────────────────────────────────────────────
  isFoundingMember: boolean("isFoundingMember").default(false).notNull(),
  foundingMemberCohort: int("foundingMemberCohort"),
  foundingMemberJoinedAt: timestamp("foundingMemberJoinedAt"),
  trialEndsAt: timestamp("trialEndsAt"),
  foundingRateLocked: boolean("foundingRateLocked").default(false).notNull(),
  foundingTier: mysqlEnum("foundingTier", ["pro", "keeper"]),
  referredBy: int("referredBy"),
  referralBonusDays: int("referralBonusDays").default(0).notNull(),
  referralCode: varchar("referralCode", { length: 64 }),
  /** Set when the 10-days-left trial reminder email has been sent — prevents duplicate sends */
  trialReminderSentAt: timestamp("trialReminderSentAt"),
  /** Subscription tier: null = free, 'pro' = Pro, 'keeper' = Keeper */
  tier: mysqlEnum("tier", ["pro", "keeper"]),
  /** The PLAN_CATALOG key of the active subscription (e.g. 'pro_founding_monthly') */
  planKey: varchar("planKey", { length: 64 }),
  /** 'founding' | 'retail' — rate type locked at subscription time */
  rateType: mysqlEnum("rateType", ["founding", "retail"]),
  /** Pattern C billing state machine */
  billingStatus: mysqlEnum("billingStatus", [
    "trialing_no_card",
    "free_tier_founding_rate_waiting",
    "active",
    "cancelled",
  ]).default("trialing_no_card"),
  /** True until the user has seen the Wren intro animation on first dashboard load */
  needsIntro: boolean("needsIntro").default(true).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Beta Codes ───────────────────────────────────────────────────────────────
export const betaCodes = mysqlTable("betaCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  usedBy: int("usedBy"),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BetaCode = typeof betaCodes.$inferSelect;
export type InsertBetaCode = typeof betaCodes.$inferInsert;

// ─── Founding Seat Capacity ────────────────────────────────────────────────────
/**
 * A single locked counter for public, auto-claimed founding seats. Direct manual
 * invites and referral grants intentionally bypass this public capacity so they
 * can continue to work after the public founding cap is reached.
 */
export const foundingSeatCapacity = mysqlTable("founding_seat_capacity", {
  id: int("id").primaryKey(),
  claimed: int("claimed").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── User Profiles ────────────────────────────────────────────────────────────
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("America/New_York"),
  /** Records automatic browser-zone capture so an intentional Settings override is never replaced. */
  timezoneDetectedAt: timestamp("timezoneDetectedAt"),
  tonePreference: mysqlEnum("tonePreference", ["gentle", "direct", "firm"]).default("direct"),
  focusHoursStart: varchar("focusHoursStart", { length: 8 }).default("09:00"),
  focusHoursEnd: varchar("focusHoursEnd", { length: 8 }).default("17:00"),
  morningCheckInTime: varchar("morningCheckInTime", { length: 8 }).default("08:00"),
  middayCheckInTime: varchar("middayCheckInTime", { length: 8 }).default("12:00"),
  eveningCheckInTime: varchar("eveningCheckInTime", { length: 8 }).default("17:00"),
  coldProjectThresholdDays: int("coldProjectThresholdDays").default(5),
  weeklyReviewDay: mysqlEnum("weeklyReviewDay", ["sunday", "saturday", "monday"]).default("sunday"),
  fontSizePreference: mysqlEnum("fontSizePreference", ["small", "medium", "large"]).default("medium"),
  /** JSON: { hidden: string[]; order: string[] }, controls Home module presentation only. */
  dashboardLayout: text("dashboardLayout"),
  /** Reduces accent saturation and removes non-essential visual treatments. */
  reducedVisualNoise: boolean("reducedVisualNoise").default(false).notNull(),
  notificationsEnabled: boolean("notificationsEnabled").default(true),
  morningNotifEnabled: boolean("morningNotifEnabled").default(true),
  middayNotifEnabled: boolean("middayNotifEnabled").default(true),
  eveningNotifEnabled: boolean("eveningNotifEnabled").default(true),
  coldProjectNotifEnabled: boolean("coldProjectNotifEnabled").default(true),
  sanctuaryNotifEnabled: boolean("sanctuaryNotifEnabled").default(true),
  notifMessageRotation: text("notifMessageRotation"), // JSON: {morning:0,midday:0,evening:0}
  focusModeEnabled: boolean("focusModeEnabled").default(true),
  driftDetectionEnabled: boolean("driftDetectionEnabled").default(true),
  onboardingCompleted: boolean("onboardingCompleted").default(false),
  /** Dismisses the one-time Today invitation after a first check-in or a quiet skip. */
  firstEngagementInviteSeen: boolean("firstEngagementInviteSeen").default(false).notNull(),
  planningMode: boolean("planningMode").default(false),
  seenAbout: boolean("seenAbout").default(false),
  aiConsentGiven: boolean("aiConsentGiven").default(false),
  workStyle: mysqlEnum("workStyle", ["writing_creative", "business_product", "ministry_coaching", "consulting_client", "multiple"]),
  preferredFocusHours: mysqlEnum("preferredFocusHours", ["morning", "midday", "afternoon", "evening", "varies"]).default("morning"),
  workTypes: text("workTypes"), // JSON string of work type strings
  distractionPatterns: text("distractionPatterns"), // JSON string
  primaryDistraction: varchar("primaryDistraction", { length: 255 }),
  onboardingAbVariant: varchar("onboardingAbVariant", { length: 1 }),
  hasSeenWrenIntro: boolean("hasSeenWrenIntro").default(false),
  // ── Reading Bridge ──────────────────────────────────────────────────────────
  /** Current chapter key the user is reading in "Permission to Start" */
  readingBridgeChapter: varchar("readingBridgeChapter", { length: 64 }),
  /** True when user has finished the entire book */
  readingBridgeFinished: boolean("readingBridgeFinished").default(false),
  /** True when user dismissed the first-time prompt with "Not reading it" */
  readingBridgeDismissed: boolean("readingBridgeDismissed").default(false),
  // ── Wren Tone Dials ─────────────────────────────────────────────────────────
  /** 0=gentle, 100=direct */
  wrenGentleDirect: int("wrenGentleDirect").default(50).notNull(),
  /** 0=brief, 100=thorough */
  wrenBriefThorough: int("wrenBriefThorough").default(50).notNull(),
  /** 0=calm, 100=energizing */
  wrenCalmEnergizing: int("wrenCalmEnergizing").default(50).notNull(),
  /** 0=follows, 100=challenges */
  wrenFollowsChallenges: int("wrenFollowsChallenges").default(50).notNull(),
  /** Wren's default opening mode */
  wrenDefaultMode: mysqlEnum("wrenDefaultMode", ["doing", "reflecting", "grounding"]).default("reflecting").notNull(),
  // ── Wren Memory ─────────────────────────────────────────────────────────────
  /** When true, Wren stops capturing new memory items */
  wrenMemoryPaused: boolean("wrenMemoryPaused").default(false).notNull(),
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
  tomorrowTasks: text("tomorrowTasks"), // JSON array: [{id,title,projectId?,energyLevel?,estimatedMinutes?}]
  emotionalState: mysqlEnum("emotionalState", ["focused", "anxious", "foggy", "energized", "drained"]),
  mentalLoad: mysqlEnum("mentalLoad", ["light", "moderate", "heavy"]),
  clarityModeSuggestion: varchar("clarityModeSuggestion", { length: 50 }),
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
  intention: text("intention"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  durationSeconds: int("durationSeconds").notNull().default(0),
  durationMinutes: int("durationMinutes").default(25), // 25, 50, or 90
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  closingNote: text("closingNote"),
  whatMoved: mysqlEnum("whatMoved", ["progress", "thinking", "stuck"]),
  threadAddedUnits: int("threadAddedUnits").default(0),
  wasCompleted: int("wasCompleted").default(0).notNull(),
  hardStop: bigint("hardStop", { mode: "number" }), // optional hard stop timestamp (ms)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FocusSession = typeof focusSessions.$inferSelect;
export type InsertFocusSession = typeof focusSessions.$inferInsert;

// ─── Booked Focus Sessions ────────────────────────────────────────────────────
// One-off sessions booked ahead by Pro members. All timestamps are stored in UTC;
// the client renders them in the member's local time. Recurrence is intentionally
// out of scope for v1.
export const bookedFocusSessions = mysqlTable("booked_focus_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  intention: text("intention"),
  durationMinutes: int("durationMinutes").notNull(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  status: mysqlEnum("status", ["scheduled", "cancelled", "started"]).default("scheduled").notNull(),
  reminderSentAt: timestamp("reminderSentAt"),
  cancelledAt: timestamp("cancelledAt"),
  startedAt: timestamp("startedAt"),
  focusSessionId: int("focusSessionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("booked_focus_sessions_due_idx").on(table.status, table.scheduledFor),
  index("booked_focus_sessions_user_idx").on(table.userId, table.status, table.scheduledFor),
]);
export type BookedFocusSession = typeof bookedFocusSessions.$inferSelect;
export type InsertBookedFocusSession = typeof bookedFocusSessions.$inferInsert;

// ── Focus Session Artifact (one per user, rendered procedurally) ──────────────
export const focusSessionArtifact = mysqlTable("focus_session_artifact", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  totalSegments: int("totalSegments").default(0).notNull(),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
});
export type FocusSessionArtifact = typeof focusSessionArtifact.$inferSelect;;

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
  type: mysqlEnum("type", ["morning", "midday", "evening", "cold_project", "sanctuary", "thread_thinning", "beta_expiry"]).notNull(),
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
  affectedProjectIds: json("affectedProjectIds").$type<number[]>(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  dismissedAt: timestamp("dismissedAt"),
});
export type PatternInsight = typeof patternInsights.$inferSelect;
export type InsertPatternInsight = typeof patternInsights.$inferInsert;

// ─── Clarity Engine ───────────────────────────────────────────────────────────
export const claritySessions = mysqlTable("clarity_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"), // optional link to a project
  mode: mysqlEnum("mode", [
    "overwhelm",
    "decision",
    "creative_block",
    "identity_drift",
    "relationship_tension",
    "purpose_fog",
  ]).notNull(),
  brainDump: text("brainDump").notNull(),
  whatIsHappening: text("whatIsHappening"),
  whatYouFeel: text("whatYouFeel"),
  whatYouNeed: text("whatYouNeed"),
  nextRightStep: text("nextRightStep"),
  signalLine: text("signalLine"),
  progressMarker: mysqlEnum("progressMarker", [
    "clearer",
    "still_unsure",
    "ready_to_act",
    "need_to_revisit",
  ]),
  convertedTo: mysqlEnum("convertedTo", [
    "next_step",
    "todays_focus",
    "project_note",
    "compass_item",
    "journal_reflection",
  ]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ClaritySession = typeof claritySessions.$inferSelect;
export type InsertClaritySession = typeof claritySessions.$inferInsert;

// ─── Beta Invites ─────────────────────────────────────────────────────────────
// Each row is one invite code. Codes are single-use; usedAt/usedByUserId are
// set atomically when a new user completes onboarding with the code.
export const betaInvites = mysqlTable("beta_invites", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  createdByUserId: int("createdByUserId").notNull(), // admin who generated it
  usedByUserId: int("usedByUserId"),                 // null until redeemed
  usedAt: timestamp("usedAt"),                       // null until redeemed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Optional: label so admins know who they sent the code to
  label: varchar("label", { length: 255 }),
  // Optional: if set, code cannot be redeemed after this timestamp
  expiresAt: timestamp("expiresAt"),
  // If true, redeeming this code automatically grants founding-member status + 90-day trial
  isFoundingMember: boolean("isFoundingMember").default(false).notNull(),
});
export type BetaInvite = typeof betaInvites.$inferSelect;
export type InsertBetaInvite = typeof betaInvites.$inferInsert;

// ─── Revoked Sessions ─────────────────────────────────────────────────────────
// Stores JWT `jti` claims for sessions that have been explicitly logged out.
// authenticateRequest checks this table before accepting any JWT.
export const revokedSessions = mysqlTable("revoked_sessions", {
  id: int("id").autoincrement().primaryKey(),
  jti: varchar("jti", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  revokedAt: timestamp("revokedAt").defaultNow().notNull(),
  // expiresAt lets a background job prune old rows safely
  expiresAt: timestamp("expiresAt").notNull(),
});
export type RevokedSession = typeof revokedSessions.$inferSelect;
export type InsertRevokedSession = typeof revokedSessions.$inferInsert;

// ─── First Movable Steps ──────────────────────────────────────────────────────
// Each row is one AI-generated First Movable Step. Tied to an optional project.
// isTooHeavy=true means the user indicated the primary move was still too much;
// minimumViableContact is the lighter fallback generated alongside it.
export const firstMovableSteps = mysqlTable("first_movable_steps", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),                       // nullable — not always project-linked
  avoidedTask: text("avoidedTask").notNull(),         // what the user is stuck on
  theMove: text("theMove").notNull(),                 // verb-first, specific, bounded action
  whereItEnds: varchar("whereItEnds", { length: 255 }).notNull(), // named finish line
  isTooHeavy: boolean("isTooHeavy").default(false).notNull(),
  minimumViableContact: text("minimumViableContact"), // lighter fallback if isTooHeavy
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  usedAt: timestamp("usedAt"),                        // set when user taps "Start session"
});
export type FirstMovableStep = typeof firstMovableSteps.$inferSelect;
export type InsertFirstMovableStep = typeof firstMovableSteps.$inferInsert;

// ─── Threshold Diagnoses ──────────────────────────────────────────────────────
// Each row is one Threshold Diagnosis session. Three plain-language questions
// are asked; the LLM maps responses to one of six patterns from the book.
export const thresholdDiagnoses = mysqlTable("threshold_diagnoses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),                       // nullable
  taskDescription: text("taskDescription").notNull(),
  q1Response: text("q1Response").notNull(),           // "What does starting this feel like?"
  q2Response: text("q2Response").notNull(),           // "What are you afraid will happen?"
  q3Response: text("q3Response").notNull(),           // "What would make this feel lighter?"
  pattern: mysqlEnum("pattern", [
    "perfectionism",
    "ambiguity",
    "emotional_weight",
    "executive_function",
    "shame_spiral",
    "permission_deficit",
  ]).notNull(),
  patternLabel: varchar("patternLabel", { length: 100 }).notNull(), // plain-language name
  protectionSentence: text("protectionSentence").notNull(), // what the resistance is protecting
  firstMove: text("firstMove").notNull(),             // calibrated FMS for this pattern
  whereItEnds: varchar("whereItEnds", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ThresholdDiagnosis = typeof thresholdDiagnoses.$inferSelect;
export type InsertThresholdDiagnosis = typeof thresholdDiagnoses.$inferInsert;

// ─── Evidence Log Summaries ───────────────────────────────────────────────────
// One row per user per calendar month. Stores computed session stats and the
// AI-generated single identity sentence that reframes the data as evidence.
export const evidenceLogSummaries = mysqlTable("evidence_log_summaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  month: varchar("month", { length: 7 }).notNull(),          // "YYYY-MM"
  sessionsStarted: int("sessionsStarted").default(0).notNull(),
  returnsAfterGap: int("returnsAfterGap").default(0).notNull(), // sessions after 48h+ gap
  hardDaySessions: int("hardDaySessions").default(0).notNull(), // sessions on low-capacity days
  genuinePermissions: int("genuinePermissions").default(0).notNull(), // sessions stopped at timer
  summaryLine: text("summaryLine"),                          // AI identity sentence
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});
export type EvidenceLogSummary = typeof evidenceLogSummaries.$inferSelect;
export type InsertEvidenceLogSummary = typeof evidenceLogSummaries.$inferInsert;

// ─── Study Tracker (Owner-only personal learning tracker) ─────────────────────
export const studyDayLogs = mysqlTable("study_day_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dayNum: int("dayNum").notNull(),
  logDate: varchar("logDate", { length: 10 }),
  capacity: varchar("capacity", { length: 20 }),
  firstMove: text("firstMove"),
  whatLearned: text("whatLearned"),
  whatBuilt: text("whatBuilt"),
  stayedOnLesson: varchar("stayedOnLesson", { length: 20 }),
  driftedWhere: text("driftedWhere"),
  returnStep: text("returnStep"),
  whatMoved: text("whatMoved"),
  stillFuzzy: text("stillFuzzy"),
  summary: text("summary"),
  carryForward: text("carryForward"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudyDayLog = typeof studyDayLogs.$inferSelect;
export type InsertStudyDayLog = typeof studyDayLogs.$inferInsert;

export const studyFocusBlocks = mysqlTable("study_focus_blocks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  logDate: varchar("logDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 10 }),
  duration: varchar("duration", { length: 30 }),
  capacity: varchar("capacity", { length: 20 }),
  lesson: text("lesson"),
  tinyProject: text("tinyProject"),
  intention: text("intention"),
  actualWork: text("actualWork"),
  drifted: varchar("drifted", { length: 20 }),
  driftedWhere: text("driftedWhere"),
  returnPoint: text("returnPoint"),
  whatMoved: text("whatMoved"),
  nextStep: text("nextStep"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StudyFocusBlock = typeof studyFocusBlocks.$inferSelect;
export type InsertStudyFocusBlock = typeof studyFocusBlocks.$inferInsert;

export const studyWeeklyReviews = mysqlTable("study_weekly_reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekNum: int("weekNum").notNull(),
  meaningfulMovement: text("meaningfulMovement"),
  lessonsCompleted: text("lessonsCompleted"),
  buildsCompleted: text("buildsCompleted"),
  stillFuzzy: text("stillFuzzy"),
  driftedMost: text("driftedMost"),
  whatHelped: text("whatHelped"),
  newUnderstanding: text("newUnderstanding"),
  openLoop: text("openLoop"),
  startHereNext: text("startHereNext"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudyWeeklyReview = typeof studyWeeklyReviews.$inferSelect;
export type InsertStudyWeeklyReview = typeof studyWeeklyReviews.$inferInsert;

// ─── User Focus Configs (Single Focus Mode — generalized) ───────────────────────────────
export const userFocusConfigs = mysqlTable("user_focus_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  focusTopic: text("focusTopic").notNull(),
  durationDays: int("durationDays").notNull(),
  cadence: mysqlEnum("cadence", ["daily", "weekday", "rhythm"]).default("daily").notNull(),
  wrenPrompts: boolean("wrenPrompts").default(false).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  pausedUntil: timestamp("pausedUntil"),
  status: mysqlEnum("status", ["active", "paused", "ended", "completed"]).default("active").notNull(),
  // Continuity tracking (internal only — never shown as digits)
  entriesCount: int("entriesCount").default(0).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastEntryDate: varchar("lastEntryDate", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserFocusConfig = typeof userFocusConfigs.$inferSelect;
export type InsertUserFocusConfig = typeof userFocusConfigs.$inferInsert;

// ─── Feedback Submissions ─────────────────────────────────────────────────────
export const feedbackSubmissions = mysqlTable("feedbackSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["bug", "suggestion", "question", "other"]).notNull().default("other"),
  message: text("message").notNull(),
  deviceInfo: text("deviceInfo"),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FeedbackSubmission = typeof feedbackSubmissions.$inferSelect;
export type InsertFeedbackSubmission = typeof feedbackSubmissions.$inferInsert;

// ─── Gamification: Continuity Events ─────────────────────────────────────────
export const continuityEvents = mysqlTable("continuity_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(),
  label: varchar("label", { length: 255 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContinuityEvent = typeof continuityEvents.$inferSelect;
export type InsertContinuityEvent = typeof continuityEvents.$inferInsert;

// ─── Gamification: Thread Strength ───────────────────────────────────────────
export const threadStrength = mysqlTable("thread_strength", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  score: int("score").notNull().default(0),
  state: varchar("state", { length: 30 }).notNull().default("Gathering"),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
});
export type ThreadStrength = typeof threadStrength.$inferSelect;
export type InsertThreadStrength = typeof threadStrength.$inferInsert;

// ─── Gamification: User Milestones ───────────────────────────────────────────
export const userMilestones = mysqlTable("user_milestones", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  milestoneKey: varchar("milestoneKey", { length: 80 }).notNull(),
  achievedAt: timestamp("achievedAt").defaultNow().notNull(),
  dismissed: boolean("dismissed").notNull().default(false),
});
export type UserMilestone = typeof userMilestones.$inferSelect;
export type InsertUserMilestone = typeof userMilestones.$inferInsert;

// ─── Scratch Pad Notes ────────────────────────────────────────────────────────
export const scratchNotes = mysqlTable("scratch_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  pinned: boolean("pinned").notNull().default(false),
  colour: varchar("colour", { length: 20 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ScratchNote = typeof scratchNotes.$inferSelect;
export type InsertScratchNote = typeof scratchNotes.$inferInsert;

// ─── Waitlist Requests ────────────────────────────────────────────────────────
export const waitlistRequests = mysqlTable("waitlist_requests", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  reason: text("reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
export type WaitlistRequest = typeof waitlistRequests.$inferSelect;
export type InsertWaitlistRequest = typeof waitlistRequests.$inferInsert;

// ─── PayPal Webhook Idempotency Ledger ────────────────────────────────────────────
export const paypalEvents = mysqlTable("paypal_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("event_id", { length: 128 }).notNull().unique(),
  eventType: varchar("event_type", { length: 128 }).notNull(),
  processedAt: bigint("processed_at", { mode: "number" }).notNull(),
});
export type PaypalEvent = typeof paypalEvents.$inferSelect;

// ─── Google Calendar Integration ─────────────────────────────────────────────
// Stores per-user OAuth tokens for Google Calendar access.
// One row per user; updated on each token refresh.
export const googleCalendarTokens = mysqlTable("google_calendar_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  scope: varchar("scope", { length: 512 }).notNull().default(""),
  calendarId: varchar("calendar_id", { length: 255 }).notNull().default("primary"),
  connectedAt: bigint("connected_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type InsertGoogleCalendarToken = typeof googleCalendarTokens.$inferInsert;

// ─── Project Workspace: Files ─────────────────────────────────────────────────
export const projectFiles = mysqlTable("project_files", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull().default("application/octet-stream"),
  sizeBytes: bigint("sizeBytes", { mode: "number" }).default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = typeof projectFiles.$inferInsert;

// ─── Project Workspace: Notes ─────────────────────────────────────────────────
export const projectNotes = mysqlTable("project_notes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).default("Untitled note"),
  content: text("content").notNull(),
  isPinned: boolean("isPinned").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProjectNote = typeof projectNotes.$inferSelect;
export type InsertProjectNote = typeof projectNotes.$inferInsert;

// ─── Project Workspace: AI Chat Messages ──────────────────────────────────────
export const projectMessages = mysqlTable("project_messages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectMessage = typeof projectMessages.$inferSelect;
export type InsertProjectMessage = typeof projectMessages.$inferInsert;

// ─── Emotional Cycle: Mood Logs ───────────────────────────────────────────────
// One entry per user per calendar day. score 1–10 maps to Hersey's scale:
// 1–3 = worry/low, 4–6 = neutral, 7–10 = elation/high.
export const moodLogs = mysqlTable("mood_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** ISO date string YYYY-MM-DD — one row per user per day */
  date: varchar("date", { length: 10 }).notNull(),
  score: int("score").notNull(), // 1–10
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userDateIdx: index("mood_logs_user_date").on(t.userId, t.date),
}));
export type MoodLog = typeof moodLogs.$inferSelect;
export type InsertMoodLog = typeof moodLogs.$inferInsert;

// ─── Founding Member Applications ─────────────────────────────────────────────
// Submitted via the marketing site apply form. Admin reviews and approves/rejects.
export const foundingApplications = mysqlTable("founding_applications", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  relationship: text("relationship"),
  /** null = pending, 'approved' = code sent, 'rejected' = declined */
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  /** The invite code sent to this applicant (set when approved) */
  inviteCodeSent: varchar("inviteCodeSent", { length: 32 }),
  /** Timestamp when the approval email was sent */
  approvedAt: bigint("approvedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type FoundingApplication = typeof foundingApplications.$inferSelect;
export type InsertFoundingApplication = typeof foundingApplications.$inferInsert;

// ─── Co-working Rooms (Body Doubling — Hack #2) ───────────────────────────────
export const coworkingRooms = mysqlTable("coworking_rooms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  description: text("description"),
  maxParticipants: int("maxParticipants").default(8).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const coworkingSessions = mysqlTable("coworking_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  roomId: int("roomId").notNull().references(() => coworkingRooms.id),
  workingOn: text("workingOn"),
  status: mysqlEnum("status", ["working", "stuck", "done"]).default("working").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
  durationMinutes: int("durationMinutes"),
  aiNextStep: text("aiNextStep"),
  projectId: int("projectId").references(() => projects.id),
});

// ─── Ground Mode ─────────────────────────────────────────────────────────────
export const groundSessions = mysqlTable("ground_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  enteredAt: bigint("enteredAt", { mode: "number" }).notNull(),
  entryMethod: mysqlEnum("entryMethod", ["manual", "contextual_offer"]).notNull(),
  exitedAt: bigint("exitedAt", { mode: "number" }),
  exitMethod: mysqlEnum("exitMethod", ["manual", "soft_expire", "crisis_break", "session_end"]),
  durationMs: int("durationMs"),
});
export type GroundSession = typeof groundSessions.$inferSelect;
export type InsertGroundSession = typeof groundSessions.$inferInsert;

// ─── App Config ───────────────────────────────────────────────────────────────
export const appConfig = mysqlTable("app_config", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});
export type AppConfig = typeof appConfig.$inferSelect;

// ─── Time Sense — Task Estimation ────────────────────────────────────────────
// Tracks estimate vs actual minutes per task for the estimation calibration loop.
export const taskEstimates = mysqlTable("task_estimates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  projectId: int("projectId").references(() => projects.id),
  taskTitle: varchar("taskTitle", { length: 500 }).notNull(),
  estimateMinutes: int("estimateMinutes"),          // user's rough guess (nullable = skipped)
  actualMinutes: int("actualMinutes"),              // accumulated from session tracking
  sessionId: int("sessionId"),                      // focus session that closed this task
  completedAt: bigint("completedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type TaskEstimate = typeof taskEstimates.$inferSelect;
export type InsertTaskEstimate = typeof taskEstimates.$inferInsert;

// ─── Surface Events Log ───────────────────────────────────────────────────────
// One row per Surface card shown. No message content stored.
export const surfaceEvents = mysqlTable("surface_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  sessionId: int("sessionId"),
  elapsedSeconds: int("elapsedSeconds").notNull(),
  trigger: mysqlEnum("trigger", [
    "interval",
    "approaching_hard_stop",
    "divergence",
  ]).notNull(),
  userResponse: mysqlEnum("userResponse", [
    "dismissed",
    "took_break",
    "ended_session",
  ]),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type SurfaceEvent = typeof surfaceEvents.$inferSelect;
export type InsertSurfaceEvent = typeof surfaceEvents.$inferInsert;

// ─── Unstick Invocations Log ──────────────────────────────────────────────────
// One row per Unstick session. No message content stored.
export const unstickInvocations = mysqlTable("unstick_invocations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  taskId: varchar("taskId", { length: 100 }),
  taskTitle: varchar("taskTitle", { length: 500 }),
  decompositionDepth: int("decompositionDepth").default(0).notNull(),
  launchedTimebox: int("launchedTimebox").default(0).notNull(),
  launchedBodyDoubling: int("launchedBodyDoubling").default(0).notNull(),
  entryMethod: mysqlEnum("entryMethod", ["manual", "resolver_offer"]).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type UnstickInvocation = typeof unstickInvocations.$inferSelect;
export type InsertUnstickInvocation = typeof unstickInvocations.$inferInsert;

// ─── Thread Locks ─────────────────────────────────────────────────────────────
// One row per "Hold That Thread" capture. Stores mid-task context so the user
// can return to exactly where they left off after an interruption.
export const threadLocks = mysqlTable("thread_locks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  projectId: int("projectId").references(() => projects.id),
  whatDoing: varchar("whatDoing", { length: 1000 }).notNull(),
  whatNext: varchar("whatNext", { length: 1000 }).notNull(),
  clipboardSnippet: text("clipboardSnippet"),
  nextCalendarEvent: varchar("nextCalendarEvent", { length: 500 }),
  pagePath: varchar("pagePath", { length: 500 }),
  recalledAt: bigint("recalledAt", { mode: "number" }),
  dismissedAt: bigint("dismissedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type ThreadLock = typeof threadLocks.$inferSelect;
export type InsertThreadLock = typeof threadLocks.$inferInsert;

// ─── Wren Letters (Weekly Review) ────────────────────────────────────────────
export const wrenLetters = mysqlTable("wren_letters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  weekKey: varchar("weekKey", { length: 20 }).notNull(), // e.g. "2026-W24"
  letterText: text("letterText").notNull(),
  compassSeed: text("compassSeed"), // optional Beat 4 nudge to carry into Weekly Compass
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type WrenLetter = typeof wrenLetters.$inferSelect;
export type InsertWrenLetter = typeof wrenLetters.$inferInsert;

// ─── Capture & Sort ───────────────────────────────────────────────────────────
// Voice and text captures. Transcripts are stored server-readable because Sort,
// Unstick, and Time Sense all compute over them.
export const captures = mysqlTable("captures", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  mode: mysqlEnum("mode", ["voice", "text"]).notNull(),
  durationS: int("durationS"),
  audioKey: varchar("audioKey", { length: 1000 }),
  transcript: text("transcript").notNull(),
  processingState: mysqlEnum("processingState", ["raw", "sorted"]).notNull().default("raw"),
  duringFocusSessionId: int("duringFocusSessionId"),
  groundModeOfferedAt: bigint("groundModeOfferedAt", { mode: "number" }),
  deletedAt: bigint("deletedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type Capture = typeof captures.$inferSelect;
export type InsertCapture = typeof captures.$inferInsert;

// Thought units extracted from a capture by Sort.
// feeling atoms are NEVER written here — returned in API response only, then discarded.
export const captureAtoms = mysqlTable("capture_atoms", {
  id: int("id").autoincrement().primaryKey(),
  captureId: int("captureId").notNull().references(() => captures.id),
  userId: int("userId").notNull().references(() => users.id),
  kind: mysqlEnum("kind", ["fact", "task", "open_loop", "question", "insight"]).notNull(),
  text: text("text").notNull(),
  salience: float("salience").notNull().default(0.5),
  userCorrected: tinyint("userCorrected").notNull().default(0),
  routedTo: mysqlEnum("routedTo", ["unstick", "loops"]),
  routedTargetId: int("routedTargetId"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type CaptureAtom = typeof captureAtoms.$inferSelect;
export type InsertCaptureAtom = typeof captureAtoms.$inferInsert;

// Open Loops ledger.
export const openLoops = mysqlTable("open_loops", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  atomId: int("atomId"),
  text: text("text").notNull(),
  status: mysqlEnum("status", ["open", "closed"]).notNull().default("open"),
  openedAt: bigint("openedAt", { mode: "number" }).notNull(),
  closedAt: bigint("closedAt", { mode: "number" }),
  resurfaceAt: bigint("resurfaceAt", { mode: "number" }),
});
export type OpenLoop = typeof openLoops.$inferSelect;
export type InsertOpenLoop = typeof openLoops.$inferInsert;

// User corrections to Sort classifications.
export const sortCorrections = mysqlTable("sort_corrections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  text: text("text").notNull(),
  fromKind: mysqlEnum("fromKind", ["feeling", "fact", "task", "open_loop", "question", "insight"]).notNull(),
  toKind: mysqlEnum("toKind", ["feeling", "fact", "task", "open_loop", "question", "insight"]).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type SortCorrection = typeof sortCorrections.$inferSelect;
export type InsertSortCorrection = typeof sortCorrections.$inferInsert;

// ─── Crisis Flags ─────────────────────────────────────────────────────────────
// Audit log for crisis detection events. Stores NO verbatim user content.
// Access-controlled: only owner/admin can query; never surfaced in analytics.
export const crisisFlags = mysqlTable("crisis_flags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  /** Risk level determined by the two-stage classifier */
  riskLevel: mysqlEnum("riskLevel", ["elevated", "acute"]).notNull(),
  /** Surface where the flag was triggered (e.g. "ground_mode", "check_in", "capture") */
  surfaceName: varchar("surfaceName", { length: 64 }).notNull(),
  /** Timestamp of the flag — no verbatim content stored */
  flaggedAt: bigint("flaggedAt", { mode: "number" }).notNull(),
});
export type CrisisFlag = typeof crisisFlags.$inferSelect;
export type InsertCrisisFlag = typeof crisisFlags.$inferInsert;
