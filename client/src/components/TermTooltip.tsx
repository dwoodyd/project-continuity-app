/**
 * TermTooltip — progressive terminology disclosure
 *
 * Wraps a term with a subtle dotted underline and shows a definition
 * on hover/focus. Uses Radix Tooltip under the hood.
 *
 * Usage:
 *   <TermTooltip term="Thread Strength">
 *     Thread Strength
 *   </TermTooltip>
 *
 * Or use the pre-defined glossary:
 *   <GlossaryTerm name="threadStrength" />
 */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TermTooltipProps {
  children: React.ReactNode;
  definition: string;
  /** Optional: show a "Learn more" link */
  learnMoreHref?: string;
}

export function TermTooltip({ children, definition, learnMoreHref }: TermTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="cursor-help border-b border-dotted border-current/40 hover:border-current/70 transition-colors"
            tabIndex={0}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs text-xs leading-relaxed"
          style={{
            background: "oklch(0.18 0.01 240)",
            border: "1px solid oklch(1 0 0 / 0.10)",
            color: "oklch(0.92 0 0)",
          }}
        >
          <p>{definition}</p>
          {learnMoreHref && (
            <a
              href={learnMoreHref}
              className="mt-1 block text-amber-400/80 hover:text-amber-400 underline text-[11px]"
            >
              Learn more →
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Pre-defined glossary ─────────────────────────────────────────────────────

export const GLOSSARY: Record<string, { label: string; definition: string }> = {
  threadStrength: {
    label: "Thread Strength",
    definition:
      "A score (0–100) that reflects how consistently you've been checking in and completing tasks. Higher strength means your momentum is intact; lower means the thread is thinning.",
  },
  gatheringMode: {
    label: "Gathering",
    definition:
      "A low-energy work state where you collect, review, and organise rather than create or decide. Perfect for days when deep focus isn't available.",
  },
  doingMode: {
    label: "Doing Mode",
    definition:
      "An active, high-focus work state. Continuary surfaces your most important task and clears distractions so you can execute.",
  },
  signalLine: {
    label: "Signal Line",
    definition:
      "A brief status message you set each day to describe your current energy or context (e.g. 'Low energy — admin only'). Helps you and Continuary calibrate expectations.",
  },
  compassItem: {
    label: "Compass Item",
    definition:
      "A weekly intention or north-star goal set in the Weekly Compass. Compass Items keep your daily tasks aligned with your bigger picture.",
  },
  amnesty: {
    label: "Amnesty",
    definition:
      "Continuary's re-entry ritual for when you've been away. No guilt, no backlog review — just a gentle reset to get back on track.",
  },
  evidenceLog: {
    label: "Evidence Log",
    definition:
      "A private record of things you've actually done. Counteracts the tendency to forget wins. Used by Intelligence to surface your real patterns.",
  },
  clarityEngine: {
    label: "Clarity Engine",
    definition:
      "An AI-guided thinking tool for when you're overwhelmed or stuck. It asks focused questions to help you identify the one thing that matters most right now.",
  },
  ideaSanctuary: {
    label: "Idea Sanctuary",
    definition:
      "A frictionless capture space for thoughts, links, and sparks that don't belong anywhere yet. Nothing gets lost; nothing demands action.",
  },
  weeklyCompass: {
    label: "Weekly Compass",
    definition:
      "A short weekly planning ritual where you set 1–3 intentions for the week. The Compass keeps daily tasks from drifting away from what matters.",
  },
};

interface GlossaryTermProps {
  name: keyof typeof GLOSSARY;
  className?: string;
}

export function GlossaryTerm({ name, className }: GlossaryTermProps) {
  const entry = GLOSSARY[name];
  if (!entry) return null;
  return (
    <TermTooltip definition={entry.definition}>
      <span className={className}>{entry.label}</span>
    </TermTooltip>
  );
}
