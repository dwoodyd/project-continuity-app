/**
 * VoiceDictationButton
 *
 * A small microphone button that sits at the corner of a textarea.
 * Tap to record, tap again to stop. The transcript is appended to
 * the existing field value via the `onTranscript` callback.
 *
 * Architecture: browser records WebM audio → base64 → tRPC
 * `ai.transcribeVoiceDirect` → Whisper → transcript text.
 * Audio is never stored; zero storage cost.
 */

import { useRef, useState, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "processing";

interface VoiceDictationButtonProps {
  /** Called with the transcribed text when transcription completes.
   *  Append vs replace logic lives here — callers decide. */
  onTranscript: (text: string) => void;
  /** Extra classes for positioning (e.g. "absolute bottom-2 right-2") */
  className?: string;
  /** Disabled while the parent form is submitting */
  disabled?: boolean;
}

export function VoiceDictationButton({
  onTranscript,
  className,
  disabled = false,
}: VoiceDictationButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const transcribeMutation = trpc.ai.transcribeVoiceDirect.useMutation({
    onSuccess: (data) => {
      if (data.transcript) {
        onTranscript(data.transcript);
        toast.success("Transcribed", { description: "Voice note added to field." });
      } else {
        toast.info("Nothing heard", { description: "No speech detected — try again." });
      }
      setState("idle");
      setSeconds(0);
    },
    onError: (err) => {
      toast.error("Transcription failed", { description: err.message });
      setState("idle");
      setSeconds(0);
    },
  });

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
    // Stream tracks are stopped in the onstop handler
  }, [stopTimer]);

  const startRecording = useCallback(async () => {
    // Request mic permission
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      if (isDenied) {
        toast.error("Microphone access denied", {
          description:
            "Allow microphone access in your browser settings, then try again.",
        });
      } else {
        toast.error("Microphone unavailable", {
          description: "Could not access your microphone. Check device settings.",
        });
      }
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    // Prefer WebM/Opus; fall back to whatever the browser supports
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // Stop all tracks to release the mic indicator
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      if (chunksRef.current.length === 0) {
        toast.info("No audio captured", { description: "Recording was too short." });
        setState("idle");
        setSeconds(0);
        return;
      }

      setState("processing");

      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });

      // Check size before encoding (~15 MB raw → ~20 MB base64)
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB > 12) {
        toast.error("Recording too long", {
          description: `${sizeMB.toFixed(1)} MB — please keep recordings under ~90 seconds.`,
        });
        setState("idle");
        setSeconds(0);
        return;
      }

      // Convert to base64
      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]!);
      }
      const audioBase64 = btoa(binary);

      transcribeMutation.mutate({ audioBase64 });
    };

    recorder.start(250); // collect chunks every 250 ms
    setState("recording");
    setSeconds(0);

    // Tick timer every second
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        // Auto-stop at 90 seconds to stay well under the 16 MB Whisper limit
        if (s >= 89) {
          stopRecording();
          return s;
        }
        return s + 1;
      });
    }, 1000);
  }, [transcribeMutation, stopRecording]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
    // "processing" state: button is disabled, no action
  }, [disabled, state, startRecording, stopRecording]);

  const isProcessing = state === "processing";
  const isRecording = state === "recording";

  // Format seconds as M:SS
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      title={
        isProcessing
          ? "Transcribing…"
          : isRecording
          ? `Recording — ${formatTime(seconds)} (tap to stop)`
          : "Tap to dictate"
      }
      aria-label={
        isProcessing
          ? "Transcribing audio"
          : isRecording
          ? "Stop recording"
          : "Start voice dictation"
      }
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Idle
        state === "idle" &&
          "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        // Recording — pulsing red ring
        isRecording &&
          "bg-destructive/10 text-destructive animate-pulse ring-2 ring-destructive/40",
        // Processing — subdued
        isProcessing && "text-muted-foreground cursor-not-allowed opacity-60",
        // Disabled from parent
        disabled && !isProcessing && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {isProcessing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isRecording ? (
        <MicOff className="w-3.5 h-3.5" />
      ) : (
        <Mic className="w-3.5 h-3.5" />
      )}
      {isRecording && (
        <span className="tabular-nums leading-none">{formatTime(seconds)}</span>
      )}
      {isProcessing && <span className="leading-none">Transcribing…</span>}
    </button>
  );
}
