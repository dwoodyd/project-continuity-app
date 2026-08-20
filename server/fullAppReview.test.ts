import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("full app review remediation", () => {
  it("uses semantic sidebar and Daily Rhythm colors in both themes", () => {
    const layout = source("client/src/components/AppLayout.tsx");
    const home = source("client/src/pages/Home.tsx");
    expect(layout).toContain('background: "var(--brand-muted)"');
    expect(layout).toContain('color: "var(--sidebar-foreground)"');
    expect(layout).toContain('color: "var(--muted-foreground)"');
    expect(home).toContain('background: "var(--muted)"');
    expect(home).toContain('color: completed ? "var(--muted-foreground)"');
    expect(home).toContain('highlighted ? "var(--accent-tint-text)"');
  });

  it("keeps user-facing copy free of internal phrasing and stale assertions", () => {
    const ideas = source("client/src/pages/IdeasPage.tsx");
    const ai = source("server/routers/ai.ts");
    const loops = source("client/src/pages/OpenLoopsPage.tsx");
    const intelligence = source("server/routers/intelligence.ts");
    const compass = source("client/src/pages/WeeklyCompassPage.tsx");
    expect(ideas).toContain('replace(/^the user wants to\\s*/i, "You want to ")');
    expect(ai).toContain("never write ‘The user wants to…’");
    expect(loops).not.toContain("open_loop thought");
    expect(intelligence).toContain("never use management jargon");
    expect(compass).toContain("needsFreshCompass");
    expect(compass).toContain("!needsFreshCompass");
  });

  it("advances Cycle predictions and protects private scratch content in the Return Brief", () => {
    const moodLogs = source("server/routers/moodLogs.ts");
    const home = source("client/src/pages/Home.tsx");
    expect(moodLogs).toContain("while (d < today)");
    expect(home).toContain("You left yourself a note. It is waiting in Scratch Pad");
    expect(home).not.toContain("“{lastWrittenLine}”");
  });

  it("retains Evidence Log's hero as its only update source", () => {
    const evidence = source("client/src/pages/EvidenceLogPage.tsx");
    expect(evidence).toContain('title="This is your record. Every entry is proof."');
    expect(evidence).toContain("the immersive hero already owns the page title and update action");
    expect(evidence).not.toContain("<PageHeader");
  });
});
