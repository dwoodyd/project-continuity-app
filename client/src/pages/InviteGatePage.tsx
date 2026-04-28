/**
 * InviteGatePage — shown to authenticated users who have not yet redeemed an invite code.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export default function InviteGatePage() {
  const pending = sessionStorage.getItem("pendingInviteCode") ?? "";
  const [code, setCode] = useState(pending);
  const { logout, refresh } = useAuth();
  const utils = trpc.useUtils();

  const redeem = trpc.invites.redeem.useMutation({
    onSuccess: async () => {
      sessionStorage.removeItem("pendingInviteCode");
      toast.success("Access granted. Welcome to Continuary.");
      await utils.auth.me.invalidate();
      if (refresh) refresh();
      setTimeout(() => { window.location.href = "/"; }, 600);
    },
    onError: (err) => {
      toast.error(err.message || "Invalid or already-used invite code.");
    },
  });

  useEffect(() => {
    if (pending) {
      redeem.mutate({ code: pending });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    redeem.mutate({ code: trimmed });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-8 animate-fade-slide-up">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/logo-navy.svg" alt="Continuary" className="w-14 h-14 rounded-2xl" />
          <h1 className="text-2xl font-bold tracking-tight">Private Beta</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Continuary is currently invite-only. Enter your invite code below, or{" "}
            <a
              href="mailto:hello@soulengineer.online"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              email hello@soulengineer.online
            </a>{" "}
            to request access.
          </p>
        </div>

        {/* Code form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER INVITE CODE"
            maxLength={32}
            className="text-center tracking-widest font-mono text-base uppercase"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            type="submit"
            disabled={!code.trim() || redeem.isPending}
            className="w-full"
          >
            {redeem.isPending ? "Verifying…" : "Unlock access"}
          </Button>
        </form>

        {/* Sign out */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground text-center">
            Already have an account on a different email?
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-2"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Sign out and switch account
          </Button>
        </div>
      </div>
    </div>
  );
}
