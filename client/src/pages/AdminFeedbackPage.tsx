import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bug, Lightbulb, HelpCircle, MoreHorizontal, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import notify from "@/lib/notify";

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  bug:        { label: "Bug",      icon: <Bug className="w-3.5 h-3.5" />,            color: "text-red-400 bg-red-500/10 border-red-500/20" },
  suggestion: { label: "Idea",     icon: <Lightbulb className="w-3.5 h-3.5" />,      color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  question:   { label: "Question", icon: <HelpCircle className="w-3.5 h-3.5" />,     color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  other:      { label: "Other",    icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
};

export default function AdminFeedbackPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [filter, setFilter] = useState("open");
  const [catFilter, setCatFilter] = useState("all");

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.feedback.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const resolveMutation = trpc.feedback.resolve.useMutation({
    onMutate: async ({ id, resolved }) => {
      await utils.feedback.list.cancel();
      const prev = utils.feedback.list.getData();
      utils.feedback.list.setData(undefined, (old: any) =>
        old?.map((i: any) => i.id === id ? { ...i, resolved, resolvedAt: resolved ? new Date() : null } : i)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      utils.feedback.list.setData(undefined, ctx?.prev);
      notify.error("Failed to update");
    },
    onSettled: () => utils.feedback.list.invalidate(),
  });

  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">
        Access restricted to admins.
      </div>
    );
  }

  const byStatus = filter === "open"
    ? (items as any[]).filter((i: any) => !i.resolved)
    : (items as any[]).filter((i: any) => i.resolved);

  const filtered = catFilter === "all" ? byStatus : byStatus.filter((i: any) => i.category === catFilter);

  const openCount = (items as any[]).filter((i: any) => !i.resolved).length;
  const resolvedCount = (items as any[]).filter((i: any) => i.resolved).length;

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
            <p className="text-xs text-muted-foreground">{openCount} open · {resolvedCount} resolved</p>
          </div>
        </div>

        {/* Open / Resolved toggle */}
        <div className="flex gap-2 mb-4">
          {[["open", `Open (${openCount})`], ["resolved", `Resolved (${resolvedCount})`]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >{label}</button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {["all", "bug", "suggestion", "question", "other"].map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  catFilter === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {meta?.icon}
                {meta?.label ?? "All"}
              </button>
            );
          })}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-12">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-12">
            {filter === "open" ? "No open feedback — inbox zero! 🎉" : "Nothing resolved yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item: any) => {
              const meta = CATEGORY_META[item.category] ?? CATEGORY_META.other;
              const date = new Date(item.createdAt).toLocaleString();
              return (
                <div key={item.id} className={`rounded-xl border bg-card p-4 space-y-2 transition-opacity ${item.resolved ? "opacity-60 border-border/50" : "border-border"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
                      {meta.icon}{meta.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{date}</span>
                      <button
                        onClick={() => resolveMutation.mutate({ id: item.id, resolved: !item.resolved })}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                          item.resolved
                            ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            : "border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30"
                        }`}
                        title={item.resolved ? "Mark as open" : "Mark as resolved"}
                      >
                        {item.resolved
                          ? <><CheckCircle2 className="w-3 h-3" /> Resolved</>
                          : <><Circle className="w-3 h-3" /> Resolve</>
                        }
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{item.message}</p>
                  {item.userName && (
                    <p className="text-xs text-muted-foreground">— {item.userName}</p>
                  )}
                  {item.deviceInfo && (
                    <p className="text-[10px] text-muted-foreground/50 font-log truncate">{item.deviceInfo}</p>
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
