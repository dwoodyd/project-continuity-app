/**
 * ThreadView — Weekly thread presence card.
 * Shows after the user has 3+ days of check-in data.
 * Named states only: Gathering · Weaving · Holding — all honored, none judgmental.
 * No heatmap, no streak grid, no dots highlighting absent days.
 */

import React from "react";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";

/** Map a numeric strength score to a non-judgmental named state */
function strengthToState(score: number): "Gathering" | "Weaving" | "Holding" {
  if (score >= 60) return "Holding";
  if (score >= 30) return "Weaving";
  return "Gathering";
}

/** A warm, non-comparative sentence — never mentions what's missing */
function warmSentence(state: "Gathering" | "Weaving" | "Holding"): string {
  switch (state) {
    case "Holding":
      return "You've been here. The thread is strong.";
    case "Weaving":
      return "You're returning. That's the whole thing.";
    case "Gathering":
      return "You showed up. That's where every thread begins.";
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
      notify.info("Your thread is taking shape", {
          description: "You've returned a few times — your continuity is building.",
          duration: 5000,
        });
      localStorage.setItem("thread_unlock_toast_shown", "1");
      setToastShown(true);
    }
  }, [threadData, toastShown]);

  if (isLoading) return null;
  if (!threadData || threadData.length === 0) return null;

  const daysWithData = threadData.filter((d) => d.morning || d.midday || d.evening).length;
  if (daysWithData < 3) return null;

  const totalStrength = threadData.reduce((sum, d) => sum + d.strength, 0);
  const avgStrength = Math.round(totalStrength / threadData.length);
  const state = strengthToState(avgStrength);
  const sentence = warmSentence(state);

  return (
    <div style={{
      background: "oklch(0.12 0.02 240)",
      borderRadius: 16,
      padding: "16px 18px",
      border: "1px solid oklch(0.20 0.03 240)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "oklch(0.88 0.005 240)",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.01em",
            marginBottom: 4,
          }}>
            Your thread this week
          </div>
          <div style={{
            fontSize: 12,
            color: "oklch(0.55 0.01 240)",
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.5,
          }}>
            {sentence}
          </div>
        </div>
        {/* Named state badge — no number, no judgment */}
        <div style={{
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 600,
          color: "oklch(0.74 0.14 72)",
          fontFamily: "Inter, sans-serif",
          background: "oklch(0.74 0.14 72 / 0.10)",
          border: "1px solid oklch(0.74 0.14 72 / 0.22)",
          borderRadius: 20,
          padding: "3px 12px",
          whiteSpace: "nowrap",
        }}>
          {state}
        </div>
      </div>
    </div>
  );
}
