import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Replay Intro and Tour routing", () => {
  it("routes Replay Intro into the attached /intro onboarding overlay and returns to Today on completion", () => {
    const app = source("client/src/App.tsx");
    expect(app).toContain('window.history.pushState({}, "", "/intro")');
    expect(app).toContain('window.history.replaceState({}, "", "/")');
    expect(app).toContain('<Route path="/intro">{() => null}</Route>');
    expect(app).toContain('<OnboardingPageWithCallback onDone={handleOnboardingDone} />');
  });

  it("keeps the public Tour route and a direct Settings entry point available", () => {
    const app = source("client/src/App.tsx");
    const settings = source("client/src/pages/SettingsPage.tsx");
    expect(app).toContain('<Route path="/tour" component={TourPage} />');
    expect(settings).toContain('window.location.assign("/tour")');
    expect(settings).toContain('Take the tour');
  });

  it("keeps the Permission to Start post-purchase route public and connected to the first exercise", () => {
    const app = source("client/src/App.tsx");
    const startHere = source("client/src/pages/BookStartHerePage.tsx");
    expect(app).toContain('<Route path="/start-here" component={BookStartHerePage} />');
    expect(startHere).toContain('path="/start-here"');
    expect(startHere).toContain('href="/start"');
    expect(startHere).toContain('href="/apply?source=permission-to-start-start-here"');
  });
});
