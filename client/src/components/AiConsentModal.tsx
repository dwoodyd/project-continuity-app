/**
 * AiConsentModal — App Store Guideline 5.1.2(i)
 *
 * Shown exactly once, before the user's first AI-assisted action, to disclose
 * that note content is sent to a third-party AI service for processing.
 * Consent is persisted server-side via settings.giveAiConsent.
 */
import { Brain, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface AiConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function AiConsentModal({ onAccept, onDecline }: AiConsentModalProps) {
  const giveConsent = trpc.settings.giveAiConsent.useMutation({ onSuccess: onAccept });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI-Assisted Features</p>
            <p className="text-xs text-muted-foreground">Data transparency notice</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            Continuary uses an AI language model to generate daily plans, check-in responses,
            project insights, and clarity sessions.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To do this, relevant portions of your notes, project titles, and check-in answers
            are sent to a <strong className="text-foreground">third-party AI service</strong> (Google Gemini, via the Manus platform).
            This data is used solely to generate your response and is not stored or used for training.
          </p>

          {/* What is shared */}
          <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1.5">
            <p className="text-xs font-medium text-foreground">What may be shared with the AI:</p>
            {[
              "Project titles, descriptions, and next steps",
              "Check-in answers and daily notes",
              "Vault item summaries (not raw file content)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            You can use Continuary without AI features — manual planning and note capture are always available.
            Review our{" "}
            <a href="/privacy" className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5">
              Privacy Policy <ExternalLink className="w-3 h-3" />
            </a>{" "}
            for full details.
          </p>
          <p className="text-xs text-muted-foreground/70 border-t border-border pt-3">
            <strong className="text-muted-foreground">EU / GDPR:</strong> The lawful basis for this processing is your explicit
            consent under GDPR Article 6(1)(a). You may withdraw consent at any time in Settings → AI Data &amp; Privacy
            without affecting the lawfulness of prior processing.
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => giveConsent.mutate()}
            disabled={giveConsent.isPending}
          >
            {giveConsent.isPending ? "Saving…" : "I understand — enable AI features"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground text-sm"
            onClick={onDecline}
            disabled={giveConsent.isPending}
          >
            Skip for now — use manual mode
          </Button>
        </div>
      </div>
    </div>
  );
}
