import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("New User Polish build", () => {
  it("persists a browser timezone and resolves member-facing clocks from it", () => {
    const schema = source("drizzle", "schema.ts");
    const appLayout = source("client", "src", "components", "AppLayout.tsx");
    const memberTime = source("client", "src", "lib", "memberTime.ts");
    const serverTime = source("server", "utils", "dateUtils.ts");
    expect(schema).toContain("timezoneDetectedAt");
    expect(appLayout).toContain("captureTimezone");
    expect(memberTime).toContain("Intl.DateTimeFormat");
    expect(serverTime).toContain("getNowInTimezone");
  });

  it("uses truthful return language and a one-time first-engagement invitation rather than scorekeeping", () => {
    const home = source("client", "src", "pages", "Home.tsx");
    const gamification = source("server", "routers", "gamification.ts");
    expect(home).toContain("firstEngagementInviteSeen");
    expect(home).toContain("This is your workspace. Start with a check-in when you are ready.");
    expect(home).not.toContain("Getting started ·");
    expect(home).not.toContain("doneCount");
    expect(gamification).not.toContain("Three days away.");
    expect(gamification).not.toContain("A week away.");
    expect(gamification).not.toContain("Seven days.");
  });

  it("standardizes paused and parked work as Quietly Waiting", () => {
    const projects = source("client", "src", "pages", "ProjectsPage.tsx");
    const vault = source("client", "src", "pages", "VaultPage.tsx");
    const graph = source("client", "src", "components", "VaultGraph.tsx");
    expect(projects).toContain('paused: { label: "Quietly Waiting"');
    expect(vault).toContain('parked: { label: "Quietly Waiting"');
    expect(graph).toContain('label: "Quietly Waiting"');
  });

  it("explains Evidence value when empty and does not offer export without entries", () => {
    const evidence = source("client", "src", "pages", "EvidenceLogPage.tsx");
    expect(evidence).toContain("const hasEvidence = totalSessions > 0");
    expect(evidence).toContain("first identity sentence will appear here");
    expect(evidence).toContain("{hasEvidence && <Button");
  });

  it("gives manual-mode members a consent-aware path at primary AI entry points", () => {
    const gate = source("client", "src", "hooks", "useAiConsentGate.ts");
    expect(gate).toContain("AI is currently off.");
    expect(gate).toContain("Enable AI");
    for (const page of ["WeeklyCompassPage.tsx", "EvidenceLogPage.tsx", "ClarityEnginePage.tsx", "WeeklyReviewPage.tsx", "VaultPage.tsx"]) {
      expect(source("client", "src", "pages", page)).toContain("useAiConsentGate");
    }
    expect(source("client", "src", "components", "UnstickModal.tsx")).toContain("useAiConsentGate");
    expect(source("client", "src", "components", "FirstMovableStepModal.tsx")).toContain("useAiConsentGate");
  });

  it("uses managed media for ordinary Wren scenes while retaining the protected Focus clip path", () => {
    const clips = source("client", "src", "lib", "wrenClips.ts");
    const player = source("client", "src", "components", "WrenPlayer.tsx");
    const scene = source("client", "src", "components", "IntroWrenScene.tsx");
    expect(clips).toContain("MANAGED_WREN_VIDEO");
    expect(player).toContain("isProtectedFocusClip");
    expect(player).toContain('clip === "weaving" || clip === "reading" || clip === "lookingup"');
    expect(scene).toContain("resolvedSrc");
  });
});
