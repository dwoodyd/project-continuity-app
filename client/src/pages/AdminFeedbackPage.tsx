import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bug, Lightbulb, HelpCircle, MoreHorizontal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  bug:      { label: "Bug",      icon: <Bug className="w-3.5 h-3.5" />,            color: "text-red-400 bg-red-500/10 border-red-500/20" },
  idea:     { label: "Idea",     icon: <Lightbulb className="w-3.5 h-3.5" />,      color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  question: { label: "Question", icon: <HelpCircle className="w-3.5 h-3.5" />,     color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  other:    { label: "Other",    icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
};

export default function AdminFeedbackPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");

  const { data: items = [], isLoading } = trpc.feedback.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">
        Access restricted to admins.
      </div>
    );
  }

  const filtered = filter === "all" ? items : items.filter((i: any) => i.category === filter);
  const counts = (items as any[]).reduce((acc: Record<string, number>, i: any) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Feedback Inbox</h1>
            <p className="text-xs text-muted-foreground">{items.length} submission{items.length !== 1 ? "s" : ""} total</p>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {["all", "bug", "idea", "question", "other"].map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = cat === "all" ? items.length : (counts[cat] || 0);
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {meta?.icon}
                {meta?.label ?? "All"} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-12">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-12">No submissions yet.</div>
        ) : (
          <div className="space-y-3">
            {(filtered as any[]).map((item: any) => {
              const meta = CATEGORY_META[item.category] ?? CATEGORY_META.other;
              const date = new Date(item.createdAt).toLocaleString();
              return (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
                      {meta.icon}{meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{date}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{item.message}</p>
                  {item.userName && (
                    <p className="text-xs text-muted-foreground">— {item.userName}</p>
                  )}
                  {item.deviceInfo && (
                    <p className="text-[10px] text-muted-foreground/50 font-mono truncate">{item.deviceInfo}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
