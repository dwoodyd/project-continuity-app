/**
 * ActivityHeatmap — luxury GitHub-style contribution grid
 * Gold/charcoal palette, 52 weeks × 7 days
 */
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { trpc } from "@/lib/trpc";

// 5 intensity levels: 0 = empty, 1-4 = activity
const CELL_COLORS = [
  "oklch(1 0 0 / 0.05)",   // 0 — empty
  "oklch(0.72 0.17 65 / 0.25)", // 1 — faint gold
  "oklch(0.72 0.17 65 / 0.50)", // 2 — mid gold
  "oklch(0.72 0.17 65 / 0.75)", // 3 — rich gold
  "oklch(0.72 0.17 65 / 1.00)", // 4 — full gold
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["","Mon","","Wed","","Fri",""];

export function ActivityHeatmap() {
  const { data = [], isLoading } = trpc.checkIns.getHeatmapData.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Pad to full 52-week grid (364 cells) starting on Sunday
  const grid = useMemo(() => {
    if (data.length === 0) return [];
    // data is 365 days oldest→newest
    // Find day-of-week of first cell to pad
    const firstDate = parseISO(data[0]!.date);
    const dow = firstDate.getDay(); // 0=Sun
    const padded: (typeof data[0] | null)[] = [
      ...Array(dow).fill(null),
      ...data,
    ];
    // Split into weeks (columns)
    const weeks: (typeof data[0] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }
    return weeks;
  }, [data]);

  // Month label positions
  const monthPositions = useMemo(() => {
    const positions: { label: string; col: number }[] = [];
    let lastMonth = -1;
    grid.forEach((week, col) => {
      const firstReal = week.find(Boolean);
      if (!firstReal) return;
      const m = parseISO(firstReal.date).getMonth();
      if (m !== lastMonth) {
        positions.push({ label: MONTH_LABELS[m]!, col });
        lastMonth = m;
      }
    });
    return positions;
  }, [grid]);

  const totalActive = data.filter(d => d.level > 0).length;

  if (isLoading) {
    return (
      <div className="h-24 rounded-xl animate-pulse" style={{ background: "oklch(1 0 0 / 0.04)" }} />
    );
  }

  const CELL = 11; // px per cell
  const GAP = 2;
  const UNIT = CELL + GAP;

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex" style={{ paddingLeft: 24 }}>
        {monthPositions.map(({ label, col }) => (
          <div
            key={`${label}-${col}`}
            className="text-[10px] shrink-0"
            style={{
              width: UNIT,
              marginLeft: col === 0 ? 0 : (col - (monthPositions[monthPositions.indexOf({ label, col })]?.col ?? 0)) * UNIT,
              color: "oklch(1 0 0 / 0.30)",
              position: "absolute",
              left: 24 + col * UNIT,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="flex gap-0.5 overflow-x-auto pb-1" style={{ position: "relative" }}>
        {/* Day labels */}
        <div className="flex flex-col shrink-0" style={{ gap: GAP, paddingTop: 14 }}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              style={{
                height: CELL,
                width: 20,
                fontSize: 9,
                color: "oklch(1 0 0 / 0.25)",
                lineHeight: `${CELL}px`,
                textAlign: "right",
                paddingRight: 3,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ position: "relative" }}>
          {/* Month labels row */}
          <div style={{ height: 14, position: "relative", marginBottom: 2 }}>
            {monthPositions.map(({ label, col }) => (
              <span
                key={`ml-${col}`}
                style={{
                  position: "absolute",
                  left: col * UNIT,
                  fontSize: 9,
                  color: "oklch(1 0 0 / 0.30)",
                  lineHeight: "14px",
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex" style={{ gap: GAP }}>
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={day ? `${day.date}: ${day.checkInCount} check-ins, ${day.focusCount} focus sessions` : ""}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      background: day ? CELL_COLORS[day.level] : CELL_COLORS[0],
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 10, color: "oklch(1 0 0 / 0.28)" }}>
          {totalActive} active {totalActive === 1 ? "day" : "days"} in the past year
        </span>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 9, color: "oklch(1 0 0 / 0.25)" }}>Less</span>
          {CELL_COLORS.map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: c, flexShrink: 0 }} />
          ))}
          <span style={{ fontSize: 9, color: "oklch(1 0 0 / 0.25)" }}>More</span>
        </div>
      </div>
    </div>
  );
}
