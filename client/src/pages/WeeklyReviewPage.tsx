import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Archive,
  Brain,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

export default function WeeklyReviewPage() {
  const [generating, setGenerating] = useState(false);
  const [review, setReview] = useState<string | null>(null);

  const generateReview = trpc.ai.generateWeeklyReview.useMutation({
    onSuccess: (data) => {
      setReview(data.review);
      setGenerating(false);
    },
    onError: () => {
      toast.error("Failed to generate review.");
      setGenerating(false);
    },
  });

  const { data: recentCheckIns } = trpc.checkIns.getRecent.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];
  const completedProjects = projects?.filter((p) => p.status === "completed") ?? [];

  const checkInDays = recentCheckIns?.length ?? 0;
  const morningCheckIns = recentCheckIns?.filter((c) => c.type === "morning").length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Weekly Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(subDays(new Date(), 7), "MMM d")} – {format(new Date(), "MMM d, yyyy")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Check-ins", value: checkInDays, icon: Calendar, sub: "this week" },
          { label: "Active projects", value: activeProjects.length, icon: Brain, sub: "in progress" },
          { label: "Completed", value: completedProjects.length, icon: CheckCircle2, sub: "projects" },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="p-4 rounded-xl bg-card border border-border text-center">
            <Icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xs text-muted-foreground/60">{sub}</p>
          </div>
        ))}
      </div>

      {/* Generate AI Review */}
      {!review ? (
        <div className="p-6 rounded-xl border border-dashed border-border text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Generate your weekly review</p>
          <p className="text-xs text-muted-foreground mb-4">
            AI will analyze your check-ins, projects, and patterns from the past 7 days.
          </p>
          <Button
            onClick={() => { setGenerating(true); generateReview.mutate(); }}
            disabled={generating}
            className="gap-2"
          >
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4" />Generate review</>}
          </Button>
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Weekly Review</p>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{review}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setReview(null); setGenerating(true); generateReview.mutate(); }}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Regenerate
          </Button>
        </div>
      )}

      {/* Recent check-ins */}
      {recentCheckIns && recentCheckIns.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Recent check-ins</p>
          <div className="space-y-2">
            {recentCheckIns.slice(0, 10).map((checkIn) => (
              <div key={checkIn.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                  checkIn.type === "morning" ? "bg-amber-400" : checkIn.type === "midday" ? "bg-blue-400" : "bg-violet-400"
                )} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground capitalize">{checkIn.type}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(checkIn.createdAt), "MMM d")}</p>
                  </div>
                  {checkIn.userInput && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{checkIn.userInput}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
