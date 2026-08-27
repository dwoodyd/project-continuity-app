import { describe, expect, it } from "vitest";
import {
  DASHBOARD_MODULES,
  normalizeDashboardLayout,
  presentationOrder,
} from "../client/src/lib/dashboardModules";

describe("dashboard layout preferences", () => {
  it("uses the calm default module sequence when no preference exists", () => {
    const layout = normalizeDashboardLayout(null);
    expect(layout.hidden).toEqual([
      "daily_rhythm",
      "thread_strength",
      "quietly_waiting",
      "emotional_cycle",
      "knowledge_graph",
      "pattern_detected",
      "recent_decisions",
      "mode",
    ]);
    expect(layout.order).toEqual(DASHBOARD_MODULES.map((module) => module.key));
  });

  it("keeps valid saved choices and appends any newly introduced module keys", () => {
    const layout = normalizeDashboardLayout({
      hidden: ["knowledge_graph", "unknown" as any],
      order: ["projects", "tasks", "unknown" as any],
    });

    expect(layout.hidden).toEqual(["knowledge_graph"]);
    expect(layout.order.slice(0, 2)).toEqual(["projects", "tasks"]);
    expect(layout.order).toContain("mode");
  });

  it("applies explicit reordering consistently", () => {
    const layout = normalizeDashboardLayout({ hidden: [], order: ["projects", "tasks"] });
    expect(presentationOrder("projects", layout)).toBe(10);
    expect(presentationOrder("tasks", layout)).toBe(20);
  });
});
