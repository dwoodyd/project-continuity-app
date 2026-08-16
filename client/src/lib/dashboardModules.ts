export type DashboardModuleKey =
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
  tier: "secondary" | "opt_in";
  defaultOrder: number;
};

export const DASHBOARD_MODULES: DashboardModuleDefinition[] = [
  { key: "first_step", label: "Start here", tier: "secondary", defaultOrder: 10 },
  { key: "tasks", label: "Today's tasks", tier: "secondary", defaultOrder: 20 },
  { key: "thread_strength", label: "Thread strength", tier: "secondary", defaultOrder: 30 },
  { key: "projects", label: "Projects", tier: "secondary", defaultOrder: 40 },
  { key: "quietly_waiting", label: "Quietly waiting", tier: "secondary", defaultOrder: 50 },
  { key: "emotional_cycle", label: "Emotional cycle", tier: "opt_in", defaultOrder: 110 },
  { key: "scratch_pad", label: "Scratch pad", tier: "opt_in", defaultOrder: 120 },
  { key: "knowledge_graph", label: "Knowledge graph", tier: "opt_in", defaultOrder: 130 },
  { key: "pattern_detected", label: "Pattern detected", tier: "opt_in", defaultOrder: 140 },
  { key: "recent_decisions", label: "Recent decisions", tier: "opt_in", defaultOrder: 150 },
  { key: "mode", label: "Doing / being mode", tier: "opt_in", defaultOrder: 160 },
];

export type DashboardLayoutPreference = {
  hidden: DashboardModuleKey[];
  order: DashboardModuleKey[];
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutPreference = {
  hidden: [],
  order: DASHBOARD_MODULES.map((module) => module.key),
};

const knownKeys = new Set<DashboardModuleKey>(DASHBOARD_MODULES.map((module) => module.key));

export function normalizeDashboardLayout(layout?: Partial<DashboardLayoutPreference> | null): DashboardLayoutPreference {
  const suppliedOrder = Array.isArray(layout?.order) ? layout.order.filter((key): key is DashboardModuleKey => knownKeys.has(key as DashboardModuleKey)) : [];
  const order = Array.from(new Set([...suppliedOrder, ...DEFAULT_DASHBOARD_LAYOUT.order]));
  const hidden = Array.isArray(layout?.hidden)
    ? Array.from(new Set(layout.hidden.filter((key): key is DashboardModuleKey => knownKeys.has(key as DashboardModuleKey))))
    : [];
  return { hidden, order };
}

export function presentationOrder(key: DashboardModuleKey, layout: DashboardLayoutPreference): number {
  const position = layout.order.indexOf(key);
  return position >= 0 ? (position + 1) * 10 : DASHBOARD_MODULES.find((module) => module.key === key)?.defaultOrder ?? 999;
}
