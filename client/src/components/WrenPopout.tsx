/**
 * WrenPopout — floating focus companion using Document Picture-in-Picture API
 *
 * Version A (Chrome/Edge/Arc): Full interactive session in a Document PiP window.
 *   - Wren video = full-bleed top ~50% of window, object-fit cover, mix-blend screen, scrim.
 *   - Below: timer · intention · ambient · Stuck/End · collapsed chat bar.
 *   - Chat collapsed by default so Wren stays big; expanding shrinks Wren to slim top banner.
 *   - State lives in FocusSessionsPage so it never resets on move.
 *
 * Version B (Safari/Firefox fallback): Presence-only — Wren even larger (~60%), timer,
 *   intention, her latest line, "tap back to chat" hint. No inputs.
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

// ── Shared style tokens ───────────────────────────────────────────────────────
const navy   = "#0C1322";
const raise  = "#131C30";
const ink    = "#E6E9EF";
const soft   = "#A8B5C4";
const mute   = "#7A8BA0";
const gold   = "#D9A441";
const gold2  = "#E6B964";
const emerald = "#3DA86A";
const line   = "rgba(230,233,239,.10)";
const line2  = "rgba(230,233,239,.20)";
const mono   = "'DM Mono', monospace";
const sans   = "'Inter', system-ui, sans-serif";

function supportsDocumentPiP(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

// ── Version B: presence-only float (Safari / Firefox) ────────────────────────
function PresenceOnlyFloat({
  secondsLeft, intention, wrenActivity, latestWrenLine, onClose,
}: {
  secondsLeft: number; intention: string; wrenActivity: string;
  latestWrenLine: string; onClose: () => void;
}) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, width: 300, zIndex: 9999,
      background: `linear-gradient(180deg, ${raise}, ${navy})`,
      border: `1px solid ${line2}`, borderRadius: 16,
      boxShadow: "0 30px 70px -20px rgba(0,0,0,.85)",
      overflow: "hidden", fontFamily: sans, fontWeight: 300,
      WebkitFontSmoothing: "antialiased",
    }}>
      {/* read-only badge */}
      <span style={{
        position: "absolute", top: 8, right: 11, zIndex: 5,
        fontFamily: mono, fontSize: 8, letterSpacing: ".08em", textTransform: "uppercase",
        color: "rgba(255,255,255,.5)", border: "1px solid rgba(255,255,255,.2)",
        borderRadius: 7, padding: "2px 6px",
      }}>view only</span>
      <button onClick={onClose} style={{
        position: "absolute", top: 8, left: 11, zIndex: 6,
        background: "none", border: "none", cursor: "pointer",
        color: mute, fontSize: 16, lineHeight: 1, padding: "2px 4px",
      }}>×</button>

      {/* Wren stage — full-bleed top ~60% */}
      <div style={{
        position: "relative", width: "100%", height: 188, overflow: "hidden",
        background: `radial-gradient(120% 90% at 50% 30%, rgba(217,164,65,.22), rgba(217,164,65,.04) 55%, transparent 72%)`,
      }}>
        <video
          key={wrenActivity}
          src={WREN_VIDEOS[wrenActivity] ?? WREN_VIDEOS.lookingup}
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", mixBlendMode: "screen",
          }}
        />
        {/* bottom scrim */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: "46%",
          background: `linear-gradient(to top, ${navy} 6%, rgba(12,19,34,.5) 50%, transparent)`,
          zIndex: 2,
        }} />
      </div>

      {/* Lower controls */}
      <div style={{ padding: "10px 16px 16px", textAlign: "center" }}>
        <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 30, letterSpacing: ".04em", color: ink }}>
          {formatTime(secondsLeft)}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: mute, marginTop: 1 }}>
          in session
        </div>
        {intention.trim() && (
          <p style={{ fontStyle: "italic", fontSize: 12, color: soft, marginTop: 7, padding: "0 4px", lineHeight: 1.5 }}>
            "{intention.trim()}"
          </p>
        )}
        <p style={{ fontSize: 11, color: soft, fontStyle: "italic", marginTop: 9 }}>
          "{latestWrenLine}" — Wren
        </p>
        <p style={{ fontFamily: mono, fontSize: 9.5, color: mute, marginTop: 11, paddingTop: 10, borderTop: `1px solid ${line}`, lineHeight: 1.8 }}>
          ↩ tap back to the app to chat or mark Stuck
        </p>
      </div>
    </div>
  );
}

// ── Version A: full interactive session UI (rendered into PiP window) ─────────
function PiPSessionUI({
  secondsLeft, intention, wrenActivity,
  ambientSound, ambientVolume, onSetAmbient, onSetVolume,
  chatMessages, chatInput, chatLoading,
  onChatInputChange, onSendChat, onStuck, onEndEarly, onClose,
}: Omit<WrenPopoutProps, "open" | "wrenActivity"> & { wrenActivity: string; onClose: () => void }) {
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendChat(); }
  }, [onSendChat]);

  // When chat is open, Wren shrinks to a slim top banner (60px); otherwise full-bleed ~200px
  const wrenHeight = chatOpen ? 60 : 200;

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: `linear-gradient(180deg, #0e1726, #0a1120)`,
      color: ink, fontFamily: sans, fontWeight: 300,
      WebkitFontSmoothing: "antialiased",
      display: "flex", flexDirection: "column",
    }}>
      {/* Chrome bar */}
      <div style={{
        height: 30, background: "#161b24",
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
        flexShrink: 0,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: emerald, boxShadow: `0 0 8px ${emerald}`, flexShrink: 0 }} />
        <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>
          Focus · with Wren
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: `1px solid ${line2}`, display: "inline-block" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: `1px solid ${line2}`, display: "inline-block" }} />
        </div>
        <button onClick={onClose} style={{
          marginLeft: 6, background: "none", border: "none", cursor: "pointer",
          color: mute, fontSize: 14, lineHeight: 1, padding: "2px 4px",
        }}>×</button>
      </div>

      {/* Wren stage — full-bleed, shrinks when chat opens */}
      <div style={{
        position: "relative", width: "100%", height: wrenHeight,
        overflow: "hidden", flexShrink: 0,
        background: `radial-gradient(120% 90% at 50% 30%, rgba(217,164,65,.22), rgba(217,164,65,.04) 55%, transparent 72%)`,
        transition: "height 0.3s ease",
      }}>
        <video
          key={wrenActivity}
          src={WREN_VIDEOS[wrenActivity] ?? WREN_VIDEOS.lookingup}
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", mixBlendMode: "screen",
          }}
        />
        {/* bottom scrim */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: "46%",
          background: `linear-gradient(to top, #0c1322 6%, rgba(12,19,34,.5) 50%, transparent)`,
          zIndex: 2,
        }} />
        {/* Wren speech line — only when not in chat mode */}
        {!chatOpen && (() => {
          const lastLine = chatMessages.filter(m => m.role === "assistant").slice(-1)[0]?.content;
          return lastLine ? (
            <p style={{
              position: "absolute", left: 12, bottom: 10, zIndex: 4,
              fontSize: 11.5, color: gold2, fontStyle: "italic",
              maxWidth: "80%", margin: 0, lineHeight: 1.4,
            }}>
              "{lastLine.slice(0, 80)}{lastLine.length > 80 ? "…" : ""}"
            </p>
          ) : null;
        })()}
      </div>

      {/* Lower section */}
      <div style={{ padding: "10px 16px 0", textAlign: "center", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Timer */}
        <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 30, letterSpacing: ".04em", color: ink }}>
          {formatTime(secondsLeft)}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: mute, marginTop: 1 }}>
          in session
        </div>

        {/* Intention */}
        {intention.trim() && (
          <p style={{ fontStyle: "italic", fontSize: 12, color: soft, marginTop: 7, padding: "0 4px", lineHeight: 1.5 }}>
            "{intention.trim()}"
          </p>
        )}

        {/* Ambient sound */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
          {(["silence", "rain", "cafe"] as const).map((s) => (
            <button key={s} onClick={() => onSetAmbient(s)} style={{
              fontFamily: mono, fontSize: 10, padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${ambientSound === s ? "rgba(217,164,65,.4)" : line}`,
              background: ambientSound === s ? "rgba(217,164,65,.14)" : "transparent",
              color: ambientSound === s ? gold : mute,
              cursor: "pointer",
            }}>
              {s === "silence" ? "Silence" : s === "rain" ? "Rain" : "Café"}
            </button>
          ))}
        </div>
        {ambientSound !== "silence" && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <input type="range" min={0} max={100} value={ambientVolume}
              onChange={(e) => onSetVolume(Number(e.target.value))}
              style={{ width: 80, accentColor: gold }}
            />
          </div>
        )}

        {/* Stuck / End early */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 10, fontSize: 11.5 }}>
          <button onClick={onStuck} style={{
            background: "none", border: "none", cursor: "pointer",
            color: gold, display: "flex", alignItems: "center", gap: 4,
          }}>
            <span>⚡</span> Stuck
          </button>
          <span style={{ color: "rgba(230,233,239,.2)", fontSize: 10 }}>·</span>
          <button onClick={onEndEarly} style={{
            background: "none", border: "none", cursor: "pointer",
            color: soft, opacity: 0.6, fontSize: 11,
          }}>
            End early
          </button>
        </div>

        {/* Talk to Wren — collapsed bar by default */}
        <div style={{ marginTop: 11, borderTop: `1px solid ${line}`, flex: 1, display: "flex", flexDirection: "column" }}>
          <button
            onClick={() => setChatOpen(c => !c)}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 2px 8px",
              background: "none", border: "none", cursor: "pointer",
              color: gold2, fontSize: 10,
              fontFamily: mono, letterSpacing: ".1em", textTransform: "uppercase",
            }}
          >
            <span>{chatLoading ? "Wren is thinking…" : "Talk to Wren"}</span>
            <span style={{
              transform: chatOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s", display: "inline-block", color: mute,
            }}>⌄</span>
          </button>

          {chatOpen && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 14 }}>
              {/* Thread */}
              <div style={{
                display: "flex", flexDirection: "column", gap: 7,
                padding: "2px 0 8px", maxHeight: 160, overflowY: "auto",
              }}>
                {chatMessages.slice(-8).map((msg, i) => (
                  <div key={i} style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "82%", fontSize: 12.5, padding: "8px 11px",
                    borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    lineHeight: 1.45,
                    background: msg.role === "user" ? "rgba(217,164,65,.13)" : "rgba(19,28,48,.8)",
                    border: `1px solid ${msg.role === "user" ? "rgba(217,164,65,.25)" : line}`,
                    color: msg.role === "user" ? ink : soft,
                    textAlign: "left",
                  }}>
                    {msg.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              {/* Input */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                border: `1px solid rgba(230,233,239,.18)`,
                borderRadius: 11, padding: "8px 10px",
                background: "rgba(19,28,48,.5)",
              }}>
                <input
                  value={chatInput}
                  onChange={(e) => onChatInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Say something…"
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontSize: 12.5, color: "rgba(230,233,239,.75)",
                    fontFamily: sans,
                  }}
                />
                <button
                  onClick={onSendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: chatLoading || !chatInput.trim() ? "rgba(230,233,239,.12)" : gold,
                    border: "none",
                    cursor: chatLoading || !chatInput.trim() ? "default" : "pointer",
                    display: "grid", placeItems: "center",
                    color: chatLoading || !chatInput.trim() ? mute : "#16100a",
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                </button>
              </div>
            </div>
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

  useEffect(() => { setUseDocPiP(supportsDocumentPiP()); }, []);

  // Open / close Document PiP window
  useEffect(() => {
    if (!open || !useDocPiP) return;
    let win: Window | null = null;

    const openPiP = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: 344, height: 560,
        });
        win = pip;

        // Clone app stylesheets into PiP window
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (sheet.href) {
              const link = pip.document.createElement("link");
              link.rel = "stylesheet"; link.href = sheet.href;
              pip.document.head.appendChild(link);
            } else {
              const style = pip.document.createElement("style");
              Array.from(sheet.cssRules).forEach((rule) => { style.textContent += rule.cssText; });
              pip.document.head.appendChild(style);
            }
          } catch { /* cross-origin sheets — skip */ }
        });

        // Google Fonts
        const fontLink = pip.document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Inter:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap";
        pip.document.head.appendChild(fontLink);

        pip.document.body.style.cssText = "margin:0;padding:0;background:#0a1120;overflow:hidden;";

        const container = pip.document.createElement("div");
        container.style.cssText = "width:100%;height:100%;";
        pip.document.body.appendChild(container);

        setPipWindow(pip);
        setPipContainer(container);

        pip.addEventListener("pagehide", () => {
          setPipWindow(null); setPipContainer(null); onClose();
        });
      } catch (err) {
        console.warn("[WrenPopout] Document PiP failed:", err);
        setUseDocPiP(false);
      }
    };

    openPiP();
    return () => {
      if (win && !win.closed) { try { win.close(); } catch { /* ignore */ } }
      setPipWindow(null); setPipContainer(null);
    };
  }, [open, useDocPiP]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open && pipWindow && !pipWindow.closed) {
      try { pipWindow.close(); } catch { /* ignore */ }
      setPipWindow(null); setPipContainer(null);
    }
  }, [open, pipWindow]);

  const latestWrenLine = chatMessages
    .filter((m) => m.role === "assistant").slice(-1)[0]?.content ?? "I'm right here. Keep going.";

  if (!open) return null;

  // Version B: presence-only float
  if (!useDocPiP) {
    return (
      <PresenceOnlyFloat
        secondsLeft={secondsLeft} intention={intention}
        wrenActivity={wrenActivity} latestWrenLine={latestWrenLine}
        onClose={onClose}
      />
    );
  }

  // Version A: Document PiP portal
  if (!pipContainer) return null;
  return createPortal(<PiPSessionUI {...props} onClose={onClose} />, pipContainer);
}
