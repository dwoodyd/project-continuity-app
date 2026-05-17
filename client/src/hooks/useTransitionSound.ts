/**
 * useTransitionSound
 * Plays a soft ambient chime using the Web Audio API — no external file needed.
 * The chime is a gentle sine wave with a short attack and natural decay,
 * designed to signal a task/mode transition without being jarring.
 */
export function useTransitionSound() {
  const playChime = (type: "focus_start" | "mode_toggle" = "focus_start") => {
    try {
      const AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();

      // Two-note chime: root + fifth (calming interval)
      const frequencies =
        type === "focus_start"
          ? [523.25, 783.99] // C5 + G5 — "begin" signal
          : [659.25, 523.25]; // E5 + C5 — "shift" signal (descending, softer)

      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

        const startTime = ctx.currentTime + i * 0.12; // slight stagger
        const duration = 0.8;

        // Soft attack + natural decay
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });

      // Close context after chime finishes
      setTimeout(() => ctx.close(), 2000);
    } catch {
      // Silently ignore — audio is a nice-to-have, never block the UI
    }
  };

  return { playChime };
}
