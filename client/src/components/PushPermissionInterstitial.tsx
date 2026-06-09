/**
 * PushPermissionInterstitial — Reframed push notification permission request.
 *
 * Instead of the browser's generic "Allow notifications?" prompt, this shows
 * a full-screen interstitial that frames notifications as a continuity benefit
 * before triggering the real browser permission dialog.
 *
 * Usage: render when you want to request push permission.
 * Props:
 *   onAllow  — called after permission granted (or after browser dialog)
 *   onDismiss — called if user says "not now"
 */

import { useState } from "react";

interface Props {
  onAllow: () => void;
  onDismiss: () => void;
}

const NUDGE_EXAMPLES = [
  { time: "8:00 AM", text: "Your morning check-in is open.", icon: "◌" },
  { time: "5:00 PM", text: "Close the day before it fades.", icon: "◎" },
  { time: "Tomorrow", text: "A project is going cold. Worth a look?", icon: "○" },
];

export function PushPermissionInterstitial({ onAllow, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAllow() {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        try {
          const reg = await navigator.serviceWorker.ready;
          const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (vapidKey) {
            await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapidKey,
            });
          }
        } catch {
          // SW not ready — permission saved, subscription on next session
        }
      }
    } catch {
      // Permission request failed silently
    } finally {
      setLoading(false);
      onAllow();
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9997,
        background: "oklch(0.09 0.01 270 / 0.96)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 env(safe-area-inset-bottom, 0)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "oklch(0.12 0.02 270)",
          borderTop: "1px solid oklch(0.22 0.04 270)",
          borderRadius: "20px 20px 0 0",
          padding: "28px 24px 36px",
          animation: "slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "oklch(0.18 0.06 270)",
          border: "1px solid oklch(0.30 0.08 270 / 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
          fontSize: 22,
        }}>
          🧵
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 22,
          fontWeight: 600,
          color: "oklch(0.96 0.005 270)",
          lineHeight: 1.3,
          marginBottom: 10,
        }}>
          Let Continuary keep your thread warm.
        </h2>

        {/* Body */}
        <p style={{
          fontSize: 14,
          color: "oklch(0.55 0.01 270)",
          lineHeight: 1.6,
          fontFamily: "Inter, sans-serif",
          marginBottom: 22,
        }}>
          Three gentle nudges a day — timed to your rhythm. No noise. Just a signal when your thread needs attention.
        </p>

        {/* Example nudges */}
        <div style={{
          background: "oklch(0.09 0.01 270)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 24,
          border: "1px solid oklch(0.18 0.03 270)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          {NUDGE_EXAMPLES.map((ex, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <div style={{
                fontSize: 16,
                color: "oklch(0.50 0.10 270)",
                width: 20,
                textAlign: "center",
                flexShrink: 0,
              }}>
                {ex.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  color: "oklch(0.82 0.005 270)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                }}>
                  {ex.text}
                </div>
              </div>
              <div style={{
                fontSize: 11,
                color: "oklch(0.38 0.01 270)",
                fontFamily: "Inter, sans-serif",
                flexShrink: 0,
              }}>
                {ex.time}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleAllow}
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 100,
            background: loading ? "oklch(0.30 0.04 270)" : "oklch(0.96 0.005 270)",
            color: "oklch(0.09 0.01 270)",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            border: "none",
            cursor: loading ? "default" : "pointer",
            marginBottom: 12,
            transition: "background 0.2s ease-out",
          }}
        >
          {loading ? "Setting up…" : "Keep my thread warm"}
        </button>

        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 100,
            background: "transparent",
            border: "none",
            color: "oklch(0.42 0.01 270)",
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
          }}
        >
          Not now
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
