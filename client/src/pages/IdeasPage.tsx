import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";
import { getLocalDateStr } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, PenLine, ListTodo, Loader2, Lightbulb } from "lucide-react";

export default function IdeasPage() {
  const localDate = useMemo(() => getLocalDateStr(), []);
  const utils = trpc.useUtils();

  const { data: ideas, isLoading } = trpc.ai.listIdeas.useQuery(undefined, {
    staleTime: 30_000,
  });

  const deleteMutation = trpc.ai.deleteIdea.useMutation({
    onMutate: async ({ id }: { id: number }) => {
      await utils.ai.listIdeas.cancel();
      const prev = utils.ai.listIdeas.getData();
      utils.ai.listIdeas.setData(undefined, (old) => old?.filter((i) => i.id !== id) ?? []);
      return { prev };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { prev?: ReturnType<typeof utils.ai.listIdeas.getData> } | undefined) => {
      if (ctx?.prev) utils.ai.listIdeas.setData(undefined, ctx.prev);
      notify.error("Couldn't delete idea. Try again.");
    },
    onSettled: () => utils.ai.listIdeas.invalidate(),
  });

  const addToScratchMutation = trpc.scratchPad.create.useMutation({
    onSuccess: () => {
      notify.saved("Added to Scratch Pad.");
      utils.scratchPad.list.invalidate();
    },
    onError: () => notify.error("Couldn't add to Scratch Pad."),
  });

  const { data: todayPlan } = trpc.dailyPlan.getToday.useQuery(
    { localDate },
    { staleTime: 30_000 }
  );

  const addToTasksMutation = trpc.dailyPlan.updateTasks.useMutation({
    onSuccess: () => {
      notify.saved("Added to today's task list.");
      utils.dailyPlan.getToday.invalidate();
    },
    onError: () => notify.error("Couldn't add task."),
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  function handleAddToTasks(idea: { id: number; rawContent: string; parsedIntent?: string | null }) {
    const currentTasks: Array<{ id: string; title: string; done: boolean; projectId: null; energyLevel: "any" }> =
      todayPlan?.criticalTasks ? JSON.parse(todayPlan.criticalTasks as string) : [];
    const title = (idea.parsedIntent ?? idea.rawContent).substring(0, 200);
    const newTask = {
      id: `idea-${idea.id}-${Date.now()}`,
      title,
      done: false,
      projectId: null as null,
      energyLevel: "any" as const,
    };
    addToTasksMutation.mutate({
      date: localDate,
      criticalTasks: [...currentTasks, newTask],
    });
  }

  function handleAddToScratch(idea: { rawContent: string }) {
    addToScratchMutation.mutate({ content: idea.rawContent });
  }

  function handleDelete(id: number) {
    if (confirmDelete === id) {
      deleteMutation.mutate({ id });
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.22 0.04 65)" }}>
          <Sparkles className="w-4 h-4" style={{ color: "oklch(0.80 0.17 65)" }} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Ideas</h1>
          <p className="text-xs text-muted-foreground">Captured thoughts waiting to become something</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !ideas || ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Lightbulb className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No ideas captured yet.</p>
          <p className="text-xs text-muted-foreground/60">Use the sparkle button anywhere in the app to capture a thought.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="rounded-xl p-4 border border-border"
              style={{ background: "oklch(0.14 0.025 65 / 0.6)" }}
            >
              {idea.parsedIntent && (
                <p className="text-sm font-medium text-foreground mb-1 leading-snug">
                  {idea.parsedIntent}
                </p>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                {idea.rawContent}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                {new Date(idea.createdAt).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => handleAddToTasks(idea)}
                  disabled={addToTasksMutation.isPending}
                >
                  <ListTodo className="w-3 h-3" />
                  Add to tasks
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => handleAddToScratch(idea)}
                  disabled={addToScratchMutation.isPending}
                >
                  <PenLine className="w-3 h-3" />
                  Add to scratch
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs gap-1.5 ${confirmDelete === idea.id ? "text-red-400 hover:text-red-300" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => handleDelete(idea.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                  {confirmDelete === idea.id ? "Confirm?" : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
