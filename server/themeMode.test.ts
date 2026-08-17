import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("permanent dual-theme contract", () => {
  it("enables persisted theme switching at the application root", () => {
    expect(source("client/src/App.tsx")).toContain('<ThemeProvider defaultTheme="light" switchable>');
    const context = source("client/src/contexts/ThemeContext.tsx");
    expect(context).toContain('localStorage.getItem("theme")');
    expect(context).toContain('localStorage.setItem("theme", theme)');
    expect(context).toContain('prev === "light" ? "dark" : "light"');
  });

  it("keeps intentional Studio Wall tokens for both light and dark modes", () => {
    const css = source("client/src/index.css");
    expect(css).toContain("--background: #F4F5F2");
    expect(css).toContain(".dark {");
    expect(css).toContain("--background: #161815");
    expect(css).toContain("--primary: #E05A43");
  });
});
