/**
 * FocusCompanionPage — standalone companion window for Safari/Firefox
 *
 * Opened via window.open("/focus-companion", ...) from WrenPopout.
 * Syncs live state from the main tab via BroadcastChannel.
 * Renders the same UI as PiP Version A (full-bleed Wren, timer, chat, ambient, Stuck).
 *
 * BroadcastChannel protocol:
 *   main → companion: { type: "STATE_UPDATE", payload: FocusCompanionState }
 *   main → companion: { type: "SESSION_END" }
 *   companion → main: { type: "SEND_CHAT", message: string }
 *   companion → main: { type: "SET_AMBIENT", sound: string }
 *   companion → main: { type: "SET_VOLUME", volume: number }
 *   companion → main: { type: "STUCK" }
 *   companion → main: { type: "END_EARLY" }
 *   companion → main: { type: "READY" }  ← companion signals it's ready to receive state
 */

import { useEffect, useRef, useState, useCallback } from "react";

const CHANNEL_NAME = "wren-focus-companion";

const WREN_VIDEOS: Record<string, string> = {
  weaving:   "/manus-storage/wren-weaving_b532984b.mp4",
  reading:   "/manus-storage/wren-reading_bd6af9a6.mp4",
  writing:   "/manus-storage/wren-reading_bd6af9a6.mp4", // .mov normalized → reading clip
  lookingup: "/manus-storage/wren-lookingup_f1735040.mp4",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type ChatMsg = { role: "user" | "assistant"; content: string; ts: number };

interface CompanionState {
  secondsLeft: number;
  intention: string;
  wrenActivity: string;
  ambientSound: "silence" | "rain" | "cafe";
  ambientVolume: number;
  chatMessages: ChatMsg[];
  chatLoading: boolean;
  sessionActive: boolean;
}

// ── Style tokens (match WrenPopout) ──────────────────────────────────────────
const navy    = "#0C1322";
const raise   = "#131C30";
const ink     = "#E6E9EF";
const soft    = "#A8B5C4";
const mute    = "#7A8BA0";
const gold    = "#D9A441";
const gold2   = "#E6B964";
const emerald = "#3DA86A";
const line    = "rgba(230,233,239,.10)";
const line2   = "rgba(230,233,239,.20)";
const mono    = "'DM Mono', monospace";
const sans    = "'Inter', system-ui, sans-serif";

export default function FocusCompanionPage() {
  const [state, setState] = useState<CompanionState>({
    secondsLeft: 0,
    intention: "",
    wrenActivity: "weaving",
    ambientSound: "silence",
    ambientVolume: 40,
    chatMessages: [],
    chatLoading: false,
    sessionActive: true,
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom when messages arrive
  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatMessages, chatOpen]);

  // Set up BroadcastChannel
  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = ch;

    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "STATE_UPDATE") {
        setState(msg.payload);
        setConnected(true);
      } else if (msg.type === "SESSION_END") {
        setState(s => ({ ...s, sessionActive: false }));
      } else if (msg.type === "CHAT_REPLY") {
        // Main tab relays Wren's reply back
        setState(s => ({
          ...s,
          chatMessages: msg.messages,
          chatLoading: false,
        }));
      }
    };

    // Signal to the main tab that we're ready
    ch.postMessage({ type: "READY" });

    // Style the window
    document.title = "Wren · Focus";
    document.documentElement.style.cssText = `
      margin: 0; padding: 0; background: ${navy}; overflow: hidden;
      font-family: ${sans}; -webkit-font-smoothing: antialiased;
    `;
    document.body.style.cssText = "margin: 0; padding: 0;";

    return () => { ch.close(); };
  }, []);

  const send = useCallback((msg: object) => {
    channelRef.current?.postMessage(msg);
  }, []);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    // Optimistically add user message
    setState(s => ({
      ...s,
      chatMessages: [...s.chatMessages, { role: "user", content: msg, ts: Date.now() }],
      chatLoading: true,
    }));
    send({ type: "SEND_CHAT", message: msg });
  }, [chatInput, send]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); }
  }, [handleSendChat]);

  const wrenHeight = chatOpen ? 60 : 280;
  const latestWrenLine = state.chatMessages
    .filter(m => m.role === "assistant").slice(-1)[0]?.content;

  if (!state.sessionActive) {
    return (
      <div style={{
        width: "100vw", height: "100vh",
        background: `linear-gradient(180deg, ${raise}, ${navy})`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        color: soft, fontFamily: mono, fontSize: 13, gap: 12,
        textAlign: "center", padding: "0 24px",
      }}>
        <span style={{ fontSize: 28 }}>✦</span>
        <p style={{ margin: 0, color: ink, fontSize: 15 }}>Session complete.</p>
        <p style={{ margin: 0, fontSize: 12, color: mute }}>You can close this window.</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div style={{
        width: "100vw", height: "100vh",
        background: navy,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        color: mute, fontFamily: mono, fontSize: 11, gap: 10,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: gold, boxShadow: `0 0 12px ${gold}`,
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
        <p style={{ margin: 0, letterSpacing: ".1em", textTransform: "uppercase" }}>
          Connecting to session…
        </p>
        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: `linear-gradient(180deg, #0e1726, #0a1120)`,
      color: ink, fontFamily: sans, fontWeight: 300,
      WebkitFontSmoothing: "antialiased",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Chrome bar */}
      <div style={{
        height: 30, background: "#161b24",
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
        flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: emerald, boxShadow: `0 0 8px ${emerald}`, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: mono, fontSize: 9.5, letterSpacing: ".12em",
          textTransform: "uppercase", color: "rgba(255,255,255,.55)",
        }}>
          Focus · with Wren
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: `1px solid ${line2}`, display: "inline-block" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: `1px solid ${line2}`, display: "inline-block" }} />
        </div>
        <button onClick={() => window.close()} style={{
          marginLeft: 6, background: "none", border: "none", cursor: "pointer",
          color: mute, fontSize: 14, lineHeight: 1, padding: "2px 4px",
        }}>×</button>
      </div>

      {/* Wren stage */}
      <div style={{
        position: "relative", width: "100%", height: wrenHeight,
        overflow: "hidden", flexShrink: 0,
        background: `radial-gradient(120% 90% at 50% 30%, rgba(217,164,65,.22), rgba(217,164,65,.04) 55%, transparent 72%)`,
        transition: "height 0.3s ease",
      }}>
        <video
          key={state.wrenActivity}
          src={WREN_VIDEOS[state.wrenActivity] ?? WREN_VIDEOS.lookingup}
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
        {/* Wren speech line */}
        {!chatOpen && latestWrenLine && (
          <p style={{
            position: "absolute", left: 12, bottom: 10, zIndex: 4,
            fontSize: 11.5, color: gold2, fontStyle: "italic",
            maxWidth: "80%", margin: 0, lineHeight: 1.4,
          }}>
            "{latestWrenLine.slice(0, 80)}{latestWrenLine.length > 80 ? "…" : ""}"
          </p>
        )}
      </div>

      {/* Lower section */}
      <div style={{ padding: "10px 16px 0", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Timer */}
        <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 30, letterSpacing: ".04em", color: ink }}>
          {formatTime(state.secondsLeft)}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: mute, marginTop: 1 }}>
          in session
        </div>

        {/* Intention */}
        {state.intention.trim() && (
          <p style={{ fontStyle: "italic", fontSize: 12, color: soft, marginTop: 7, padding: "0 4px", lineHeight: 1.5 }}>
            "{state.intention.trim()}"
          </p>
        )}

        {/* Ambient sound */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
          {(["silence", "rain", "cafe"] as const).map((s) => (
            <button key={s} onClick={() => send({ type: "SET_AMBIENT", sound: s })} style={{
              fontFamily: mono, fontSize: 10, padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${state.ambientSound === s ? "rgba(217,164,65,.4)" : line}`,
              background: state.ambientSound === s ? "rgba(217,164,65,.14)" : "transparent",
              color: state.ambientSound === s ? gold : mute,
              cursor: "pointer",
            }}>
              {s === "silence" ? "Silence" : s === "rain" ? "Rain" : "Café"}
            </button>
          ))}
        </div>
        {state.ambientSound !== "silence" && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <input type="range" min={0} max={100} value={state.ambientVolume}
              onChange={(e) => send({ type: "SET_VOLUME", volume: Number(e.target.value) })}
              style={{ width: 80, accentColor: gold }}
            />
          </div>
        )}

        {/* Stuck / End early */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 10, fontSize: 11.5 }}>
          <button onClick={() => send({ type: "STUCK" })} style={{
            background: "none", border: "none", cursor: "pointer",
            color: gold, display: "flex", alignItems: "center", gap: 4,
          }}>
            <span>⚡</span> Stuck
          </button>
          <span style={{ color: "rgba(230,233,239,.2)", fontSize: 10 }}>·</span>
          <button onClick={() => send({ type: "END_EARLY" })} style={{
            background: "none", border: "none", cursor: "pointer",
            color: soft, opacity: 0.6, fontSize: 11,
          }}>
            End early
          </button>
        </div>

        {/* Talk to Wren */}
        <div style={{ marginTop: 11, borderTop: `1px solid ${line}`, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <button
            onClick={() => setChatOpen(c => !c)}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 2px 8px",
              background: "none", border: "none", cursor: "pointer",
              color: gold2, fontSize: 10,
              fontFamily: mono, letterSpacing: ".1em", textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            <span>{state.chatLoading ? "Wren is thinking…" : "Talk to Wren"}</span>
            <span style={{
              transform: chatOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s", display: "inline-block", color: mute,
            }}>⌄</span>
          </button>

          {chatOpen && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 14, overflow: "hidden" }}>
              <div style={{
                display: "flex", flexDirection: "column", gap: 7,
                padding: "2px 0 8px", flex: 1, overflowY: "auto",
              }}>
                {state.chatMessages.slice(-8).map((msg, i) => (
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
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                border: `1px solid rgba(230,233,239,.18)`,
                borderRadius: 11, padding: "8px 10px",
                background: "rgba(19,28,48,.5)",
                flexShrink: 0,
              }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Say something…"
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontSize: 12.5, color: "rgba(230,233,239,.75)",
                    fontFamily: sans,
                  }}
                />
                <button
                  onClick={handleSendChat}
                  disabled={state.chatLoading || !chatInput.trim()}
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: state.chatLoading || !chatInput.trim() ? "rgba(230,233,239,.12)" : gold,
                    border: "none",
                    cursor: state.chatLoading || !chatInput.trim() ? "default" : "pointer",
                    display: "grid", placeItems: "center",
                    color: state.chatLoading || !chatInput.trim() ? mute : "#16100a",
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
