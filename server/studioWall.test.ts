import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectFile = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("Studio Wall regression coverage", () => {
  it("keeps the book exercise no-account and locally persisted", () => {
    const source = projectFile("client/src/pages/BookStartPage.tsx");
    expect(source).toContain("BOOK_EXERCISE_KEY");
    expect(source).toContain("window.localStorage.setItem");
    expect(source).toContain("does not need an account");
    expect(source).toContain("/apply?");
  });

  it("never opens a blank Scratch Pad draft", () => {
    const source = projectFile("client/src/pages/ScratchPadPage.tsx");
    expect(source).toContain("function seededDraft()");
    expect(source).toContain("What I can begin before I feel ready");
    expect(source).toContain("Start today’s draft");
  });

  it("uses the Studio Wall paper, graphite, red-pen, and typewriter system", () => {
    const source = projectFile("client/src/index.css");
    expect(source).toContain("--background: #F4F5F2");
    expect(source).toContain("--foreground: #2A2D28");
    expect(source).toContain("--primary: #C8452B");
    expect(source).toContain(".user-writing { font-family: 'Courier Prime'");
  });

  it("does not duplicate Continuary in browser titles", () => {
    const source = projectFile("client/src/components/PageMeta.tsx");
    expect(source).toContain('title.includes("Continuary")');
  });

  it("states that Markdown export remains free on the public pricing page", () => {
    const source = projectFile("client/src/pages/ProPage.tsx");
    expect(source).toContain("Export as Markdown any time—on every plan, including Free.");
    expect(source).toContain("Markdown export — always free");
  });

  it("links the published Permission to Start editions from the existing app mentions", () => {
    const pricing = projectFile("client/src/pages/ProPage.tsx");
    const exercise = projectFile("client/src/pages/BookStartPage.tsx");
    for (const source of [pricing, exercise]) {
      expect(source).toContain("https://www.soulengineer.online/books");
      expect(source).toContain("https://a.co/d/0bvqj6jD");
      expect(source).toContain('target="_blank"');
      expect(source).toContain('rel="noopener noreferrer"');
    }
    expect(pricing).toContain("now available in");
    expect(exercise).toContain("Permission to Start is now available");
  });

  it("acknowledges plausible reader codes without claiming verification or changing their carry-through", () => {
    const exercise = projectFile("client/src/pages/BookStartPage.tsx");
    expect(exercise).toContain("bookCode.trim().length >= 4");
    expect(exercise).toContain("Reader code noted — welcome.");
    expect(exercise).not.toContain("Reader code verified");
    expect(exercise).toContain('query.set("bookCode", bookCode)');
  });
});
