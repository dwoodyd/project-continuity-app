/**
 * TomorrowPlanSection
 * A lightweight task-list component used inside the evening check-in to plan
 * tomorrow's activities. Tasks are persisted via trpc.dailyPlan.saveTomorrowPlan.
 */
import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type EnergyLevel = "high" | "low" | "any";

export interface TomorrowTask {
  id: string;
  title: string;
  projectId?: number | null;
  energyLevel?: EnergyLevel;
  estimatedMinutes?: number;
  notes?: string;
}

interface Props {
  /** Called whenever the task list changes so the parent can track state */
  onChange?: (tasks: TomorrowTask[]) => void;
  /** Pre-populated tasks (e.g. from a saved draft) */
  initialTasks?: TomorrowTask[];
  /** If true, auto-saves on every change */
  autoSave?: boolean;
  /** Date to save against (defaults to today on the server) */
  date?: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function TomorrowPlanSection({ onChange, initialTasks = [], autoSave = false, date }: Props) {
  const [tasks, setTasks] = useState<TomorrowTask[]>(initialTasks);
  const [newTitle, setNewTitle] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveMutation = trpc.dailyPlan.saveTomorrowPlan.useMutation({
    onSuccess: () => setSaving(false),
    onError: () => {
      setSaving(false);
      toast.error("Couldn't save tomorrow's plan. Try again.");
    },
  });

  const persist = useCallback(
    (updated: TomorrowTask[]) => {
      if (autoSave) {
        setSaving(true);
        saveMutation.mutate({ tasks: updated, ...(date ? { date } : {}) });
      }
      onChange?.(updated);
    },
    [autoSave, date, onChange, saveMutation]
  );

  const addTask = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const task: TomorrowTask = { id: generateId(), title: trimmed };
    const updated = [...tasks, task];
    setTasks(updated);
    setNewTitle("");
    persist(updated);
  };

  const removeTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    persist(updated);
  };

  const updateTask = (id: string, patch: Partial<TomorrowTask>) => {
    const updated = tasks.map(t => (t.id === id ? { ...t, ...patch } : t));
    setTasks(updated);
    persist(updated);
  };

  const moveTask = (id: string, direction: "up" | "down") => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= tasks.length) return;
    const updated = [...tasks];
    [updated[idx], updated[newIdx]] = [updated[newIdx]!, updated[idx]!];
    setTasks(updated);
    persist(updated);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Tomorrow's activities{" "}
          <span className="font-normal opacity-60">(optional)</span>
        </p>
        {saving && (
          <span className="text-[10px] text-muted-foreground/50 animate-pulse">saving…</span>
        )}
      </div>

      {/* Task list */}
      {tasks.length > 0 && (
        <ul className="space-y-1.5">
          {tasks.map((task, idx) => (
            <li key={task.id} className="rounded-md border border-border/50 bg-muted/20">
              {/* Main row */}
              <div className="flex items-center gap-2 px-2 py-1.5">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveTask(task.id, "up")}
                    disabled={idx === 0}
                    className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 transition-colors"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTask(task.id, "down")}
                    disabled={idx === tasks.length - 1}
                    className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 transition-colors"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Title */}
                <span className="flex-1 text-sm leading-snug truncate">{task.title}</span>

                {/* Energy badge */}
                {task.energyLevel && task.energyLevel !== "any" && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      task.energyLevel === "high"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-indigo-400/15 text-indigo-400"
                    }`}
                  >
                    {task.energyLevel}
                  </span>
                )}

                {/* Time badge */}
                {task.estimatedMinutes && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {task.estimatedMinutes}m
                  </span>
                )}

                {/* Expand / collapse detail */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                  aria-label="Edit details"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeTask(task.id)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                  aria-label="Remove task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded detail row */}
              {expandedId === task.id && (
                <div className="px-3 pb-2 pt-0 grid grid-cols-2 gap-2 border-t border-border/30">
                  {/* Energy level */}
                  <div>
                    <label className="text-[10px] text-muted-foreground/60 block mb-1">Energy</label>
                    <select
                      value={task.energyLevel ?? "any"}
                      onChange={e => updateTask(task.id, { energyLevel: e.target.value as EnergyLevel })}
                      className="w-full text-xs bg-background border border-border/50 rounded px-1.5 py-1 text-foreground"
                    >
                      <option value="any">Any</option>
                      <option value="high">High energy</option>
                      <option value="low">Low energy</option>
                    </select>
                  </div>

                  {/* Estimated time */}
                  <div>
                    <label className="text-[10px] text-muted-foreground/60 block mb-1">Est. time (min)</label>
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={task.estimatedMinutes ?? ""}
                      onChange={e =>
                        updateTask(task.id, {
                          estimatedMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      className="h-7 text-xs"
                      placeholder="e.g. 30"
                    />
                  </div>

                  {/* Notes */}
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground/60 block mb-1">Note <span className="opacity-50">(optional)</span></label>
                    <Input
                      value={task.notes ?? ""}
                      onChange={e => updateTask(task.id, { notes: e.target.value })}
                      className="h-7 text-xs"
                      placeholder="Context, link, or reminder…"
                      maxLength={500}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Empty state hint */}
      {tasks.length === 0 && (
        <p className="text-[11px] text-muted-foreground/40 italic">
          No activities planned yet. Add one below.
        </p>
      )}

      {/* Add new task */}
      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
          placeholder="Add an activity for tomorrow…"
          className="text-sm h-8 flex-1"
          maxLength={500}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addTask}
          disabled={!newTitle.trim()}
          className="h-8 px-2 shrink-0"
          aria-label="Add task"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {tasks.length > 0 && (
        <p className="text-[10px] text-muted-foreground/40">
          Tap the grid icon on any item to set energy level, time estimate, or a note.
        </p>
      )}
    </div>
  );
}
