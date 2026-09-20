import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CalendarDays, ChevronLeft, ClipboardList, Focus, GraduationCap, Loader2 } from "lucide-react";
import { Link } from "wouter";

type DetailProps = {
  label: string;
  value?: string | null;
};

function Detail({ label, value }: DetailProps) {
  if (!value?.trim()) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{value}</dd>
    </div>
  );
}

function dateLabel(value?: string | Date | null) {
  if (!value) return "Undated";
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return Number.isNaN(date.getTime()) ? "Undated" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminStudyPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: dayLogs, isLoading: dayLogsLoading } = trpc.study.getDayLogs.useQuery(undefined, { enabled: isAdmin });
  const { data: focusBlocks, isLoading: focusBlocksLoading } = trpc.study.getFocusBlocks.useQuery(undefined, { enabled: isAdmin });
  const { data: weeklyReviews, isLoading: reviewsLoading } = trpc.study.getWeeklyReviews.useQuery(undefined, { enabled: isAdmin });

  const sortedDayLogs = useMemo(() => [...(dayLogs ?? [])].sort((a, b) => b.dayNum - a.dayNum), [dayLogs]);
  const sortedFocusBlocks = useMemo(() => [...(focusBlocks ?? [])].sort((a, b) => b.logDate.localeCompare(a.logDate)), [focusBlocks]);
  const sortedReviews = useMemo(() => [...(weeklyReviews ?? [])].sort((a, b) => b.weekNum - a.weekNum), [weeklyReviews]);
  const completedDays = sortedDayLogs.filter((log) => log.completedAt).length;
  const loadingData = dayLogsLoading || focusBlocksLoading || reviewsLoading;

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <main id="main-content" className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Study Tracker</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">This personal tracker is available to the account owner only.</p>
        <Link href="/" className="mt-6 inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground">Back to Today</Link>
      </main>
    );
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground"><GraduationCap className="h-7 w-7 text-primary" /> Study Tracker</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">The owner’s separate learning record: daily study notes, focus blocks, and weekly reviews. This is distinct from member-facing Single Focus Mode.</p>
        </div>
        <Link href="/study" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Open Single Focus Mode</Link>
      </header>

      {loadingData ? (
        <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <section aria-label="Study tracker summary" className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4"><CalendarDays className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-semibold text-foreground">{completedDays}</p><p className="text-sm text-muted-foreground">completed daily records</p></div>
            <div className="rounded-2xl border border-border bg-card p-4"><Focus className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-semibold text-foreground">{sortedFocusBlocks.length}</p><p className="text-sm text-muted-foreground">saved focus blocks</p></div>
            <div className="rounded-2xl border border-border bg-card p-4"><ClipboardList className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-semibold text-foreground">{sortedReviews.length}</p><p className="text-sm text-muted-foreground">weekly reviews</p></div>
          </section>

          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Daily study record</h2></div>
            {sortedDayLogs.length ? <div className="grid gap-3 lg:grid-cols-2">{sortedDayLogs.map((log) => <article key={log.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Day {log.dayNum}</p><h3 className="mt-1 font-semibold text-foreground">{dateLabel(log.logDate)}</h3></div>{log.completedAt ? <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-300">Completed</Badge> : <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-300">In progress</Badge>}</div><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label="First move" value={log.firstMove} /><Detail label="Capacity" value={log.capacity} /><Detail label="What moved" value={log.whatMoved} /><Detail label="What I learned" value={log.whatLearned} /><Detail label="What I built" value={log.whatBuilt} /><Detail label="Still fuzzy" value={log.stillFuzzy} /><Detail label="Return step" value={log.returnStep} /><Detail label="Carry forward" value={log.carryForward} /></dl></article>)}</div> : <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No daily study records have been saved yet.</p>}
          </section>

          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2"><Focus className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Focus blocks</h2></div>
            {sortedFocusBlocks.length ? <div className="space-y-3">{sortedFocusBlocks.map((block) => <article key={block.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{dateLabel(block.logDate)}</p><h3 className="mt-1 font-semibold text-foreground">{block.intention || block.lesson || "Focus block"}</h3></div><p className="text-sm text-muted-foreground">{[block.startTime, block.duration].filter(Boolean).join(" · ") || "Time not recorded"}</p></div><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label="Lesson" value={block.lesson} /><Detail label="Tiny project" value={block.tinyProject} /><Detail label="Actual work" value={block.actualWork} /><Detail label="What moved" value={block.whatMoved} /><Detail label="Drifted where" value={block.driftedWhere} /><Detail label="Return point" value={block.returnPoint} /><Detail label="Next step" value={block.nextStep} /></dl></article>)}</div> : <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No focus blocks have been saved yet.</p>}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Weekly reviews</h2></div>
            {sortedReviews.length ? <div className="grid gap-3 lg:grid-cols-2">{sortedReviews.map((review) => <article key={review.id} className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Week {review.weekNum}</p><dl className="mt-4 grid gap-4"><Detail label="Meaningful movement" value={review.meaningfulMovement} /><Detail label="Lessons completed" value={review.lessonsCompleted} /><Detail label="Builds completed" value={review.buildsCompleted} /><Detail label="What helped" value={review.whatHelped} /><Detail label="Still fuzzy" value={review.stillFuzzy} /><Detail label="Open loop" value={review.openLoop} /><Detail label="Start here next" value={review.startHereNext} /></dl></article>)}</div> : <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No weekly study reviews have been saved yet.</p>}
          </section>
        </>
      )}
    </main>
  );
}
