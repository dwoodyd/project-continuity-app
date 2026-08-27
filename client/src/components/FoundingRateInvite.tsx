import { useEffect, useState } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const DISMISS_KEY = "continuary_founding_rate_invite_dismissed";

/** A calm in-app mirror of the existing day-80 founding-trial email. */
export function FoundingRateInvite() {
  const { data: conversion } = trpc.conversion.status.useQuery();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
  }, []);

  if (!conversion?.hasActivated || !conversion.trialClosing || dismissed) return null;
  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* best-effort for private browsing */ }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true" aria-labelledby="founding-rate-title">
      <section className="relative w-full max-w-md rounded-2xl border border-amber-300/30 bg-background p-6 shadow-2xl">
        <button type="button" onClick={dismiss} aria-label="Dismiss founding-rate invitation" className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">Your founding trial is nearing its close</p>
        <h2 id="founding-rate-title" className="mt-3 pr-6 text-xl font-semibold text-foreground">Keep your founding rate.</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">What you have built—your thread and your evidence—remains yours. If Continuary has been useful, you can keep your founding rate locked for life.</p>
        <div className="mt-5 flex items-center gap-4">
          <Link href="/pricing" className="text-sm font-medium text-amber-700 underline underline-offset-4 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">See your options</Link>
          <button type="button" onClick={dismiss} className="text-sm text-muted-foreground hover:text-foreground">Not now</button>
        </div>
      </section>
    </div>
  );
}
