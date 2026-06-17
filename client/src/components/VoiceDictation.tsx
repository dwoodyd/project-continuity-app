/**
 * VoiceDictation — hold-to-record mic button powered by Whisper API.
 *
 * Usage:
 *   <VoiceDictation onTranscript={(text) => setValue(prev => prev + text)} />
 *
 * UX:
 *   - Press and hold (or tap on mobile) to record
 *   - Release to stop and transcribe
 *   - Transcript is appended to the caller's textarea via onTranscript
 *   - Visual states: idle → recording (pulse) → transcribing (spinner) → done
 */
import { useRef, useState, useCallback } from "react";
import { Mic, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";
import { cn } from "@/lib/utils";

type Props = {
  onTranscript: (text: string) => void;
  context?: string; // optional hint for Whisper prompt
  className?: string;
  disabled?: boolean;
};

type State = "idle" | "recording" | "transcribing";

export function VoiceDictation({ onTranscript, context, className, disabled }: Props) {
  const [state, setState] = useState<State>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const transcribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: ({ text }) => {
      if (text) {
        // Append with a space separator if the existing value doesn't end with whitespace
        onTranscript(text);
        notify.saved("Transcribed", { description: "Voice added to your notes." });
      }
      setState("idle");
    },
    onError: (err) => {
      notify.error("Transcription failed", { description: err.message });
      setState("idle");
    },
  });

  const startRecording = useCallback(async () => {
    if (state !== "idle" || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Prefer webm/opus; fall back to whatever the browser supports
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect chunks every 250ms
      setState("recording");
    } catch {
      notify.error("Microphone access denied", {
        description: "Allow microphone access in your browser to use voice input.",
      });
    }
  }, [state, disabled]);

  const stopRecording = useCallback(() => {
    if (state !== "recording") return;
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.onstop = async () => {
      // Stop all tracks
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });

      if (blob.size < 1000) {
        // Too short — likely just noise
        setState("idle");
        notify.info("Recording too short", { description: "Hold the mic button while speaking." });
        return;
      }

      if (blob.size > 16 * 1024 * 1024) {
        setState("idle");
        notify.error("Recording too long", { description: "Keep recordings under 16 MB." });
        return;
      }

      setState("transcribing");

      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        transcribeMutation.mutate({
          audioBase64: base64,
          mimeType: blob.type || "audio/webm",
          context,
        });
      };
      reader.readAsDataURL(blob);
    };

    recorder.stop();
  }, [state, context, transcribeMutation]);

  // Pointer events: works for both mouse and touch
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    startRecording();
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    stopRecording();
  };

  const isRecording = state === "recording";
  const isTranscribing = state === "transcribing";

  return (
    <button
      type="button"
      aria-label={
        isRecording ? "Recording — release to transcribe" :
        isTranscribing ? "Transcribing…" :
        "Hold to dictate"
      }
      title={
        isRecording ? "Release to transcribe" :
        isTranscribing ? "Transcribing…" :
        "Hold to dictate (Whisper)"
      }
      disabled={disabled || isTranscribing}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // cancel if pointer leaves button
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all select-none touch-none",
        "w-9 h-9 shrink-0",
        isRecording && "scale-110",
        isTranscribing && "opacity-70 cursor-wait",
        !disabled && !isTranscribing && "cursor-pointer",
        className
      )}
      style={{
        background: isRecording
          ? "oklch(0.72 0.17 65 / 0.20)"
          : "oklch(1 0 0 / 0.06)",
        border: `1.5px solid ${isRecording ? "oklch(0.72 0.17 65 / 0.60)" : "oklch(1 0 0 / 0.12)"}`,
        boxShadow: isRecording ? "0 0 0 4px oklch(0.72 0.17 65 / 0.12)" : "none",
      }}
    >
      {isTranscribing ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "oklch(0.72 0.17 65 / 0.80)" }} />
      ) : (
        <Mic
          className="w-4 h-4"
          style={{ color: isRecording ? "oklch(0.74 0.14 72)" : "oklch(1 0 0 / 0.45)" }}
        />
      )}
      {/* Recording pulse ring */}
      {isRecording && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: "oklch(0.72 0.17 65 / 0.15)" }}
        />
      )}
    </button>
  );
}
