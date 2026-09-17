import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getNowInTimezone } from "../client/src/lib/memberTime";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("September experience fixes", () => {
  it("keeps a Pacific evening in the local date and evening check-in window", () => {
    const memberNow = getNowInTimezone("America/Los_Angeles", new Date("2026-09-17T04:36:00.000Z"));
    expect(memberNow).toEqual({ hour: 21, minute: 36, dateStr: "2026-09-16" });

    const home = read("client/src/pages/Home.tsx");
    expect(home).toContain("const memberTimezone = browserTimezone;");
    expect(home).toContain('const activePeriod: CheckInStep = hour < 12 ? "morning" : hour < 17 ? "midday" : "evening";');
  });

  it("keeps the post-onboarding Wren intro single-play with an explicit Skip button", () => {
    const intro = read("client/src/components/WrenIntroMoment.tsx");
    expect(intro).toContain("onEnded={handleDone}");
    expect(intro).not.toContain("\n            loop\n");
    expect(intro).toContain("Skip intro");
    expect(intro).toContain('background: "rgba(10,12,10,0.72)"');
  });

  it("uses an honest five-step onboarding count and a local date for the initial plan", () => {
    const onboarding = read("client/src/pages/OnboardingPage.tsx");
    for (const step of [1, 2, 3, 4, 5]) {
      expect(onboarding).toContain(`Step ${step} of 5`);
    }
    expect(onboarding).toContain("localDate: getLocalDateStr()");
  });

  it("limits first-day navigation to Today, Capture, Projects, and Focus", () => {
    const layout = read("client/src/components/AppLayout.tsx");
    expect(layout).toContain('const DAY_ONE_NAV_HREFS = ["/", "/capture", "/projects", "/focus"] as const;');
    expect(layout).toContain("const visibleNavGroups = isDayOne");
    expect(layout).toContain("const visiblePrimaryTabs = isDayOne ? DAY_ONE_TABS : PRIMARY_TABS;");
  });

  it("routes public apply back links to the marketing site and personalizes Return Brief previews", () => {
    const apply = read("client/src/pages/ApplyPage.tsx");
    const home = read("client/src/pages/Home.tsx");
    expect(apply).toContain('href="https://continuary.app"');
    expect(apply).not.toContain('Link href="/landing"');
    expect(home).toContain("const returnBriefProject = activeThreadLock?.projectId");
    expect(home).toContain("const returnBriefNextStep = activeThreadLock?.whatNext?.trim()");
    expect(home).toContain("body={returnBriefBody}");
  });

  it("retains failed Today check-ins and exposes a direct retry action", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home.match(/retryRequestRef = useRef/g)).toHaveLength(3);
    expect(home.match(/Your check-in didn't save — tap to retry\./g)).toHaveLength(3);
    expect(home.match(/label: "Tap to retry"/g)).toHaveLength(3);
    expect(home.match(/Your answers are still here\./g)).toHaveLength(3);
  });
});
