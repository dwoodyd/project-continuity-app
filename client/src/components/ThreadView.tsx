/**
 * ThreadView — Real-data weekly thread visualization.
 * Shows after the user has 3+ days of check-in data.
 * Displays morning/midday/evening dots for each day.
 * NO percentages, NO streak counts — named states only.
 */

import React from "react";
import { trpc } from "@/lib/trpc";
import { format, parseISO } from "date-fns";

function getDayLabel(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, "EEE").slice(0, 3);
  } catch {
    return "—";
  }
}

/** Map a numeric strength score to a named state — no digits ever shown */
function strengthToState(score: number): string {
  if (score >= 80) return "Woven";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Holding";
  if (score >= 20) return "Thin";
  return "Fraying";
}

/** A short warm sentence for the sub-header — no counts, no % */
function weekSentence(daysWithData: number): string {
  if (daysWithData >= 6) return "You've been here almost every day.";
  if (daysWithData >= 4) return "You've returned several times this week.";
  if (daysWithData >= 3) return "You've checked in a few times this week.";
  return "The thread is here whenever you are.";
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
          description: "You've returned a few times — your continuity is building.",
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

  const daysWithData = threadData.filter((d) => d.morning || d.midday || d.evening).length;
  if (daysWithData < 3) return null;

  const totalStrength = threadData.reduce((sum, d) => sum + d.strength, 0);
  const avgStrength = Math.round(totalStrength / threadData.length);
  const stateName = strengthToState(avgStrength);

  return (
    <div style={{
      background: "oklch(0.12 0.02 270)",
      borderRadius: 16,
      padding: "16px 14px 14px",
      border: "1px solid oklch(0.20 0.03 270)",
    }}>
      {/* Header — named state only, no % or count */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
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
            {weekSentence(daysWithData)}
          </div>
        </div>
        {/* Named state badge — no number */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: "oklch(0.74 0.14 72)",
          fontFamily: "Inter, sans-serif",
          background: "oklch(0.74 0.14 72 / 0.10)",
          border: "1px solid oklch(0.74 0.14 72 / 0.22)",
          borderRadius: 20,
          padding: "2px 10px",
          whiteSpace: "nowrap",
        }}>
          {stateName}
        </div>
      </div>

      {/* Day columns — dots only, no strength bars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {threadData.map((day, i) => {
          const isToday = i === threadData.length - 1;
          return (
            <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              {/* Day label */}
              <div style={{
                fontSize: 9,
                color: isToday ? "oklch(0.74 0.14 72)" : "oklch(0.38 0.01 270)",
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
