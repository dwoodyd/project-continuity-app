import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type UpgradeNudgeProps = {
  moment: string;
  title: string;
  body: string;
  /** Friction is an active, member-initiated request, so it may follow an earlier soft invite in the same session. */
  friction?: boolean;
  className?: string;
};

const SESSION_PROMPT_KEY = "continuary_upgrade_prompt_seen";

/**
 * A continuation invitation, never a paywall. It remains absent until the
 * server confirms that the member has experienced activation-level value.
 */
export function UpgradeNudge({ moment, title, body, friction = false, className }: UpgradeNudgeProps) {
  const { data: conversion } = trpc.conversion.status.useQuery();
  const [dismissed, setDismissed] = useState(false);
  const [alreadyPrompted, setAlreadyPrompted] = useState(true);

  useEffect(() => {
    try { setAlreadyPrompted(sessionStorage.getItem(SESSION_PROMPT_KEY) === "1"); } catch { setAlreadyPrompted(false); }
  }, []);

  const canShow = conversion?.isEligibleForUpgrade && !dismissed && (!alreadyPrompted || friction);
  useEffect(() => {
    if (!canShow) return;
    try { sessionStorage.setItem(SESSION_PROMPT_KEY, "1"); } catch { /* private browsing still gets the respectful invite */ }
  }, [canShow, moment]);

  if (!canShow) return null;
  return (
    <aside className={cn("relative flex items-start gap-3 rounded-xl border border-amber-300/30 bg-amber-50/50 p-4 text-sm dark:border-amber-700/30 dark:bg-amber-950/20", className)} aria-label="Upgrade invitation">
      <div className="min-w-0 flex-1 pr-5">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">{body}</p>
        <Link href="/pricing" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700 underline underline-offset-4 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
          Keep going <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss upgrade invitation" className="absolute right-3 top-3 text-muted-foreground/60 hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
