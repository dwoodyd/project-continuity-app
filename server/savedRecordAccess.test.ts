import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("saved member records", () => {
  it("provides a dated check-in index, detail read, and owned amendments", () => {
    const router = source("server/routers/checkIns.ts");
    const page = source("client/src/pages/CheckInHistoryPage.tsx");
    const app = source("client/src/App.tsx");

    expect(router).toContain("getHistory: protectedProcedure");
    expect(router).toContain("getById: protectedProcedure");
    expect(router).toContain("amendMorning: protectedProcedure");
    expect(router).toContain("amendMidday: protectedProcedure");
    expect(router).toContain("amendEveningClose: protectedProcedure");
    expect(router).toContain("getCheckInById(input.id, ctx.user.id)");
    expect(page).toContain("trpc.checkIns.getHistory.useQuery");
    expect(page).toContain("trpc.checkIns.getById.useQuery");
    expect(page).toContain("Edit this check-in");
    expect(app).toContain('path="/check-ins/:id"');
    expect(app).toContain('path="/check-ins"');
  });

  it("writes direct check-in links into new Today movement events and keeps older rows useful", () => {
    const home = source("client/src/pages/Home.tsx");
    const feed = source("client/src/components/GamificationLayer.tsx");

    expect(home).toContain("metadata: JSON.stringify({ checkInId })");
    expect(home).toContain('navigate(checkInId ? `/check-ins/${checkInId}` : "/check-ins")');
    expect(feed).toContain("onOpenCheckIn?: (checkInId?: number) => void");
    expect(feed).toContain('JSON.parse(ev.metadata ?? "{}")');
    expect(feed).toContain("onOpenCheckIn(checkInId)");
  });

  it("keeps saved reflection content visible and makes the Court form usable on narrow screens", () => {
    const router = source("server/routers/revisionNine.ts");
    const workspace = source("client/src/pages/RevisionNinePage.tsx");

    expect(router).toContain('db.select().from(readItems).where(eq(readItems.userId, ctx.user.id))');
    expect(router).toContain("history: protectedProcedure.query");
    expect(router).toContain("collapse: router({");
    expect(workspace).toContain("Saved items");
    expect(workspace).toContain("Previously in the register");
    expect(workspace).toContain("Saved thresholds");
    expect(workspace).toContain("Saved fair reads");
    expect(workspace).toContain("Previous canaries");
    expect(workspace).toContain('rows={3} className="min-h-28" value={court.situation}');
    expect(workspace).toContain("evidenceFor");
    expect(workspace).toContain("evidenceAgainst");
  });

  it("labels aggregate Evidence Log tiles instead of presenting them as the current month", () => {
    const evidence = source("client/src/pages/EvidenceLogPage.tsx");
    expect(evidence).toContain("Across saved monthly records");
    expect(evidence).toContain('href="/check-ins"');
  });
});
