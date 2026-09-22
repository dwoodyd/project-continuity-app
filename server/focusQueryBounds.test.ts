import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "server/routers/focusSessions.ts"),
  "utf8",
);
const schema = readFileSync(
  resolve(process.cwd(), "drizzle/schema.ts"),
  "utf8",
);

describe("Focus read-query bounds", () => {
  it("cursor-paginates the procedural artifact instead of loading a member's full history", () => {
    const artifact = source.slice(
      source.indexOf("getArtifact: protectedProcedure"),
      source.indexOf("// ── Today stats"),
    );

    expect(artifact).toContain("limit: z.number().int().min(1).max(120).default(120)");
    expect(artifact).toContain(".limit(limit + 1)");
    expect(artifact).toContain("nextCursor:");
    expect(artifact).toContain("COUNT(*)");
  });

  it("uses SQL aggregates for the Focus landing stats", () => {
    const stats = source.slice(
      source.indexOf("getTodayStats: protectedProcedure"),
      source.indexOf("// ── Wren in-session chat"),
    );

    expect(stats).toContain("sql<number>`COUNT(*)`");
    expect(stats).toContain("SUM(CASE WHEN");
    expect(stats).not.toContain(".select().from(focusSessions)");
  });

  it("declares composite access paths for completed-session statistics and pages", () => {
    expect(schema).toContain('index("focus_sessions_user_completed_at_idx").on(table.userId, table.wasCompleted, table.completedAt)');
    expect(schema).toContain('index("focus_sessions_user_completed_started_idx").on(table.userId, table.wasCompleted, table.startedAt, table.id)');
  });
});
