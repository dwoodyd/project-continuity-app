import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Revision Brief 9 evidence-first layer", () => {
  const home = read("client/src/pages/Home.tsx");
  const unstick = read("client/src/components/UnstickModal.tsx");
  const capture = read("client/src/pages/CapturePage.tsx");
  const app = read("client/src/App.tsx");
  const workspace = read("client/src/pages/RevisionNinePage.tsx");
  const ground = read("client/src/components/GroundModeFlow.tsx");
  const collapse = read("client/src/components/CollapseModeGate.tsx");
  const focus = read("client/src/pages/FocusSessionsPage.tsx");

  it("removes active streak displays while retaining neutral evidence language", () => {
    expect(read("client/src/components/AppLayout.tsx")).not.toContain("milestone-day streak");
    expect(home).not.toContain("streak badge");
    expect(read("client/src/pages/EvidenceLogPage.tsx")).not.toContain("getStreakData.useQuery");
  });

  it("provides a zero-input Ground Mode flow that only renders a member-authored reference", () => {
    expect(ground).toContain("PACED_STEPS");
    expect(ground).toContain("data?.calmStateReference");
    expect(ground).not.toContain("Textarea");
    expect(home).toContain("<GroundModeFlow onExit");
  });

  it("starts Unstick with a threshold fork and offers progressive action paths without calling the AI unstick route", () => {
    expect(unstick).toContain('key: "fear"');
    expect(unstick).toContain('key: "activation"');
    expect(unstick).toContain('key: "physical_floor"');
    expect(unstick).toContain("revisionNine.thresholdPlans.add");
    expect(unstick).not.toContain("trpc.ai.unstickTask");
    expect(unstick).toContain("Still too much");
  });

  it("keeps capture separate from sorting until the member explicitly chooses to sort", () => {
    expect(capture).toContain('intent: "capture"');
    expect(capture).toContain("You do not have to decide what it means right now.");
    expect(capture).toContain("Sort it now");
    expect(capture).not.toContain("navigate(`/capture/${result.id}/sort`)");
  });

  it("registers required durable-workspace routes and member-owned tools", () => {
    for (const route of ["/read", "/waiting", "/threshold-plans", "/court", "/support"]) expect(app).toContain(`path="${route}"`);
    for (const label of ["Today’s color", "Waiting Register", "Find the threshold", "Court", "Calm State Reference", "Collapse mode", "Time sense", "Leave hyperfocus gently", "If / then"]) expect(workspace).toContain(label);
  });

  it("keeps collapse mode deliberately constrained and does not change protected Focus companion playback", () => {
    expect(collapse).toContain("Only three things are available.");
    expect(collapse).toContain("Ground for a moment");
    expect(collapse).toContain("Choose one action");
    expect(collapse).toContain("Leave it for today");
    expect(focus).toContain("WrenPlayer");
    expect(focus).toContain("activity");
  });
});
