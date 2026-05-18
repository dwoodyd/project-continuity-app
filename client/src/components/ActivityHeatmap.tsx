/**
 * ActivityHeatmap — luxury GitHub-style contribution grid
 * Gold/charcoal palette, 52 weeks × 7 days
 *
 * Fix (May 2026): month labels were position:absolute with left offsets
 * calculated from grid column index but the outer container had no
 * position:relative, causing them to escape and overlap the sidebar on
 * narrow screens. Now the entire grid (labels + cells) lives inside a
 * single overflow-x-auto scroll wrapper so labels are always clipped.
 */
import { useMemo } from "react";
import { parseISO } from "date-fns";
import { trpc } from "@/lib/trpc";

// 5 intensity levels: 0 = empty, 1-4 = activity
const CELL_COLORS = [
  "oklch(1 0 0 / 0.05)",          // 0 — empty
  "oklch(0.72 0.17 65 / 0.25)",   // 1 — faint gold
  "oklch(0.72 0.17 65 / 0.50)",   // 2 — mid gold
  "oklch(0.72 0.17 65 / 0.75)",   // 3 — rich gold
  "oklch(0.72 0.17 65 / 1.00)",   // 4 — full gold
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS   = ["","Mon","","Wed","","Fri",""];

const CELL = 11; // px per cell
const GAP  = 2;
const UNIT = CELL + GAP;
const DAY_LABEL_W = 22; // px for Mon/Wed/Fri labels on left

export function ActivityHeatmap() {
  const { data = [], isLoading } = trpc.checkIns.getHeatmapData.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Pad to full 52-week grid (364 cells) starting on Sunday
  const grid = useMemo(() => {
    if (data.length === 0) return [];
    const firstDate = parseISO(data[0]!.date);
    const dow = firstDate.getDay(); // 0=Sun
    const padded: (typeof data[0] | null)[] = [
      ...Array(dow).fill(null),
      ...data,
    ];
    const weeks: (typeof data[0] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }
    return weeks;
  }, [data]);

  // Month label positions — one label per calendar month transition
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

  // Total pixel width of the grid (all weeks + gaps)
  const gridWidth = grid.length * UNIT - GAP;

  return (
    <div className="space-y-2">
      {/*
        Single overflow-x-auto wrapper so month labels are always clipped
        to the scroll container and never escape into the sidebar.
      */}
      <div className="overflow-x-auto pb-1">
        <div style={{ display: "flex", minWidth: DAY_LABEL_W + gridWidth }}>
          {/* Day-of-week labels (Mon / Wed / Fri) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: GAP,
              paddingTop: 14 + 2, // match month-label row height
              flexShrink: 0,
              width: DAY_LABEL_W,
            }}
          >
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                style={{
                  height: CELL,
                  width: DAY_LABEL_W,
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

          {/* Grid + month labels */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Month labels row — absolutely positioned within this container */}
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
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Week columns */}
            <div style={{ display: "flex", gap: GAP }}>
              {grid.map((week, wi) => (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      title={
                        day
                          ? `${day.date}: ${day.checkInCount} check-in${day.checkInCount !== 1 ? "s" : ""}, ${day.focusCount} focus session${day.focusCount !== 1 ? "s" : ""}`
                          : ""
                      }
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
