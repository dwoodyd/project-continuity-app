/**
 * InviteGatePage v2 — premium full-screen dark invite code entry.
 *
 * Design principles (matching OnboardingPage v5):
 * - Full-screen dark canvas (#080a0f), no cards, no borders
 * - Wren greeting clip as the emotional anchor
 * - Large, centered code input — 24 hex chars auto-formatted as XXXXXX-XXXXXX-XXXXXX-XXXXXX
 * - Individual character cells that light up as the user types
 * - Spring-physics staggered entrance
 * - Instant visual feedback on success/error
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { LogOut, Loader2 } from "lucide-react";
import WrenPlayer from "@/components/WrenPlayer";

// 24-char hex code split into 4 groups of 6
const GROUP_SIZE = 6;
const NUM_GROUPS = 4;
const TOTAL_CHARS = GROUP_SIZE * NUM_GROUPS; // 24

function stripFormatting(val: string): string {
  return val.replace(/[^A-F0-9]/g, "").slice(0, TOTAL_CHARS);
}

export default function InviteGatePage() {
  const pending = sessionStorage.getItem("pendingInviteCode") ?? "";
  const [raw, setRaw] = useState(() => stripFormatting(pending.toUpperCase()));
  const [entered, setEntered] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { logout, refresh } = useAuth();
  const utils = trpc.useUtils();

  const redeem = trpc.invites.redeem.useMutation({
    onSuccess: async (data) => {
      sessionStorage.removeItem("pendingInviteCode");
      setSuccess(true);
      await utils.auth.me.invalidate();
      if (refresh) refresh();
      // Founding-member codes land on the status page; regular codes go home
      const dest = data?.isFoundingMember ? "/founding-member" : "/";
      setTimeout(() => { window.location.href = dest; }, 1200);
    },
    onError: (err) => {
      toast.error(err.message || "Invalid or already-used invite code.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    },
  });

  // Auto-submit pending code from URL/session
  useEffect(() => {
    if (pending) {
      const clean = stripFormatting(pending.toUpperCase());
      setRaw(clean);
      if (clean.length === TOTAL_CHARS) {
        redeem.mutate({ code: clean });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Staggered entrance
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = stripFormatting(e.target.value.toUpperCase());
    setRaw(clean);
    if (clean.length === TOTAL_CHARS) {
      setTimeout(() => redeem.mutate({ code: clean }), 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (raw.length !== TOTAL_CHARS || redeem.isPending) return;
    redeem.mutate({ code: raw });
  };

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, []);

  const chars = raw.split("");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#080a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "35%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          background: "radial-gradient(circle, oklch(0.80 0.17 65 / 0.07) 0%, transparent 60%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Wren */}
      <div
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0) scale(1)" : "translateY(30px) scale(0.9)",
          transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
          marginBottom: "1.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <WrenPlayer clip={success ? "celebrate" : "greeting"} size="lg" autoPlay loop />
      </div>

      {/* Eyebrow */}
      <div
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s",
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase" as const,
          color: "oklch(0.80 0.17 65)",
          marginBottom: "0.75rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        Private Beta
      </div>

      {/* Headline */}
      <h1
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s",
          fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
          fontWeight: 600,
          color: "rgba(255,255,255,0.95)",
          textAlign: "center" as const,
          lineHeight: 1.2,
          marginBottom: "0.75rem",
          maxWidth: "28rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {success ? "You're in." : "Enter your invite code."}
      </h1>

      {/* Sub */}
      <p
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.26s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.26s",
          fontSize: "0.9rem",
          color: "rgba(255,255,255,0.38)",
          textAlign: "center" as const,
          maxWidth: "22rem",
          lineHeight: 1.6,
          marginBottom: "2.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {success
          ? "Taking you in now\u2026"
          : "Continuary is currently invite-only. Paste or type your 24-character code below."}
      </p>

      {/* Code input area */}
      <form
        onSubmit={handleSubmit}
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.34s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.34s",
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          gap: "1.5rem",
          width: "100%",
          maxWidth: "36rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Character cells */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap" as const,
            justifyContent: "center",
            animation: shake ? "shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97)" : "none",
          }}
        >
          {Array.from({ length: NUM_GROUPS }).map((_, gi) => (
            <div key={gi} style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
              {Array.from({ length: GROUP_SIZE }).map((_, ci) => {
                const idx = gi * GROUP_SIZE + ci;
                const char = chars[idx] ?? "";
                const isFilled = !!char;
                const isCursor = idx === raw.length;
                return (
                  <div
                    key={ci}
                    onClick={() => inputRef.current?.focus()}
                    style={{
                      width: "clamp(2rem, 5vw, 2.8rem)",
                      height: "clamp(2.5rem, 6vw, 3.4rem)",
                      borderRadius: "0.5rem",
                      border: isFilled
                        ? "1.5px solid oklch(0.80 0.17 65 / 0.7)"
                        : isCursor
                        ? "1.5px solid rgba(255,255,255,0.35)"
                        : "1.5px solid rgba(255,255,255,0.1)",
                      background: isFilled
                        ? "oklch(0.80 0.17 65 / 0.08)"
                        : "rgba(255,255,255,0.03)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                      fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)",
                      fontWeight: 600,
                      color: isFilled ? "oklch(0.85 0.12 65)" : "transparent",
                      cursor: "text",
                      transition: "border-color 0.15s ease, background 0.15s ease, color 0.15s ease",
                      position: "relative",
                    }}
                  >
                    {char}
                    {isCursor && (
                      <span
                        style={{
                          position: "absolute",
                          width: 2,
                          height: "55%",
                          background: "rgba(255,255,255,0.6)",
                          borderRadius: 1,
                          animation: "blink 1s step-end infinite",
                        }}
                      />
                    )}
                  </div>
                );
              })}
              {gi < NUM_GROUPS - 1 && (
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.2rem", margin: "0 0.1rem", userSelect: "none" as const }}>
                  &mdash;
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Hidden real input */}
        <input
          ref={inputRef}
          type="text"
          value={raw}
          onChange={handleInput}
          maxLength={TOTAL_CHARS}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
          aria-label="Invite code"
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={raw.length !== TOTAL_CHARS || redeem.isPending || success}
          style={{
            width: "100%",
            maxWidth: "22rem",
            padding: "1rem 2rem",
            borderRadius: "100px",
            border: "none",
            background: raw.length === TOTAL_CHARS && !redeem.isPending && !success
              ? "linear-gradient(135deg, oklch(0.80 0.17 65) 0%, oklch(0.72 0.20 55) 100%)"
              : "rgba(255,255,255,0.07)",
            color: raw.length === TOTAL_CHARS && !redeem.isPending && !success
              ? "#080a0f"
              : "rgba(255,255,255,0.3)",
            fontSize: "0.95rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            cursor: raw.length === TOTAL_CHARS && !redeem.isPending && !success ? "pointer" : "not-allowed",
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            boxShadow: raw.length === TOTAL_CHARS && !redeem.isPending && !success
              ? "0 0 32px oklch(0.80 0.17 65 / 0.3)"
              : "none",
          }}
        >
          {redeem.isPending ? (
            <>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Verifying&hellip;
            </>
          ) : success ? (
            "Welcome to Continuary \u2713"
          ) : (
            "Unlock access"
          )}
        </button>
      </form>

      {/* Sign out */}
      <div
        style={{
          opacity: entered ? 1 : 0,
          transition: "opacity 0.6s ease 0.5s",
          marginTop: "3rem",
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          gap: "0.75rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.22)", textAlign: "center" as const }}>
          Don&apos;t have a code?{" "}
          <a
            href="mailto:hello@continuary.app"
            style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            Email hello@continuary.app
          </a>
        </p>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.22)", textAlign: "center" as const }}>
          Have a referral code from a founding member?{" "}
          <a
            href="/redeem-referral"
            style={{ color: "oklch(0.80 0.17 65 / 0.7)", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            Redeem it here →
          </a>
        </p>
        <button
          onClick={() => logout()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.22)",
            fontSize: "0.75rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.75rem",
            borderRadius: "0.5rem",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
        >
          <LogOut style={{ width: 13, height: 13 }} />
          Sign out and switch account
        </button>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-6px); }
          40%, 60% { transform: translateX(6px); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
