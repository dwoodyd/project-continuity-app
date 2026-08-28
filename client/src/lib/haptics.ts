export type HapticKind = "light" | "success";

/**
 * A best-effort, low-intensity tactile acknowledgment for deliberate mobile
 * actions. Browsers and devices that do not expose Vibration API simply no-op.
 */
export function triggerHaptic(kind: HapticKind = "light") {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof navigator.vibrate !== "function") return;

  try {
    navigator.vibrate(kind === "success" ? [10, 24, 14] : 8);
  } catch {
    // Haptics are enhancement-only and must never interrupt the intended action.
  }
}
