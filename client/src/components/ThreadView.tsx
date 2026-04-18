/**
 * ThreadView — Real-data weekly thread visualization.
 * Shows after the user has 3+ days of check-in data.
 * Displays morning/midday/evening dots + strength bars for each day.
 */

import React from "react";
import { trpc } from "@/lib/trpc";
import { format, parseISO } from "date-fns";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDayLabel(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, "EEE").slice(0, 3);
  } catch {
    return "—";
  }
}

export function ThreadView() {
  const { data: threadData, isLoading } = trpc.checkIns.weeklyThreadData.useQuery();
  const [toastShown, setToastShown] = React.useState(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("thread_unlock_toast_shown") === "1"
  );

  React.useEffect(() => {
    if (!threadData || toastShown) return;
    const activeDays = threadData.filter((d) => d.morning || d.midday || d.evening).length;
    if (activeDays >= 3) {
      import("sonner").then(({ toast }) => {
        toast("Your thread is taking shape", {
          description: "3 active days — your continuity is building.",
          duration: 5000,
        });
      });
      localStorage.setItem("thread_unlock_toast_shown", "1");
      setToastShown(true);
    }
  }, [threadData, toastShown]);

  if (isLoading) {
    return (
      <div style={{
        background: "oklch(0.12 0.02 270)",
        borderRadius: 16,
        padding: "16px 14px",
        border: "1px solid oklch(0.20 0.03 270)",
        opacity: 0.6,
      }}>
        <div style={{
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "oklch(0.42 0.01 270)",
          fontFamily: "Inter, sans-serif",
        }}>
          Loading thread…
        </div>
      </div>
    );
  }

  if (!threadData || threadData.length === 0) return null;

  // Only show if user has 3+ days with at least one check-in
  const daysWithData = threadData.filter((d) => d.morning || d.midday || d.evening).length;
  if (daysWithData < 3) return null;

  const totalStrength = threadData.reduce((sum, d) => sum + d.strength, 0);
  const avgStrength = Math.round(totalStrength / threadData.length);

  return (
    <div style={{
      background: "oklch(0.12 0.02 270)",
      borderRadius: 16,
      padding: "16px 14px 14px",
      border: "1px solid oklch(0.20 0.03 270)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "oklch(0.88 0.005 270)",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.01em",
          }}>
            Your thread this week
          </div>
          <div style={{
            fontSize: 11,
            color: "oklch(0.45 0.01 270)",
            fontFamily: "Inter, sans-serif",
            marginTop: 2,
          }}>
            {daysWithData} of 7 days active
          </div>
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: avgStrength >= 70
              ? "oklch(0.72 0.15 150)"
              : avgStrength >= 40
              ? "oklch(0.75 0.14 270)"
              : "oklch(0.55 0.01 270)",
            fontFamily: "Inter, sans-serif",
            lineHeight: 1,
          }}>
            {avgStrength}%
          </div>
          <div style={{
            fontSize: 10,
            color: "oklch(0.42 0.01 270)",
            fontFamily: "Inter, sans-serif",
            marginTop: 2,
          }}>
            thread strength
          </div>
        </div>
      </div>

      {/* Day columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {threadData.map((day, i) => {
          const isToday = i === threadData.length - 1;
          const hasAny = day.morning || day.midday || day.evening;
          return (
            <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {/* Day label */}
              <div style={{
                fontSize: 9,
                color: isToday ? "oklch(0.75 0.14 270)" : "oklch(0.38 0.01 270)",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.04em",
                fontWeight: isToday ? 700 : 400,
              }}>
                {getDayLabel(day.date)}
              </div>

              {/* Check-in dots: morning / midday / evening */}
              {[
                { has: day.morning, color: "oklch(0.62 0.14 270)", glow: "oklch(0.62 0.14 270 / 0.5)" },
                { has: day.midday, color: "oklch(0.72 0.15 150)", glow: "oklch(0.72 0.15 150 / 0.4)" },
                { has: day.evening, color: "oklch(0.65 0.14 30)", glow: "oklch(0.65 0.14 30 / 0.4)" },
              ].map((slot, si) => (
                <div key={si} style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: slot.has ? slot.color : "oklch(0.20 0.02 270)",
                  boxShadow: slot.has ? `0 0 5px 2px ${slot.glow}` : "none",
                  transition: "background 0.3s ease-out",
                }} />
              ))}

              {/* Strength bar */}
              <div style={{
                width: "100%",
                height: 28,
                borderRadius: 4,
                background: "oklch(0.16 0.03 270)",
                overflow: "hidden",
                position: "relative",
                marginTop: 2,
              }}>
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${day.strength}%`,
                  background: !hasAny
                    ? "oklch(0.20 0.02 270)"
                    : day.strength === 100
                    ? "linear-gradient(to top, oklch(0.62 0.14 270), oklch(0.75 0.16 270))"
                    : day.strength >= 67
                    ? "linear-gradient(to top, oklch(0.50 0.11 270), oklch(0.62 0.14 270))"
                    : "linear-gradient(to top, oklch(0.35 0.08 270), oklch(0.45 0.10 270))",
                  borderRadius: 4,
                  transition: "height 0.8s ease-out",
                }} />
                {isToday && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    border: "1px solid oklch(0.75 0.14 270 / 0.4)",
                    borderRadius: 4,
                    pointerEvents: "none",
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex",
        gap: 12,
        marginTop: 10,
        justifyContent: "center",
      }}>
        {[
          { color: "oklch(0.62 0.14 270)", label: "Morning" },
          { color: "oklch(0.72 0.15 150)", label: "Midday" },
          { color: "oklch(0.65 0.14 30)", label: "Evening" },
        ].map((item) => (
          <div key={item.label} style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: item.color,
            }} />
            <span style={{
              fontSize: 9,
              color: "oklch(0.40 0.01 270)",
              fontFamily: "Inter, sans-serif",
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
