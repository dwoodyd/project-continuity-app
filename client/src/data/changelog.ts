/**
 * Changelog entries for /changelog.
 *
 * Add new entries at the TOP of the array (most recent first).
 * Each entry has a version label, ISO date, title, and a list of changes
 * grouped by category. Categories: "new" | "improved" | "fixed"
 */

export type ChangeCategory = "new" | "improved" | "fixed";

export interface ChangeItem {
  category: ChangeCategory;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date string, e.g. "2026-07-07"
  title: string;
  summary?: string;
  changes: ChangeItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.9",
    date: "2026-07-07",
    title: "Security hardening & pre-launch polish",
    summary: "A focused pass on security, reliability, and SEO before the public launch.",
    changes: [
      { category: "improved", text: "Storage proxy now enforces vault ownership — you can only access your own files" },
      { category: "improved", text: "Calendar OAuth state is HMAC-signed to prevent account-linking CSRF attacks" },
      { category: "improved", text: "Push notification registration is now consistent across all three opt-in paths" },
      { category: "improved", text: "PayPal diagnostics endpoint restricted to admin accounts only" },
      { category: "fixed", text: "Removed leftover test subscription plan from the pricing page" },
      { category: "new", text: "robots.txt and sitemap.xml added for search engine indexing" },
      { category: "improved", text: "OG social card image is now self-hosted (no third-party CDN dependency)" },
    ],
  },
  {
    version: "1.8",
    date: "2026-06-30",
    title: "Task inline editing & UTC date fix",
    summary: "You can now edit tasks directly in the Command Center, and check-ins no longer drift when you're in a non-UTC timezone.",
    changes: [
      { category: "new", text: "Inline task editing — double-click any task to rename it in place" },
      { category: "new", text: "Same inline edit UX on the Tomorrow Brief handoff card" },
      { category: "fixed", text: "Check-ins, daily plans, and mood logs now use your local date instead of UTC — no more midnight drift" },
      { category: "fixed", text: "Morning check-in is now additive: carry-over tasks are merged, never replaced" },
      { category: "new", text: "Ideas page (/ideas) — review, add to tasks, or archive captured ideas" },
      { category: "improved", text: "Refresh Data option added to Settings > Preferences" },
    ],
  },
  {
    version: "1.7",
    date: "2026-06-19",
    title: "Evening closure fix & idea management",
    summary: "Evening closure now correctly surfaces tomorrow's activities, and the Idea Sanctuary has a dedicated review page.",
    changes: [
      { category: "fixed", text: "Evening closure summary now shows tomorrow's planned activities" },
      { category: "fixed", text: "Check-in gate uses completion timestamp — resuming an in-progress check-in works correctly" },
      { category: "fixed", text: "Carry-forward no longer truncates tasks — all uncompleted items carry over" },
      { category: "new", text: "Ideas page with list view, add-to-tasks, add-to-scratch, and delete actions" },
    ],
  },
  {
    version: "1.6",
    date: "2026-06-17",
    title: "Mobile layout fixes & premium polish",
    summary: "A round of mobile layout fixes and premium motion polish across the app.",
    changes: [
      { category: "fixed", text: "Capacity pill wraps correctly on narrow screens" },
      { category: "fixed", text: "Check-in tabs share card width equally on small viewports" },
      { category: "fixed", text: "Mood bar fills card width using a grid layout instead of flex gap" },
      { category: "fixed", text: "FAB no longer collides with the bottom tab bar on mobile" },
      { category: "improved", text: "Spring motion and swipe-to-dismiss on sheets (framer-motion)" },
      { category: "improved", text: "Frosted glass on nav chrome — header, tab bars, and sheets" },
      { category: "improved", text: "Tactile press response on all buttons (active:scale-[0.96])" },
      { category: "improved", text: "Full PWA icon set — maskable, apple-touch-icon, theme-color, splash images" },
      { category: "improved", text: "44px minimum touch targets across all interactive elements" },
    ],
  },
  {
    version: "1.5",
    date: "2026-06-04",
    title: "Time Sense, Surface cards & Focus Mode upgrades",
    summary: "Focus Mode now has a hard-stop countdown, periodic Surface check-ins, and divergence detection.",
    changes: [
      { category: "new", text: "Hard-stop countdown badge in active Focus sessions — turns amber at 5 minutes remaining" },
      { category: "new", text: "Surface card fires every 25 minutes — check in, take a break, or end the session" },
      { category: "new", text: "Divergence detection in Wren chat — triggers a Surface card when you drift off-topic" },
      { category: "new", text: "Time estimation calibration — the app learns how long your tasks actually take" },
      { category: "improved", text: "Re-Entry Card now shows handled tasks from the last two sessions" },
      { category: "improved", text: "Vague next-step tasks are automatically rewritten into concrete first moves" },
    ],
  },
  {
    version: "1.4",
    date: "2026-05-20",
    title: "Weekly Compass, Project Memory & Distraction tracking",
    summary: "Set your weekly priorities in the Compass, and the app now remembers every meaningful moment in a project's life.",
    changes: [
      { category: "new", text: "Weekly Compass — choose your primary project, secondary lane, and maintenance work for the week" },
      { category: "new", text: "Project Memory Timeline — every vault import, check-in, focus session, and decision is recorded" },
      { category: "new", text: "End-of-day decision capture — decisions made during evening closure are saved and surfaced in context" },
      { category: "new", text: "Distraction pattern tracking — categories and time-of-day patterns are recorded for future insights" },
      { category: "improved", text: "Vault clustering now shows confidence labels: 'likely belongs here', 'possible overlap', 'needs review'" },
      { category: "improved", text: "Alert-priority resolver — only one primary alert shown at a time on the Command Center" },
    ],
  },
  {
    version: "1.3",
    date: "2026-05-01",
    title: "Capacity-aware planning & Idea Sanctuary processing",
    summary: "Daily plans now adapt to how you're actually feeling, and the Idea Sanctuary has a structured processing queue.",
    changes: [
      { category: "new", text: "Capacity-aware daily planning — full, partial, and low capacity produce structurally different plans" },
      { category: "new", text: "Idea Sanctuary processing queue — one question per idea, four routing options" },
      { category: "new", text: "Sanctuary badge count reflects unreviewed items only" },
      { category: "improved", text: "Carryover count tracked per task — repeated carryovers surface a gentle diagnostic signal" },
      { category: "improved", text: "Low-capacity days show a single task only — no secondary project card" },
    ],
  },
  {
    version: "1.2",
    date: "2026-04-15",
    title: "Push notifications, mobile nav & Amnesty Protocol",
    summary: "The app now sends calm check-in reminders, has a proper mobile bottom tab bar, and greets you gently after a long absence.",
    changes: [
      { category: "new", text: "Push notifications — morning, midday, and evening check-in reminders at your preferred times" },
      { category: "new", text: "Mobile bottom tab bar — Today, Projects, Vault, Compass" },
      { category: "new", text: "Amnesty Protocol — a calm re-entry screen after 48+ hours away: 'You have been away. Nothing is broken.'" },
      { category: "new", text: "Offline capture queuing — ideas saved to IndexedDB when offline, synced on reconnect" },
      { category: "new", text: "Focus Session History — sessions are saved and surfaced in Weekly Review" },
      { category: "new", text: "First Step Card — a 'Start Here' card at the top of the Command Center after onboarding" },
    ],
  },
  {
    version: "1.1",
    date: "2026-04-01",
    title: "Re-Entry Cards, Weekly Review & Project Memory",
    summary: "Coming back to a project is now guided. The app remembers where you stopped and what you decided.",
    changes: [
      { category: "new", text: "Re-Entry Card — stopping point, open decision, handled tasks, and a concrete next action" },
      { category: "new", text: "Weekly Review — AI-generated insights, check-in history, and project stats" },
      { category: "new", text: "Stepping Away shortcut in Focus Mode — capture your stopping point before you leave" },
      { category: "new", text: "Context Breadcrumb — anchor your stopping point before leaving a work block" },
      { category: "improved", text: "Consistency indicator — 7 presence dots on the Command Center, no streak counter" },
      { category: "improved", text: "Amnesty 'park for later' sends items directly to the Vault inbox" },
    ],
  },
  {
    version: "1.0",
    date: "2026-03-28",
    title: "Launch — Continuary is live",
    summary: "The first version of Continuary: a tool built for minds that keep going.",
    changes: [
      { category: "new", text: "Command Center with morning, midday, and evening check-in flows" },
      { category: "new", text: "Knowledge Vault — paste, upload, or record voice notes; AI clusters related items" },
      { category: "new", text: "Projects — track what matters, why it matters, and what's next" },
      { category: "new", text: "Single Focus Mode — full-screen, drift detection, completion ceremony" },
      { category: "new", text: "Idea Sanctuary — quick capture with no required fields" },
      { category: "new", text: "AI Daily Planning Engine — capacity-adjusted plan generation" },
      { category: "new", text: "Unstick Protocol — micro-step breakdown for paralysed tasks" },
      { category: "new", text: "Onboarding wizard — work style, tone, focus hours, first project" },
    ],
  },
];
