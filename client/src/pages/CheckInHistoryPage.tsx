import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronRight, FileText, Pencil } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";

const TYPE_LABELS = {
  morning: "Morning check-in",
  midday: "Midday pulse",
  evening: "Evening close",
} as const;

type CheckInType = keyof typeof TYPE_LABELS;

type DetailFieldProps = {
  label: string;
  value?: string | null;
};

function DetailField({ label, value }: DetailFieldProps) {
  if (!value?.trim()) return null;
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{value}</p>
    </section>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function projectValue(value: number | null | undefined) {
  return value ? String(value) : "";
}

export default function CheckInHistoryPage() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const selectedId = Number(params.id ?? "0");
  const hasSelectedId = Number.isInteger(selectedId) && selectedId > 0;
  const { data: history, isLoading: historyLoading } = trpc.checkIns.getHistory.useQuery({ limit: 60 });
  const { data: detail, isLoading: detailLoading } = trpc.checkIns.getById.useQuery(
    { id: selectedId },
    { enabled: hasSelectedId },
  );
  const { data: projects } = trpc.projects.list.useQuery(undefined, { enabled: hasSelectedId });

  const [editing, setEditing] = useState(false);
  const [morning, setMorning] = useState({
    capacityLevel: "partial" as "full" | "partial" | "low",
    primaryProjectId: "",
    secondaryProjectId: "",
    notes: "",
    emotionalState: "",
    mentalLoad: "",
    workLocation: "",
  });
  const [midday, setMidday] = useState({
    workedOn: "",
    wasOnPlan: "true",
    interruptions: "",
    nextMove: "",
    energyLevel: "",
    hungerLevel: "",
  });
  const [evening, setEvening] = useState({
    whatMoved: "",
    whatRemains: "",
    whatLearned: "",
    tomorrowFirst: "",
  });

  const input = (detail?.userInput ?? {}) as Record<string, unknown>;
  const detailType = detail?.type as CheckInType | undefined;

  useEffect(() => {
    if (!detail) {
      setEditing(false);
      return;
    }
    const savedInput = (detail.userInput ?? {}) as Record<string, unknown>;
    setMorning({
      capacityLevel: (detail.plan?.capacityLevel ?? savedInput.capacityLevel ?? "partial") as "full" | "partial" | "low",
      primaryProjectId: projectValue(detail.plan?.primaryProjectId),
      secondaryProjectId: projectValue(detail.plan?.secondaryProjectId),
      notes: typeof savedInput.notes === "string" ? savedInput.notes : "",
      emotionalState: detail.plan?.emotionalState ?? "",
      mentalLoad: detail.plan?.mentalLoad ?? "",
      workLocation: typeof savedInput.workLocation === "string" ? savedInput.workLocation : "",
    });
    setMidday({
      workedOn: typeof savedInput.workedOn === "string" ? savedInput.workedOn : "",
      wasOnPlan: savedInput.wasOnPlan === false ? "false" : "true",
      interruptions: typeof savedInput.interruptions === "string" ? savedInput.interruptions : "",
      nextMove: typeof savedInput.nextMove === "string" ? savedInput.nextMove : "",
      energyLevel: typeof savedInput.energyLevel === "string" ? savedInput.energyLevel : "",
      hungerLevel: typeof savedInput.hungerLevel === "string" ? savedInput.hungerLevel : "",
    });
    setEvening({
      whatMoved: typeof savedInput.whatMoved === "string" ? savedInput.whatMoved : "",
      whatRemains: typeof savedInput.whatRemains === "string" ? savedInput.whatRemains : "",
      whatLearned: typeof savedInput.whatLearned === "string" ? savedInput.whatLearned : "",
      tomorrowFirst: typeof savedInput.tomorrowFirst === "string" ? savedInput.tomorrowFirst : "",
    });
    setEditing(false);
  }, [detail?.id]);

  const afterSave = async () => {
    await Promise.all([
      utils.checkIns.getHistory.invalidate(),
      utils.checkIns.getById.invalidate({ id: selectedId }),
      utils.checkIns.getToday.invalidate(),
      utils.dailyPlan.getTomorrowPlan.invalidate(),
      utils.dailyPlan.getTomorrowBrief.invalidate(),
    ]);
    setEditing(false);
    notify.saved("Check-in updated.");
  };

  const amendMorning = trpc.checkIns.amendMorning.useMutation({
    onSuccess: afterSave,
    onError: () => notify.error("We couldn't update that morning check-in. Your edits are still here."),
  });
  const amendMidday = trpc.checkIns.amendMidday.useMutation({
    onSuccess: afterSave,
    onError: () => notify.error("We couldn't update that midday pulse. Your edits are still here."),
  });
  const amendEvening = trpc.checkIns.amendEveningClose.useMutation({
    onSuccess: afterSave,
    onError: () => notify.error("We couldn't update that evening close. Your edits are still here."),
  });

  const isSaving = amendMorning.isPending || amendMidday.isPending || amendEvening.isPending;
  const sortedProjects = useMemo(() => [...(projects ?? [])].sort((a, b) => a.title.localeCompare(b.title)), [projects]);

  const submitEdit = () => {
    if (!detail) return;
    if (detail.type === "morning") {
      amendMorning.mutate({
        id: detail.id,
        capacityLevel: morning.capacityLevel,
        primaryProjectId: morning.primaryProjectId ? Number(morning.primaryProjectId) : null,
        secondaryProjectId: morning.secondaryProjectId ? Number(morning.secondaryProjectId) : null,
        userNotes: morning.notes,
        emotionalState: morning.emotionalState ? morning.emotionalState as "focused" | "anxious" | "foggy" | "energized" | "drained" : null,
        mentalLoad: morning.mentalLoad ? morning.mentalLoad as "light" | "moderate" | "heavy" : null,
        workLocation: morning.workLocation ? morning.workLocation as "home" | "coffee_shop" | "library" | "office" | "other" : null,
      });
      return;
    }
    if (detail.type === "midday") {
      if (!midday.workedOn.trim()) {
        notify.error("What moved is needed to update this midday pulse.");
        return;
      }
      amendMidday.mutate({
        id: detail.id,
        workedOn: midday.workedOn,
        wasOnPlan: midday.wasOnPlan === "true",
        interruptions: midday.interruptions,
        nextMove: midday.nextMove,
        energyLevel: midday.energyLevel ? midday.energyLevel as "high" | "medium" | "low" : null,
        hungerLevel: midday.hungerLevel ? midday.hungerLevel as "full" | "slightly_hungry" | "hungry" : null,
      });
      return;
    }
    if (!evening.whatMoved.trim() || !evening.tomorrowFirst.trim()) {
      notify.error("What moved and what goes first tomorrow are needed to update this close.");
      return;
    }
    amendEvening.mutate({
      id: detail.id,
      ...evening,
      tomorrowTasks: (detail.tomorrowActivities ?? []).map((task) => ({
        ...task,
        energyLevel: task.energyLevel === "high" || task.energyLevel === "low" || task.energyLevel === "any"
          ? task.energyLevel
          : undefined,
      })),
    });
  };

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your record</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Check-in history</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Your own words stay available here. Open any dated check-in to read it fully or make a correction.</p>
        </div>
        <Link href="/" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Today
        </Link>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <section aria-label="Dated check-in list" className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Saved check-ins</h2>
          </div>
          {historyLoading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading your record…</p>
          ) : history?.length ? (
            <div className="space-y-2">
              {history.map((entry) => {
                const isSelected = entry.id === selectedId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => navigate(`/check-ins/${entry.id}`)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-primary/35 hover:bg-muted/30"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">{TYPE_LABELS[entry.type as CheckInType]}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatDate(entry.date)}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{entry.preview}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">When you save a check-in, its full record will live here.</div>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-border bg-card p-5">
          {!hasSelectedId ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <FileText className="h-9 w-9 text-primary/50" />
              <h2 className="mt-3 font-semibold text-foreground">Choose a saved check-in</h2>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">Open a date on the left to see every response and make a correction if something changed.</p>
            </div>
          ) : detailLoading ? (
            <p className="py-12 text-sm text-muted-foreground">Opening saved check-in…</p>
          ) : detail ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{TYPE_LABELS[detailType ?? "morning"]}</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{formatDate(detail.date)}</h2>
                </div>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit this check-in
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">Correct your own words, then save the same dated record. Nothing is marked updated until the server confirms it.</p>
                  {detail.type === "morning" && (
                    <>
                      <label className="block text-sm font-medium text-foreground">Capacity
                        <select value={morning.capacityLevel} onChange={(event) => setMorning({ ...morning, capacityLevel: event.target.value as typeof morning.capacityLevel })} className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                          <option value="full">Full capacity</option><option value="partial">Partial capacity</option><option value="low">Low capacity</option>
                        </select>
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-foreground">Primary project
                          <select value={morning.primaryProjectId} onChange={(event) => setMorning({ ...morning, primaryProjectId: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">None selected</option>{sortedProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
                        </label>
                        <label className="block text-sm font-medium text-foreground">Secondary project
                          <select value={morning.secondaryProjectId} onChange={(event) => setMorning({ ...morning, secondaryProjectId: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">None selected</option>{sortedProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
                        </label>
                      </div>
                      <label className="block text-sm font-medium text-foreground">Notes
                        <Textarea value={morning.notes} onChange={(event) => setMorning({ ...morning, notes: event.target.value })} rows={3} className="mt-1.5 min-h-24" />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block text-sm font-medium text-foreground">State<select value={morning.emotionalState} onChange={(event) => setMorning({ ...morning, emotionalState: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Not set</option><option value="focused">Focused</option><option value="anxious">Anxious</option><option value="foggy">Foggy</option><option value="energized">Energized</option><option value="drained">Drained</option></select></label>
                        <label className="block text-sm font-medium text-foreground">Load<select value={morning.mentalLoad} onChange={(event) => setMorning({ ...morning, mentalLoad: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Not set</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="heavy">Heavy</option></select></label>
                        <label className="block text-sm font-medium text-foreground">Where<select value={morning.workLocation} onChange={(event) => setMorning({ ...morning, workLocation: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Not set</option><option value="home">Home</option><option value="coffee_shop">Coffee shop</option><option value="library">Library</option><option value="office">Office</option><option value="other">Other</option></select></label>
                      </div>
                    </>
                  )}
                  {detail.type === "midday" && (
                    <>
                      <label className="block text-sm font-medium text-foreground">What moved<textarea value={midday.workedOn} onChange={(event) => setMidday({ ...midday, workedOn: event.target.value })} rows={3} className="mt-1.5 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></label>
                      <label className="block text-sm font-medium text-foreground">Was this on your plan?<select value={midday.wasOnPlan} onChange={(event) => setMidday({ ...midday, wasOnPlan: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="true">Yes</option><option value="false">Not quite</option></select></label>
                      <label className="block text-sm font-medium text-foreground">Interruptions<textarea value={midday.interruptions} onChange={(event) => setMidday({ ...midday, interruptions: event.target.value })} rows={2} className="mt-1.5 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></label>
                      <label className="block text-sm font-medium text-foreground">Next move<textarea value={midday.nextMove} onChange={(event) => setMidday({ ...midday, nextMove: event.target.value })} rows={2} className="mt-1.5 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></label>
                    </>
                  )}
                  {detail.type === "evening" && (
                    <>
                      <label className="block text-sm font-medium text-foreground">What moved<Textarea value={evening.whatMoved} onChange={(event) => setEvening({ ...evening, whatMoved: event.target.value })} rows={3} className="mt-1.5 min-h-24" /></label>
                      <label className="block text-sm font-medium text-foreground">What remains<Textarea value={evening.whatRemains} onChange={(event) => setEvening({ ...evening, whatRemains: event.target.value })} rows={2} className="mt-1.5 min-h-20" /></label>
                      <label className="block text-sm font-medium text-foreground">What did you learn or decide?<Textarea value={evening.whatLearned} onChange={(event) => setEvening({ ...evening, whatLearned: event.target.value })} rows={2} className="mt-1.5 min-h-20" /></label>
                      <label className="block text-sm font-medium text-foreground">What goes first tomorrow?<Textarea value={evening.tomorrowFirst} onChange={(event) => setEvening({ ...evening, tomorrowFirst: event.target.value })} rows={2} className="mt-1.5 min-h-20" /></label>
                      {detail.tomorrowActivities?.length ? <p className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">Your saved planned activities remain attached to this close.</p> : null}
                    </>
                  )}
                  <div className="flex justify-end gap-3 border-t border-border pt-4"><Button variant="ghost" onClick={() => setEditing(false)} disabled={isSaving}>Cancel</Button><Button onClick={submitEdit} disabled={isSaving}>{isSaving ? "Saving…" : <><Check className="mr-1.5 h-4 w-4" /> Save correction</>}</Button></div>
                </div>
              ) : (
                <div className="space-y-5">
                  {detail.type === "morning" && <>
                    <DetailField label="Capacity" value={detail.plan?.capacityLevel ? `${detail.plan.capacityLevel} capacity` : typeof input.capacityLevel === "string" ? input.capacityLevel : null} />
                    <DetailField label="Primary project" value={detail.projects?.primary?.title ?? null} />
                    <DetailField label="Secondary project" value={detail.projects?.secondary?.title ?? null} />
                    <DetailField label="State" value={detail.plan?.emotionalState ?? null} />
                    <DetailField label="Mental load" value={detail.plan?.mentalLoad ?? null} />
                    <DetailField label="Where" value={typeof input.workLocation === "string" ? input.workLocation.replaceAll("_", " ") : null} />
                    <DetailField label="Notes" value={typeof input.notes === "string" ? input.notes : null} />
                    <DetailField label="Guidance at the time" value={detail.plan?.generatedGuidance ?? null} />
                  </>}
                  {detail.type === "midday" && <>
                    <DetailField label="What moved" value={typeof input.workedOn === "string" ? input.workedOn : null} />
                    <DetailField label="On the plan" value={typeof input.wasOnPlan === "boolean" ? input.wasOnPlan ? "Yes" : "Not quite" : null} />
                    <DetailField label="Interruptions" value={typeof input.interruptions === "string" ? input.interruptions : null} />
                    <DetailField label="Next move" value={typeof input.nextMove === "string" ? input.nextMove : null} />
                    <DetailField label="Energy" value={typeof input.energyLevel === "string" ? input.energyLevel : null} />
                    <DetailField label="Hunger" value={typeof input.hungerLevel === "string" ? input.hungerLevel.replaceAll("_", " ") : null} />
                    <DetailField label="Wren's reflection" value={detail.generatedResponse} />
                  </>}
                  {detail.type === "evening" && <>
                    <DetailField label="What moved" value={typeof input.whatMoved === "string" ? input.whatMoved : null} />
                    <DetailField label="What remains" value={typeof input.whatRemains === "string" ? input.whatRemains : null} />
                    <DetailField label="What I learned" value={typeof input.whatLearned === "string" ? input.whatLearned : null} />
                    <DetailField label="First thing tomorrow" value={typeof input.tomorrowFirst === "string" ? input.tomorrowFirst : null} />
                    {detail.tomorrowActivities?.length ? <section className="space-y-1.5"><h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Planned for tomorrow</h3><ul className="space-y-1 text-sm text-foreground">{detail.tomorrowActivities.map((task, index) => <li key={task.id ?? index}>• {task.title}</li>)}</ul></section> : null}
                    <DetailField label="Wren's reflection" value={detail.generatedResponse} />
                  </>}
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center"><p className="text-sm text-muted-foreground">That saved check-in could not be found.</p><Button variant="link" onClick={() => navigate("/check-ins")}>Return to history</Button></div>
          )}
        </section>
      </div>
    </main>
  );
}
