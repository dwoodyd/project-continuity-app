import { useState } from "react";
import { MessageSquare, Bug, Lightbulb, HelpCircle, Send, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type Category = "bug" | "suggestion" | "question" | "other";

const CATEGORIES: { value: Category; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "bug", label: "Bug", icon: Bug, desc: "Something isn't working" },
  { value: "suggestion", label: "Idea", icon: Lightbulb, desc: "Feature or improvement" },
  { value: "question", label: "Question", icon: HelpCircle, desc: "Need help with something" },
  { value: "other", label: "Other", icon: MessageSquare, desc: "General feedback" },
];

interface FeedbackPanelProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackPanel({ open, onClose }: FeedbackPanelProps) {
  const [category, setCategory] = useState<Category>("suggestion");
  const [message, setMessage] = useState("");

  const submit = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("Feedback sent — thank you!", {
        description: "We read every message and use it to improve Continuary.",
      });
      setMessage("");
      setCategory("suggestion");
      onClose();
    },
    onError: () => {
      toast.error("Couldn't send feedback", {
        description: "Please try again or email us directly.",
      });
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) return;
    const deviceInfo = [
      navigator.userAgent,
      `${window.innerWidth}×${window.innerHeight}`,
    ].join(" | ");
    submit.mutate({ category, message: message.trim(), deviceInfo });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">Send Feedback</SheetTitle>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-foreground/5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground text-left">
            Questions, bugs, ideas — we read everything.
          </p>
        </SheetHeader>

        {/* Category selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {CATEGORIES.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn(
                "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
                category === value
                  ? "border-primary/50 bg-primary/5 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", category === value ? "text-primary" : "")} />
              <div className="min-w-0">
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Message */}
        <Textarea
          placeholder={
            category === "bug" ? "What happened? What did you expect instead?"
            : category === "suggestion" ? "What would make Continuary better for you?"
            : category === "question" ? "What do you need help with?"
            : "What's on your mind?"
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="resize-none mb-4 text-sm"
          maxLength={2000}
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground/50">{message.length}/2000</span>
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || submit.isPending}
            size="sm"
            className="gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            {submit.isPending ? "Sending…" : "Send feedback"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
