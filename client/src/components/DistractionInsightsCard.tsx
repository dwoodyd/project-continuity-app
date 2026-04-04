import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, TrendingDown, Zap } from "lucide-react";

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  social_media: "bg-rose-400",
  research_rabbit_hole: "bg-violet-400",
  unplanned_task: "bg-amber-400",
  communication: "bg-sky-400",
  context_switch: "bg-orange-400",
  unknown: "bg-slate-400",
};

const CATEGORY_ICONS: Record<string, string> = {
  social_media: "📱",
  research_rabbit_hole: "🔍",
  unplanned_task: "📋",
  communication: "💬",
  context_switch: "🔀",
  unknown: "❓",
};

// ── Time-of-day bar ───────────────────────────────────────────────────────────

function TimeOfDayBar({
  counts,
  topTimeOfDay,
}: {
  counts: { morning: number; afternoon: number; evening: number };
  topTimeOfDay: string | null;
}) {
  const total = counts.morning + counts.afternoon + counts.evening;
  if (total === 0) return null;

  const slots = [
    { key: "morning", label: "Morning", count: counts.morning, color: "bg-amber-400" },
    { key: "afternoon", label: "Afternoon", count: counts.afternoon, color: "bg-sky-400" },
    { key: "evening", label: "Evening", count: counts.evening, color: "bg-violet-400" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Time of day
      </p>
      <div className="space-y-1.5">
        {slots.map(({ key, label, count, color }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isTop = key === topTimeOfDay;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className={cn("text-xs w-16 shrink-0", isTop ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", color, isTop ? "opacity-100" : "opacity-50")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={cn("text-xs w-8 text-right tabular-nums", isTop ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Category breakdown mini-bars ──────────────────────────────────────────────

function CategoryBreakdown({
  breakdown,
}: {
  breakdown: Array<{ category: string; label: string; count: number; pct: number }>;
}) {
  if (breakdown.length === 0) return null;
  const top = breakdown.slice(0, 4); // show at most 4 categories

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <TrendingDown className="w-3.5 h-3.5" />
        By category
      </p>
      <div className="space-y-1.5">
        {top.map((item, i) => {
          const barColor = CATEGORY_COLORS[item.category] ?? "bg-slate-400";
          const icon = CATEGORY_ICONS[item.category] ?? "•";
          return (
            <div key={item.category} className="flex items-center gap-2">
              <span className="text-sm w-5 text-center shrink-0">{icon}</span>
              <span className={cn("text-xs flex-1 min-w-0 truncate", i === 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {item.label}
              </span>
              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full", barColor, i === 0 ? "opacity-100" : "opacity-60")}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className={cn("text-xs w-8 text-right tabular-nums shrink-0", i === 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {item.pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function DistractionInsightsCard() {
  const { data, isLoading } = trpc.checkIns.getWeeklyDistractionInsights.useQuery();

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-border bg-card animate-pulse">
        <div className="h-4 w-40 bg-muted rounded mb-3" />
        <div className="h-3 w-full bg-muted rounded mb-2" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
    );
  }

  // Empty state — no distraction events logged this week
  if (!data || !data.hasData) {
    return (
      <div className="p-5 rounded-xl border border-dashed border-border bg-card/50 text-center">
        <Zap className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No distraction data this week</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Distractions logged during midday and evening check-ins will appear here.
        </p>
      </div>
    );
  }

  const topIcon = CATEGORY_ICONS[data.topCategory ?? ""] ?? "•";
  const topColor = CATEGORY_COLORS[data.topCategory ?? ""] ?? "bg-slate-400";

  return (
    <div className="p-5 rounded-xl border border-border bg-card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Distraction Patterns
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {data.totalEvents} event{data.totalEvents !== 1 ? "s" : ""} this week
        </span>
      </div>

      {/* Top category pill + insight sentence */}
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0", topColor, "bg-opacity-20")}>
          {topIcon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white", topColor)}>
              {data.topCategoryLabel}
            </span>
            <span className="text-xs text-muted-foreground">
              {data.topCategoryCount} time{data.topCategoryCount !== 1 ? "s" : ""}
            </span>
          </div>
          {data.insightSentence && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {data.insightSentence}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Time-of-day bars */}
      <TimeOfDayBar
        counts={data.timeOfDayCounts}
        topTimeOfDay={data.topTimeOfDay}
      />

      {/* Category breakdown */}
      {data.categoryBreakdown.length > 1 && (
        <>
          <div className="border-t border-border" />
          <CategoryBreakdown breakdown={data.categoryBreakdown} />
        </>
      )}
    </div>
  );
}
