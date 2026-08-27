import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("re-entry thesis build", () => {
  it("gives uncustomized dashboards a minimal default while preserving saved choices", () => {
    const modules = source("client", "src", "lib", "dashboardModules.ts");
    const settings = source("server", "routers", "settings.ts");
    expect(modules).toContain('!["first_step", "tasks", "projects", "scratch_pad"].includes(module.key)');
    expect(modules).toContain("const hidden = savedHidden ?? DEFAULT_DASHBOARD_LAYOUT.hidden");
    expect(settings).toContain("if (!profile?.dashboardLayout) return null");
    expect(modules).toContain("invitation:");
  });

  it("uses the server absence detector to reduce Today to the return brief and one next action", () => {
    const home = source("client", "src", "pages", "Home.tsx");
    expect(home).toContain("trpc.ai.checkAmnesty.useQuery");
    expect(home).toContain("const reentryModeActive = amnestyData?.needsAmnesty === true && !reentrySurfaceRestored");
    expect(home).toContain("You came back. The work is still here.");
    expect(home).toContain("Just give me one thing");
    expect(home).toContain("Restore everything");
    expect(home).toContain("setReentrySurfaceRestored(true)");
  });

  it("keeps Just One Thing secondary on normal days and restores the full space after re-engagement", () => {
    const home = source("client", "src", "pages", "Home.tsx");
    expect(home).toContain("Start morning check-in");
    expect(home).toContain("Need just one thing?");
    expect(home).toContain("setReentrySurfaceRestored(true);");
  });

  it("never lowers the displayed Thread Strength state after a later update", () => {
    const gamification = source("server", "routers", "gamification.ts");
    expect(gamification).toContain("function nonDegradingThreadState");
    expect(gamification).toContain("Math.max(previousIndex, candidateIndex)");
    expect(gamification).toContain("const newState = nonDegradingThreadState(current.state, scoreToState(newScore))");
  });

  it("keeps Welcome member-focused and points members into continuity-oriented in-app spaces", () => {
    const welcome = source("client", "src", "pages", "WelcomePage.tsx");
    expect(welcome).toContain("The place that remembers");
    expect(welcome).toContain("where you were.");
    expect(welcome).toContain("Open Today");
    expect(welcome).toContain("Quietly Waiting");
    expect(welcome).not.toContain("See pricing");
    expect(welcome).not.toContain("Who it’s for");
  });
});
