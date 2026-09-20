import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("reported production defect regressions", () => {
  it("keeps all five Court fields visible in saved fair reads", () => {
    const workspace = source("client/src/pages/RevisionNinePage.tsx");
    const router = source("server/routers/revisionNine.ts");

    expect(router).toContain("evidenceFor: input.evidenceFor || null");
    expect(router).toContain("evidenceAgainst: input.evidenceAgainst || null");
    expect(router).toContain("nextAction: input.nextAction || null");
    expect(workspace).toContain('Hard story:</span> {entry.evidenceFor || "Not recorded"}');
    expect(workspace).toContain('Also true:</span> {entry.evidenceAgainst || "Not recorded"}');
    expect(workspace).toContain('Fair read:</span> {entry.fairRead}');
    expect(workspace).toContain('Next:</span> {entry.nextAction || "Not recorded"}');
  });

  it("does not expose draft placeholders through the public changelog data", () => {
    const changelog = source("client/src/data/changelog.ts");

    expect(changelog).not.toMatch(/\[Draft\]|draft placeholder|What'?s coming in 2\.0/i);
    expect(changelog).toContain("Public changelog at /changelog");
    expect(changelog).toContain("Unhandled server errors now notify the owner");
  });

  it("scopes Evidence Log tiles and the displayed record to the same selected month", () => {
    const page = source("client/src/pages/EvidenceLogPage.tsx");
    const router = source("server/routers/evidence.ts");

    expect(page).toContain("const [selectedMonth, setSelectedMonth] = useState<string | null>(null)");
    expect(page).toContain("const activeSummary = summaries?.find((summary) => summary.month === activeMonth) ?? null");
    expect(page).toContain("Evidence for {formatMonth(activeMonth)}");
    expect(page).toContain("The tiles and record below always describe the same month.");
    expect(page).toContain("summary={activeSummary}");
    expect(page).not.toContain("Across saved monthly records");
    expect(router).toContain("lt(focusSessions.startedAt, end)");
    expect(router).toContain("lt(checkIns.createdAt, end)");
  });

  it("keeps admin study tracking distinct from member Single Focus Mode", () => {
    const app = source("client/src/App.tsx");
    const adminStudy = source("client/src/pages/AdminStudyPage.tsx");

    expect(app).toContain('const AdminStudyPage      = lazy(() => import("./pages/AdminStudyPage"));');
    expect(app).toContain('<Route path="/study" component={StudyTrackerPage} />');
    expect(app).toContain('<Route path="/admin/study" component={AdminStudyPage} />');
    expect(app).not.toContain('<Route path="/admin/study" component={StudyTrackerPage} />');
    expect(adminStudy).toContain('const isAdmin = user?.role === "admin";');
    expect(adminStudy).toContain("This is distinct from member-facing Single Focus Mode.");
  });
});
