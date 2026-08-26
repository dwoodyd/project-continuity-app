import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("member Welcome guide", () => {
  const page = read("client/src/pages/WelcomePage.tsx");

  it("uses orientation language and does not repeat pricing, application, or duration parameters", () => {
    expect(page).toContain("Welcome back.");
    expect(page).toContain("Here&apos;s how Continuary works.");
    expect(page).not.toContain("See pricing");
    expect(page).not.toContain("Get Started Free");
    expect(page).not.toContain("25, 50");
    expect(page).not.toContain("10, 30, 60, or 90");
  });

  it("maps every guide section into a practical in-app destination", () => {
    for (const href of ["/", "/evidence", "/clarity", "/compass", "/vault", "/intelligence", "/scratch", "/study", "/focus", "/projects"]) {
      expect(page).toContain(`href: "${href}"`);
    }
    expect(page).toContain("Open your Evidence Log");
    expect(page).toContain("Run a Clarity session");
    expect(page).toContain("Start a Focus Session");
  });

  it("keeps the guide in the authenticated app shell and out of the public sitemap", () => {
    const app = read("client/src/App.tsx");
    const sitemap = read("client/public/sitemap.xml");
    expect(app.indexOf('<AppLayout onPreviewIntro={onPreviewIntro}>')).toBeLessThan(app.indexOf('<Route path="/welcome" component={WelcomePage} />'));
    expect(sitemap).not.toContain("https://app.continuary.app/welcome");
  });
});
