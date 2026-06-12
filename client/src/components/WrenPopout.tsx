/**
 * WrenPopout — floating focus companion using Document Picture-in-Picture API
 *
 * Version A (Chrome/Edge/Arc): Full interactive session in a Document PiP window.
 *   - Live timer, Wren video, ambient toggle, Stuck button, collapsible Talk-to-Wren chat.
 *   - State lives in FocusSessionsPage (above the portal) so it never resets on move.
 *   - React portal renders the session UI into pipWindow.document.body.
 *   - App CSS variables + fonts are cloned into the PiP window's <head>.
 *
 * Version B (Safari/Firefox fallback): Presence-only — Wren, timer, intention, latest
 *   Wren line. No inputs. "Tap back to the app to chat or mark Stuck."
 *
 * Usage:
 *   <WrenPopout
 *     open={pipOpen}
 *     onClose={() => setPipOpen(false)}
 *     secondsLeft={secondsLeft}
 *     durationMinutes={durationMinutes}
 *     intention={intention}
 *     wrenActivity={wrenActivity}
 *     ambientSound={ambientSound}
 *     ambientVolume={ambientVolume}
 *     onSetAmbient={handleSetAmbient}
 *     onSetVolume={handleSetVolume}
 *     chatMessages={chatMessages}
 *     chatInput={chatInput}
 *     chatLoading={chatLoading}
 *     onChatInputChange={setChatInput}
 *     onSendChat={handleSendChat}
 *     onStuck={() => setShowUnstickModal(true)}
 *     onEndEarly={handleEndEarly}
 *   />
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

// ── CDN video URLs (same as FocusSessionsPage) ────────────────────────────────
const WREN_VIDEOS: Record<string, string> = {
  weaving:   "/manus-storage/wren-weaving_b532984b.mp4",
  reading:   "/manus-storage/wren-reading_bd6af9a6.mp4",
  writing:   "/manus-storage/wren-writing_8697130a.mov",
  lookingup: "/manus-storage/wren-lookingup_f1735040.mp4",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type ChatMsg = { role: "user" | "assistant"; content: string; ts: number };

interface WrenPopoutProps {
  open: boolean;
  onClose: () => void;
  secondsLeft: number;
  durationMinutes: number;
  intention: string;
  wrenActivity: string;
  ambientSound: "silence" | "rain" | "cafe";
  ambientVolume: number;
  onSetAmbient: (s: "silence" | "rain" | "cafe") => void;
  onSetVolume: (v: number) => void;
  chatMessages: ChatMsg[];
  chatInput: string;
  chatLoading: boolean;
  onChatInputChange: (v: string) => void;
  onSendChat: () => void;
  onStuck: () => void;
  onEndEarly: () => void;
}

// ── Check Document PiP support ────────────────────────────────────────────────
function supportsDocumentPiP(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

// ── Presence-only fallback (Version B) ───────────────────────────────────────
// Shown in Safari/Firefox where Document PiP isn't available.
// This is a small in-page floating panel, not a real OS window.
function PresenceOnlyFloat({
  secondsLeft,
  intention,
  wrenActivity,
  latestWrenLine,
  onClose,
}: {
  secondsLeft: number;
  intention: string;
  wrenActivity: string;
  latestWrenLine: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 312,
        zIndex: 9999,
        background: "linear-gradient(180deg, oklch(0.11 0.03 240), oklch(0.08 0.02 240))",
        border: "1px solid oklch(0.22 0.04 240)",
        borderRadius: 16,
        boxShadow: "0 30px 70px -20px rgba(0,0,0,0.85)",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderBottom: "1px solid oklch(0.16 0.03 240)", background: "oklch(0.10 0.02 240 / 0.5)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.60 0.15 145)", boxShadow: "0 0 8px oklch(0.60 0.15 145)", flexShrink: 0 }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.45 0.04 240)" }}>Focus · with Wren</span>
        <span style={{ marginLeft: "auto", fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.35 0.03 240)", border: "1px solid oklch(0.20 0.03 240)", borderRadius: 8, padding: "2px 6px" }}>view only</span>
        <button onClick={onClose} style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer", color: "oklch(0.35 0.03 240)", fontSize: 14, lineHeight: 1 }}>×</button>
      </div>
      {/* Body */}
      <div style={{ padding: "18px 18px 18px", textAlign: "center" }}>
        {/* Wren video */}
        <div style={{ width: 88, height: 88, margin: "0 auto", borderRadius: "50%", overflow: "hidden", background: "radial-gradient(circle at 50% 45%, oklch(0.55 0.14 72 / 0.28), oklch(0.55 0.14 72 / 0.05) 60%, transparent 72%)" }}>
          <video
            key={wrenActivity}
            src={WREN_VIDEOS[wrenActivity] ?? WREN_VIDEOS.lookingup}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "screen" }}
          />
        </div>
        {/* Timer */}
        <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 32, letterSpacing: "0.04em", color: "oklch(0.88 0.04 240)", marginTop: 11 }}>
          {formatTime(secondsLeft)}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "oklch(0.40 0.04 240)", marginTop: 1 }}>in session</div>
        {intention.trim() && (
          <p style={{ fontStyle: "italic", fontSize: 12, color: "oklch(0.55 0.04 240)", marginTop: 9, padding: "0 6px", lineHeight: 1.5 }}>
            "{intention.trim()}"
          </p>
        )}
        {latestWrenLine && (
          <p style={{ fontSize: 11.5, color: "oklch(0.55 0.06 72)", fontStyle: "italic", marginTop: 12 }}>
            "{latestWrenLine}" — Wren
          </p>
        )}
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "oklch(0.38 0.04 240)", marginTop: 13, paddingTop: 11, borderTop: "1px solid oklch(0.16 0.03 240)", lineHeight: 1.6 }}>
          ↩ tap back to the app to chat or mark Stuck
        </p>
      </div>
    </div>
  );
}

// ── Full interactive session UI (Version A) ───────────────────────────────────
// Rendered via React portal into pipWindow.document.body
function PiPSessionUI({
  secondsLeft,
  intention,
  wrenActivity,
  ambientSound,
  ambientVolume,
  onSetAmbient,
  onSetVolume,
  chatMessages,
  chatInput,
  chatLoading,
  onChatInputChange,
  onSendChat,
  onStuck,
  onEndEarly,
  onClose,
}: Omit<WrenPopoutProps, "open" | "wrenActivity"> & { wrenActivity: string; onClose: () => void }) {
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatCollapsed) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatCollapsed]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendChat(); }
  }, [onSendChat]);

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "linear-gradient(180deg, oklch(0.09 0.03 240), oklch(0.06 0.02 240))",
      color: "oklch(0.88 0.04 240)",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: 300,
      WebkitFontSmoothing: "antialiased",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderBottom: "1px solid oklch(0.16 0.03 240)", background: "oklch(0.08 0.02 240 / 0.5)", flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.60 0.15 145)", boxShadow: "0 0 8px oklch(0.60 0.15 145)", flexShrink: 0 }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.45 0.04 240)" }}>Focus · with Wren</span>
        <button
          onClick={onClose}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "oklch(0.35 0.03 240)", fontSize: 16, lineHeight: 1, padding: "2px 4px" }}
          title="Close popout"
        >×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "14px 15px 0", display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Wren */}
        <div style={{ width: 72, height: 72, margin: "0 auto", borderRadius: "50%", overflow: "hidden", background: "radial-gradient(circle at 50% 45%, oklch(0.55 0.14 72 / 0.28), oklch(0.55 0.14 72 / 0.05) 60%, transparent 72%)" }}>
          <video
            key={wrenActivity}
            src={WREN_VIDEOS[wrenActivity] ?? WREN_VIDEOS.lookingup}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "screen" }}
          />
        </div>

        {/* Timer */}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 28, letterSpacing: "0.04em", color: "oklch(0.88 0.04 240)" }}>
            {formatTime(secondsLeft)}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "oklch(0.40 0.04 240)", marginTop: 1 }}>in session</div>
        </div>

        {/* Intention */}
        {intention.trim() && (
          <p style={{ fontStyle: "italic", fontSize: 12, color: "oklch(0.55 0.04 240)", textAlign: "center", marginTop: 9, padding: "0 6px", lineHeight: 1.5 }}>
            "{intention.trim()}"
          </p>
        )}

        {/* Ambient sound */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 11 }}>
          {(["silence", "rain", "cafe"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSetAmbient(s)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${ambientSound === s ? "oklch(0.35 0.08 72)" : "oklch(0.20 0.03 240)"}`,
                background: ambientSound === s ? "oklch(0.18 0.06 72 / 0.5)" : "transparent",
                color: ambientSound === s ? "oklch(0.72 0.12 72)" : "oklch(0.42 0.03 240)",
                cursor: "pointer",
                fontWeight: ambientSound === s ? 600 : 400,
              }}
            >
              {s === "silence" ? "Silence" : s === "rain" ? "Rain" : "Café"}
            </button>
          ))}
        </div>
        {ambientSound !== "silence" && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <input
              type="range"
              min={0}
              max={100}
              value={ambientVolume}
              onChange={(e) => onSetVolume(Number(e.target.value))}
              style={{ width: 80, accentColor: "oklch(0.72 0.14 72)" }}
            />
          </div>
        )}

        {/* Stuck / End early */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 10, fontSize: 11.5 }}>
          <button
            onClick={onStuck}
            style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.72 0.14 72)", opacity: 0.85, display: "flex", alignItems: "center", gap: 4 }}
          >
            <span>⚡</span> Stuck
          </button>
          <span style={{ color: "oklch(0.25 0.02 240)", fontSize: 10 }}>·</span>
          <button
            onClick={onEndEarly}
            style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.42 0.03 240)", opacity: 0.6, fontSize: 11 }}
          >
            End early
          </button>
        </div>

        {/* Talk to Wren — collapsible */}
        <div style={{ marginTop: 12, borderTop: "1px solid oklch(0.16 0.03 240)" }}>
          <button
            onClick={() => setChatCollapsed((c) => !c)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 2px 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "oklch(0.55 0.08 72)",
              fontSize: 10,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <span>{chatLoading ? "Wren is thinking…" : "Talk to Wren"}</span>
            <span style={{ transform: chatCollapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s", display: "inline-block", color: "oklch(0.35 0.03 240)" }}>⌄</span>
          </button>

          {!chatCollapsed && (
            <>
              {/* Chat thread */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "2px 0 8px", maxHeight: 180, overflowY: "auto" }}>
                {chatMessages.slice(-8).map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "82%",
                      fontSize: 12.5,
                      padding: "8px 11px",
                      borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                      lineHeight: 1.45,
                      background: msg.role === "user" ? "oklch(0.55 0.14 72 / 0.13)" : "oklch(0.14 0.02 240)",
                      border: `1px solid ${msg.role === "user" ? "oklch(0.55 0.14 72 / 0.25)" : "oklch(0.20 0.03 240)"}`,
                      color: msg.role === "user" ? "oklch(0.88 0.04 240)" : "oklch(0.60 0.04 240)",
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid oklch(0.22 0.04 240)",
                borderRadius: 11,
                padding: "8px 10px",
                margin: "2px 0 14px",
                background: "oklch(0.10 0.02 240 / 0.5)",
              }}>
                <input
                  value={chatInput}
                  onChange={(e) => onChatInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Say something…"
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    fontSize: 12.5,
                    color: "oklch(0.75 0.04 240)",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                />
                <button
                  onClick={onSendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: chatLoading || !chatInput.trim() ? "oklch(0.30 0.04 240)" : "oklch(0.72 0.14 72)",
                    border: "none",
                    cursor: chatLoading || !chatInput.trim() ? "default" : "pointer",
                    display: "grid",
                    placeItems: "center",
                    color: "oklch(0.10 0.02 240)",
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main WrenPopout component ─────────────────────────────────────────────────
export default function WrenPopout(props: WrenPopoutProps) {
  const { open, onClose, secondsLeft, intention, wrenActivity, chatMessages } = props;
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const [useDocPiP, setUseDocPiP] = useState(false);

  // Determine if Document PiP is supported (once on mount)
  useEffect(() => {
    setUseDocPiP(supportsDocumentPiP());
  }, []);

  // Open / close Document PiP window
  useEffect(() => {
    if (!open || !useDocPiP) return;

    let win: Window | null = null;

    const openPiP = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: 344,
          height: 520,
        });
        win = pip;

        // Clone app styles into PiP window so CSS variables and fonts work
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (sheet.href) {
              const link = pip.document.createElement("link");
              link.rel = "stylesheet";
              link.href = sheet.href;
              pip.document.head.appendChild(link);
            } else {
              const style = pip.document.createElement("style");
              Array.from(sheet.cssRules).forEach((rule) => { style.textContent += rule.cssText; });
              pip.document.head.appendChild(style);
            }
          } catch { /* cross-origin sheets — skip */ }
        });

        // Add Google Fonts
        const fontLink = pip.document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap";
        pip.document.head.appendChild(fontLink);

        // Dark background
        pip.document.body.style.cssText = "margin:0;padding:0;background:oklch(0.07 0.02 240);overflow:hidden;";

        // Mount container
        const container = pip.document.createElement("div");
        container.style.cssText = "width:100%;height:100%;";
        pip.document.body.appendChild(container);

        setPipWindow(pip);
        setPipContainer(container);

        // Handle PiP window close
        pip.addEventListener("pagehide", () => {
          setPipWindow(null);
          setPipContainer(null);
          onClose();
        });
      } catch (err) {
        console.warn("[WrenPopout] Document PiP failed:", err);
        // Fall back to presence-only float
        setUseDocPiP(false);
      }
    };

    openPiP();

    return () => {
      if (win && !win.closed) {
        try { win.close(); } catch { /* ignore */ }
      }
      setPipWindow(null);
      setPipContainer(null);
    };
  }, [open, useDocPiP]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close PiP window when open becomes false
  useEffect(() => {
    if (!open && pipWindow && !pipWindow.closed) {
      try { pipWindow.close(); } catch { /* ignore */ }
      setPipWindow(null);
      setPipContainer(null);
    }
  }, [open, pipWindow]);

  // Latest Wren line for presence-only fallback
  const latestWrenLine = chatMessages
    .filter((m) => m.role === "assistant")
    .slice(-1)[0]?.content ?? "I'm right here. Keep going.";

  if (!open) return null;

  // Version B: presence-only float (Safari/Firefox or Document PiP failed)
  if (!useDocPiP) {
    return (
      <PresenceOnlyFloat
        secondsLeft={secondsLeft}
        intention={intention}
        wrenActivity={wrenActivity}
        latestWrenLine={latestWrenLine}
        onClose={onClose}
      />
    );
  }

  // Version A: Document PiP portal
  if (!pipContainer) return null;

  return createPortal(
    <PiPSessionUI {...props} onClose={onClose} />,
    pipContainer
  );
}
