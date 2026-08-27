export type DashboardModuleKey =
  | "daily_rhythm"
  | "tasks"
  | "first_step"
  | "thread_strength"
  | "projects"
  | "quietly_waiting"
  | "emotional_cycle"
  | "scratch_pad"
  | "knowledge_graph"
  | "pattern_detected"
  | "recent_decisions"
  | "mode";

export type DashboardModuleDefinition = {
  key: DashboardModuleKey;
  label: string;
  invitation: string;
  tier: "secondary" | "opt_in";
  defaultOrder: number;
};

export const DASHBOARD_MODULES: DashboardModuleDefinition[] = [
  { key: "daily_rhythm", label: "Daily Rhythm", invitation: "Want a lighter morning reset?", tier: "opt_in", defaultOrder: 5 },
  { key: "first_step", label: "Start Here", invitation: "Want one clear place to begin?", tier: "secondary", defaultOrder: 10 },
  { key: "tasks", label: "Today's Tasks", invitation: "Want to hold today’s tasks in view?", tier: "secondary", defaultOrder: 20 },
  { key: "thread_strength", label: "Thread Strength", invitation: "Want a quiet sense of how your connection is growing?", tier: "opt_in", defaultOrder: 30 },
  { key: "projects", label: "Projects / Current Threads", invitation: "Want your current threads gathered together?", tier: "secondary", defaultOrder: 40 },
  { key: "quietly_waiting", label: "Quietly Waiting", invitation: "Want paused projects kept without nagging you?", tier: "opt_in", defaultOrder: 50 },
  { key: "emotional_cycle", label: "Emotional Cycle", invitation: "Want Continuary to notice patterns over time?", tier: "opt_in", defaultOrder: 110 },
  { key: "scratch_pad", label: "Scratch Pad", invitation: "Want a loose place to hold thoughts before they are ready?", tier: "secondary", defaultOrder: 120 },
  { key: "knowledge_graph", label: "Knowledge Graph", invitation: "Want to see connections across what you are holding?", tier: "opt_in", defaultOrder: 130 },
  { key: "pattern_detected", label: "Patterns", invitation: "Want gentle pattern notices when they are useful?", tier: "opt_in", defaultOrder: 140 },
  { key: "recent_decisions", label: "Recent Decisions", invitation: "Want your recent decisions close at hand?", tier: "opt_in", defaultOrder: 150 },
  { key: "mode", label: "Modes", invitation: "Want to shift the app’s pace when your capacity changes?", tier: "opt_in", defaultOrder: 160 },
];

export type DashboardLayoutPreference = {
  hidden: DashboardModuleKey[];
  order: DashboardModuleKey[];
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutPreference = {
  hidden: DASHBOARD_MODULES
    .filter((module) => !["first_step", "tasks", "projects", "scratch_pad"].includes(module.key))
    .map((module) => module.key),
  order: DASHBOARD_MODULES.map((module) => module.key),
};

const knownKeys = new Set<DashboardModuleKey>(DASHBOARD_MODULES.map((module) => module.key));

export function normalizeDashboardLayout(layout?: Partial<DashboardLayoutPreference> | null): DashboardLayoutPreference {
  const suppliedOrder = Array.isArray(layout?.order) ? layout.order.filter((key): key is DashboardModuleKey => knownKeys.has(key as DashboardModuleKey)) : [];
  const order = Array.from(new Set([...suppliedOrder, ...DEFAULT_DASHBOARD_LAYOUT.order]));
  const savedHidden = Array.isArray(layout?.hidden)
    ? Array.from(new Set(layout.hidden.filter((key): key is DashboardModuleKey => knownKeys.has(key as DashboardModuleKey))))
    : null;
  // A stored layout represents an existing member’s deliberate choices. New
  // accounts have no saved layout and receive the quieter progressive default.
  const hidden = savedHidden ?? DEFAULT_DASHBOARD_LAYOUT.hidden;
  return { hidden, order };
}

export function presentationOrder(key: DashboardModuleKey, layout: DashboardLayoutPreference): number {
  const position = layout.order.indexOf(key);
  return position >= 0 ? (position + 1) * 10 : DASHBOARD_MODULES.find((module) => module.key === key)?.defaultOrder ?? 999;
}
