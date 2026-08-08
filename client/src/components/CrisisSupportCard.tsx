/**
 * CrisisSupportCard
 *
 * Renders a calm, warm support card when crisis detection fires.
 * - Always dismissible — never blocks app use
 * - Always free — no tier check, no paywall
 * - Two variants: "elevated" (soft offer) and "acute" (prominent resources)
 * - Resources sourced from a single config constant (CRISIS_RESOURCES on server)
 *   mirrored here for the client
 */
import { X, Phone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Mirror of server/crisisSafety.ts CRISIS_RESOURCES — keep in sync
const CRISIS_LINES = [
  { label: "Call or text 988", detail: "Suicide & Crisis Lifeline", action: "tel:988" },
  { label: "Text HOME to 741741", detail: "Crisis Text Line", action: null },
  { label: "Call 911", detail: "If you're in immediate danger", action: "tel:911" },
] as const;

const DISCLAIMER = "Wren is a companion, not a crisis service or a clinician.";

interface CrisisSupportCardProps {
  /** "elevated" = significant distress; "acute" = imminent risk */
  level: "elevated" | "acute";
  onDismiss: () => void;
  className?: string;
}

export function CrisisSupportCard({ level, onDismiss, className }: CrisisSupportCardProps) {
  const [resourcesExpanded, setResourcesExpanded] = useState(level === "acute");

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-5 space-y-3",
        level === "acute"
          ? "bg-rose-950/20 border-rose-800/40"
          : "bg-card border-border",
        className,
      )}
      role="region"
      aria-label="Support resources"
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Heading */}
      <div className="pr-8">
        <p className="text-base font-medium text-foreground leading-snug">
          You don't have to carry this alone.
        </p>
        {level === "elevated" ? (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            That sounds really heavy. If it would help, there are people you can talk to any time — free, 24/7.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            If you're in crisis or thinking about harming yourself, you can reach real support right now — free, 24/7.
          </p>
        )}
      </div>

      {/* Resources — always expanded for acute, collapsible for elevated */}
      {level === "elevated" && !resourcesExpanded ? (
        <button
          onClick={() => setResourcesExpanded(true)}
          className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          See support resources →
        </button>
      ) : (
        <div className="space-y-2 pt-1">
          {CRISIS_LINES.map((line) => (
            <div key={line.label} className="flex items-start gap-3">
              <Phone className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="min-w-0">
                {line.action ? (
                  <a
                    href={line.action}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {line.label}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-foreground">{line.label}</p>
                )}
                <p className="text-xs text-muted-foreground">{line.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground/60 border-t border-border pt-3 leading-relaxed">
        {DISCLAIMER}
      </p>
    </div>
  );
}
