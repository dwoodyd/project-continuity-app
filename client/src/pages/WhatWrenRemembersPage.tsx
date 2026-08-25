/**
 * What Wren Remembers — transparency page showing what Wren knows about the user.
 * Lets users pause Wren's memory and see recent decisions, check-in notes, mood logs.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Brain, Pause, Play, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import notify from "@/lib/notify";
import WrenPlayer from "@/components/WrenPlayer";
import { PageMeta } from "@/components/PageMeta";

function ScoreBar({ score }: { score: number }) {
  const color = score >= 7 ? "oklch(0.75 0.18 145)" : score >= 4 ? "oklch(0.74 0.14 72)" : "oklch(0.65 0.18 30)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(score / 10) * 100}%`, background: color }} />
      </div>
      <span className="text-xs text-muted-foreground w-4 text-right">{score}</span>
    </div>
  );
}

export default function WhatWrenRemembersPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [showDecisions, setShowDecisions] = useState(false);
  const [showCheckIns, setShowCheckIns] = useState(false);

  const { data: snapshot, isLoading } = trpc.settings.getMemorySnapshot.useQuery();
  const { data: pauseData } = trpc.settings.getWrenMemoryPaused.useQuery();
  const forgetItem = trpc.settings.forgetMemoryItem.useMutation({
    onSuccess: () => {
      utils.settings.getMemorySnapshot.invalidate();
      notify.saved("Forgotten. Wren won't reference this anymore.");
    },
    onError: () => notify.error("Couldn't forget — try again."),
  });
  const setPaused = trpc.settings.setWrenMemoryPaused.useMutation({
    onSuccess: () => {
      utils.settings.getWrenMemoryPaused.invalidate();
      notify.saved(pauseData?.paused ? "Wren's memory resumed." : "Wren's memory paused.");
    },
  });

  const isPaused = pauseData?.paused ?? false;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <PageMeta
        title="What Wren Remembers"
        description="See what Wren knows about you and how she personalises your experience."
      />

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border" style={{ background: "var(--background)" }}>
        <button onClick={() => navigate("/settings")} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Back to settings">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-foreground">What Wren Remembers</h1>
          <p className="text-xs text-muted-foreground">Wren uses this to personalise your experience</p>
        </div>
        <WrenPlayer clip="memoryOrb" size="sm" fallbackStill="luminousIdle" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Honesty note */}
        <div className="rounded-xl p-4 text-sm leading-relaxed space-y-1.5" style={{ background: "oklch(0.74 0.14 72 / 0.08)", border: "1px solid oklch(0.74 0.14 72 / 0.25)" }}>
          <p className="font-medium" style={{ color: "oklch(0.74 0.14 72)" }}>Wren is a companion, not a clinician.</p>
          <p className="text-muted-foreground text-xs">She uses your data to give you grounded, personalised support — not to diagnose, treat, or predict. Your notes are never used to train AI models. You can pause or clear her memory at any time.</p>
        </div>

        {/* Memory pause toggle */}
        <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              {isPaused ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Brain className="w-3.5 h-3.5 text-amber-500" />}
              {isPaused ? "Memory paused" : "Memory active"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPaused
                ? "Wren won't use your recent data to personalise responses until you resume."
                : "Wren uses your recent check-ins, decisions, and mood to personalise her responses."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused.mutate({ paused: !isPaused })}
            disabled={setPaused.isPending}
            className="shrink-0"
          >
            {isPaused ? <><Play className="w-3 h-3 mr-1.5" />Resume</> : <><Pause className="w-3 h-3 mr-1.5" />Pause</>}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-8">Loading…</div>
        ) : snapshot ? (
          <>
            {/* Work style */}
            {(snapshot.workStyle || snapshot.workTypes.length > 0) && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold text-foreground">How you work</p>
                {snapshot.workStyle && (
                  <p className="text-sm text-muted-foreground">{snapshot.workStyle}</p>
                )}
                {snapshot.workTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {snapshot.workTypes.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
                {snapshot.focusHoursStart && snapshot.focusHoursEnd && (
                  <p className="text-xs text-muted-foreground">Focus hours: {snapshot.focusHoursStart}–{snapshot.focusHoursEnd}</p>
                )}
              </div>
            )}

            {/* Distraction patterns */}
            {snapshot.distractionPatterns.length > 0 && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold text-foreground">Distraction patterns Wren watches for</p>
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.distractionPatterns.map((d: string) => (
                    <span key={d} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Reading Bridge chapter */}
            {snapshot.readingBridgeChapter && (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <span className="text-lg">📖</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Permission to Start — Chapter {snapshot.readingBridgeChapter}</p>
                  <p className="text-xs text-muted-foreground">Wren quietly references this chapter when relevant</p>
                </div>
              </div>
            )}

            {/* Recent mood logs */}
            {snapshot.recentMoodLogs.length > 0 && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold text-foreground">Recent mood (last 7 days)</p>
                <div className="space-y-2">
                  {snapshot.recentMoodLogs.map((m: { date: string; score: number; note: string | null }) => (
                    <div key={m.date} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{m.date}</span>
                        {m.note && <span className="text-xs text-muted-foreground truncate max-w-[60%] text-right">— {m.note}</span>}
                      </div>
                      <ScoreBar score={m.score} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent decisions */}
            {snapshot.recentDecisions.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <button
                  onClick={() => setShowDecisions(v => !v)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  style={{ background: "var(--card)" }}
                >
                  <p className="text-sm font-semibold text-foreground">Recent decisions ({snapshot.recentDecisions.length})</p>
                  {showDecisions ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showDecisions && (
                  <div className="divide-y divide-border">
                    {snapshot.recentDecisions.map((d: { id: number; content: string; date: string }) => (
                      <div key={d.id} className="px-4 py-3 flex items-start gap-3" style={{ background: "var(--card)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{d.content}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{d.date}</p>
                        </div>
                        <button
                          onClick={() => forgetItem.mutate({ type: "decision", id: d.id })}
                          disabled={forgetItem.isPending}
                          className="shrink-0 text-xs text-muted-foreground/50 hover:text-destructive transition-colors flex items-center gap-1 pt-0.5"
                          title="Forget this"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Forget</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent check-in notes */}
            {snapshot.recentCheckInNotes.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <button
                  onClick={() => setShowCheckIns(v => !v)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  style={{ background: "var(--card)" }}
                >
                  <p className="text-sm font-semibold text-foreground">Recent check-in notes ({snapshot.recentCheckInNotes.length})</p>
                  {showCheckIns ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showCheckIns && (
                  <div className="divide-y divide-border">
                    {snapshot.recentCheckInNotes.map((c: { date: string; note: string }, i: number) => (
                      <div key={i} className="px-4 py-3" style={{ background: "var(--card)" }}>
                        <p className="text-sm text-foreground">{c.note}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.date}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {snapshot.recentDecisions.length === 0 && snapshot.recentCheckInNotes.length === 0 && snapshot.recentMoodLogs.length === 0 && !snapshot.workStyle && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Brain className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Wren doesn't have much context yet.</p>
                <p className="mt-1 text-xs opacity-70">Complete a few check-ins and she'll start to know you.</p>
              </div>
            )}
          </>
        ) : null}

        {/* Privacy footer */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          Your data is never sold or used to train AI models.{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy policy</a>
        </p>
      </div>
    </div>
  );
}
