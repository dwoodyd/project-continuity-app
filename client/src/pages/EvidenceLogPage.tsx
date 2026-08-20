import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { IntroWrenScene } from "@/components/IntroWrenScene";
import { WREN_CLIPS } from "@/lib/wrenClips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import notify from "@/lib/notify";
import { BookOpen, Flame, RefreshCw, TrendingUp, Zap, Heart, ArrowLeft, Share2, Download } from "lucide-react";
import { Link } from "wouter";
import { ShareEvidenceModal } from "@/components/ShareEvidenceModal";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isCurrentMonth(month: string): boolean {
  const _d = new Date(); return month === `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}`;
}

// ─── Streak Heatmap ───────────────────────────────────────────────────────────

function StreakHeatmap({ data }: { data: { date: string; sessionsCount: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No sessions in the last 30 days yet.
      </div>
    );
  }

  // Build a 30-day grid from today backwards
  const today = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const found = data.find((x) => x.date === dateStr);
    days.push({ date: dateStr, count: found?.sessionsCount ?? 0 });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {days.map(({ date, count }) => {
        const intensity =
          count === 0 ? "bg-muted/40" :
          count === 1 ? "bg-amber-500/40" :
          count === 2 ? "bg-amber-500/70" :
          "bg-amber-500";
        return (
          <div
            key={date}
            title={`${date}: ${count} session${count !== 1 ? "s" : ""}`}
            className={`w-5 h-5 rounded-sm ${intensity} transition-colors`}
          />
        );
      })}
    </div>
  );
}

// ─── Evidence Stat Card ───────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-border/60 bg-card/50">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

// ─── Monthly Evidence Card ────────────────────────────────────────────────────

function MonthlyEvidenceCard({
  summary,
  onRegenerate,
  isRegenerating,
}: {
  summary: {
    id: number;
    month: string;
    sessionsStarted: number;
    returnsAfterGap: number;
    hardDaySessions: number;
    genuinePermissions: number;
    summaryLine: string | null;
    generatedAt: Date;
  };
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const isCurrent = isCurrentMonth(summary.month);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {formatMonth(summary.month)}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isCurrent && (
              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                This month
              </Badge>
            )}
            {summary.summaryLine && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-amber-400/70 hover:text-amber-400"
                onClick={() => setShareOpen(true)}
                title="Share your evidence"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRegenerate}
                disabled={isRegenerating}
                title="Refresh summary"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Identity sentence */}
        {summary.summaryLine ? (
          <blockquote className="border-l-2 border-amber-500/60 pl-4 text-sm italic text-foreground/90 leading-relaxed">
            {summary.summaryLine}
          </blockquote>
        ) : summary.sessionsStarted === 0 ? (
          <p className="text-sm text-muted-foreground italic pl-4 border-l-2 border-border">
            No sessions recorded this month.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic pl-4 border-l-2 border-border">
            Summary generating…
          </p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatPill
            icon={Zap}
            label="Sessions"
            value={summary.sessionsStarted}
            description="times you showed up"
          />
          <StatPill
            icon={RefreshCw}
            label="Returns"
            value={summary.returnsAfterGap}
            description="after a gap of 48h+"
          />
          <StatPill
            icon={Heart}
            label="Hard days"
            value={summary.hardDaySessions}
            description="sessions on low-energy days"
          />
          <StatPill
            icon={TrendingUp}
            label="Permissions"
            value={summary.genuinePermissions}
            description="times you stopped at the timer"
          />
        </div>
      </CardContent>

      {/* Share modal */}
      {summary.summaryLine && (
        <ShareEvidenceModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          summaryLine={summary.summaryLine}
          month={summary.month}
        />
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EvidenceLogPage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const utils = trpc.useUtils();

  const { data: summaries, isLoading: summariesLoading, refetch: refetchSummaries } =
    trpc.evidence.getMonthly.useQuery();

  const { data: streakData, isLoading: streakLoading } =
    trpc.evidence.getStreakData.useQuery();

  const generateSummary = trpc.evidence.generateSummary.useMutation({
    onSuccess: () => {
      refetchSummaries();
      notify.saved("Evidence summary updated.");
    },
    onError: () => {
      notify.error("Could not generate summary. Try again in a moment.");
    },
    onSettled: () => setIsGenerating(false),
  });

  const handleGenerateCurrent = async () => {
    setIsGenerating(true);
    generateSummary.mutate({ month: undefined }); // current month
  };

  const handleRegenerate = (month: string) => {
    generateSummary.mutate({ month });
  };

  const totalSessions = summaries?.reduce((acc, s) => acc + s.sessionsStarted, 0) ?? 0;
  const totalReturns = summaries?.reduce((acc, s) => acc + s.returnsAfterGap, 0) ?? 0;
  const totalHardDays = summaries?.reduce((acc, s) => acc + s.hardDaySessions, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <IntroWrenScene
        src={WREN_CLIPS.blobJournal}
        eyebrow="Evidence Log"
        title="This is your record. Every entry is proof."
        body="The record holds what you did when the rest of your mind tries to lose it."
        bleed
        variant="return"
        className="min-h-[min(84vh,860px)] lg:w-[calc(100vw-15rem)] lg:max-w-none"
      >
        <Button
          onClick={handleGenerateCurrent}
          disabled={isGenerating}
          className="bg-[#E8A030] text-[#161815] hover:bg-[#F1B14A]"
        >
          {isGenerating ? "Updating…" : "Update this month"}
        </Button>
      </IntroWrenScene>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Utility row — the immersive hero already owns the page title and update action. */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Today
          </Link>
          <Button
            onClick={async () => {
              try {
                const result = await utils.evidence.exportMarkdown.fetch();
                const blob = new Blob([result.markdown], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const _ed = new Date(); a.download = `continuary-evidence-log-${_ed.getFullYear()}-${String(_ed.getMonth()+1).padStart(2,"0")}-${String(_ed.getDate()).padStart(2,"0")}.md`;
                a.click();
                URL.revokeObjectURL(url);
                notify.saved("Evidence Log exported");
              } catch { notify.error("Export failed"); }
            }}
            size="sm"
            variant="outline"
            className="shrink-0 text-muted-foreground border-border/40 hover:text-foreground"
            title="Export as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>

        {/* All-time summary pills */}
        {!summariesLoading && summaries && summaries.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-card/60 border border-border/40">
              <div className="text-2xl font-bold text-amber-400">{totalSessions}</div>
              <div className="text-xs text-muted-foreground mt-0.5">sessions started</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-card/60 border border-border/40">
              <div className="text-2xl font-bold text-amber-400">{totalReturns}</div>
              <div className="text-xs text-muted-foreground mt-0.5">returns after gaps</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-card/60 border border-border/40">
              <div className="text-2xl font-bold text-amber-400">{totalHardDays}</div>
              <div className="text-xs text-muted-foreground mt-0.5">hard-day sessions</div>
            </div>
          </div>
        )}

        {/* Activity heatmap */}
        <div
          className="p-4 rounded-xl border space-y-1"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-muted-foreground">
            Activity — past year
          </p>
          <ActivityHeatmap />
        </div>

        {/* Monthly summaries */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Monthly record
          </h2>

          {summariesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : summaries && summaries.length > 0 ? (
            <div className="space-y-3">
              {summaries.map((summary) => (
                <MonthlyEvidenceCard
                  key={summary.id}
                  summary={summary}
                  onRegenerate={
                    isCurrentMonth(summary.month)
                      ? () => handleRegenerate(summary.month)
                      : undefined
                  }
                  isRegenerating={isGenerating && generateSummary.variables?.month === summary.month}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Your evidence log is empty. Complete a focus session to start building your record.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Once you have sessions, click "Update this month" to generate your first identity summary.
              </p>
            </div>
          )}
        </div>

        {/* Closing note */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground/60 italic max-w-sm mx-auto leading-relaxed">
            This log doesn't measure what you produced. It measures who you are — someone who keeps showing up, even when it's hard.
          </p>
        </div>
      </div>
    </div>
  );
}
