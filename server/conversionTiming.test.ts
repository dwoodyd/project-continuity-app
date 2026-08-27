import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("conversion timing", () => {
  it("requires earned activation from check-ins, completed Focus, or a genuine return event", () => {
    const conversion = source("server", "routers", "conversion.ts");
    expect(conversion).toContain("Number(checkInCount?.count ?? 0) >= 3");
    expect(conversion).toContain("eq(focusSessions.wasCompleted, 1)");
    expect(conversion).toContain('like(continuityEvents.eventType, "return_%")');
    expect(conversion).toContain("hasActivated && !hasPaidAccess");
  });

  it("keeps every shared invitation dismissible, pricing-routed, and absent before activation", () => {
    const nudge = source("client", "src", "components", "UpgradeNudge.tsx");
    expect(nudge).toContain("conversion?.isEligibleForUpgrade");
    expect(nudge).toContain("continuary_upgrade_prompt_seen");
    expect(nudge).toContain('href="/pricing"');
    expect(nudge).toContain("Dismiss upgrade invitation");
    expect(nudge).toContain("!alreadyPrompted || friction");
  });

  it("places value-named invitations at the Free Focus weekly limit and Pro book-ahead request", () => {
    const focus = source("client", "src", "pages", "FocusSessionsPage.tsx");
    const singleFocus = source("client", "src", "pages", "StudyTrackerPage.tsx");
    const clarity = source("client", "src", "pages", "ClarityEnginePage.tsx");
    expect(focus).toContain('moment="focus-weekly-limit"');
    expect(focus).toContain("You have used this week’s Focus Session.");
    expect(focus).toContain('moment="book-ahead"');
    expect(focus).toContain("Book ahead when the moment is right.");
    expect(focus).toContain('moment="wren-popout"');
    expect(focus).toContain("Take Wren with you when you switch windows.");
    expect(singleFocus).toContain('moment="single-focus-duration"');
    expect(singleFocus).toContain("finalDuration > 60");
    expect(clarity).toContain('moment="clarity-limit"');
    expect(clarity).toContain("setShowClarityUpgrade(true)");
  });

  it("invites only after—not instead of—the free Return Brief and first Evidence identity sentence", () => {
    const home = source("client", "src", "pages", "Home.tsx");
    const evidence = source("client", "src", "pages", "EvidenceLogPage.tsx");
    expect(home).toContain('moment="return-brief"');
    expect(home).toContain("It holds your thread so coming back is never a rebuild.");
    expect(evidence).toContain("const showFirstIdentityInvite = identitySentenceCount === 1");
    expect(evidence).toContain('moment="first-evidence-sentence"');
  });

  it("uses a dismissible founding-rate safety net and never frames it as loss of work", () => {
    const trialInvite = source("client", "src", "components", "FoundingRateInvite.tsx");
    expect(trialInvite).toContain("conversion.trialClosing");
    expect(trialInvite).toContain("Keep your founding rate.");
    expect(trialInvite).toContain("remains yours");
    expect(trialInvite).toContain("Not now");
    expect(trialInvite).not.toContain("lose access");
  });
});
