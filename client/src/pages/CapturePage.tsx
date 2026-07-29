/**
 * Capture screen (9.1)
 * Voice or text input → creates a capture → navigates to /capture/:id/sort
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Mic, MicOff, Square, Type, Loader2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { createRecorder, type Recorder } from "@soul/capture";


type Mode = "idle" | "voice" | "text";
type RecordState = "idle" | "recording" | "stopping" | "uploading" | "transcribing" | "creating";

const DISCLOSURE = "Your words are sorted by AI and never used for training. Feelings are never saved.";

export default function CapturePage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("idle");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [caption, setCaption] = useState("");
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [captureId, setCaptureId] = useState<number | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const chunksRef = useRef<{ blob: Blob; index: number }[]>([]);
  const startTimeRef = useRef<number>(0);

  const { data: availability } = trpc.transcribe.isAvailable.useQuery();
  const voiceAvailable = availability?.available ?? false;

  const createCapture = trpc.capture.create.useMutation();
  const uploadChunk = trpc.transcribe.uploadChunk.useMutation();
  const transcribe = trpc.transcribe.transcribe.useMutation();
  const utils = trpc.useUtils();

  // ── Text submit ─────────────────────────────────────────────────────────────
  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim();
    if (!text) return;
    setRecordState("creating");
    setError(null);
    try {
      const result = await createCapture.mutateAsync({
        mode: "text",
        transcript: text,
      });
      await utils.capture.recent.invalidate();
      navigate(`/capture/${result.id}/sort`);
    } catch {
      setError("Couldn't save your capture. Please try again.");
      setRecordState("idle");
    }
  }, [textInput, createCapture, navigate, utils]);

  // ── Voice recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null);
    setCaption("");
    setSilenceCountdown(null);
    chunksRef.current = [];
    startTimeRef.current = Date.now();

    // Create a placeholder capture to get an ID for chunk uploads
    let id: number;
    try {
      const result = await createCapture.mutateAsync({
        mode: "voice",
        transcript: "__pending__",
      });
      id = result.id;
      setCaptureId(id);
    } catch {
      setError("Couldn't start recording. Please try again.");
      return;
    }

    setRecordState("recording");
    setMode("voice");

    const recorder = createRecorder({
      onChunk: async (blob, index) => {
        chunksRef.current.push({ blob, index });
        // Upload chunk in background
        try {
          const base64 = await blobToBase64(blob);
          await uploadChunk.mutateAsync({
            captureId: id,
            chunkIndex: index,
            base64,
            mimeType: blob.type || "audio/webm",
          });
        } catch {
          // Non-fatal — transcript will be assembled from uploaded chunks
        }
      },
      onCaption: (text, isFinal) => {
        if (!isFinal) setCaption(text);
      },
      onSilenceCountdown: (s) => setSilenceCountdown(s),
    });

    recorderRef.current = recorder;
    try {
      await recorder.start();
    } catch (err: any) {
      setError(
        err?.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone access and try again."
          : "Couldn't access your microphone. Please try again."
      );
      setRecordState("idle");
      setMode("idle");
    }
  }, [createCapture, uploadChunk]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setRecordState("stopping");
    setSilenceCountdown(null);

    let blobs: Blob[] = [];
    try {
      blobs = await recorder.stop();
    } catch {
      setError("Recording stopped unexpectedly. Please try again.");
      setRecordState("idle");
      return;
    }

    const id = captureId;
    if (!id) {
      setError("Recording lost. Please try again.");
      setRecordState("idle");
      return;
    }

    const durationS = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Upload any remaining chunks that weren't uploaded during recording
    setRecordState("uploading");
    const combinedBlob = new Blob(blobs, { type: blobs[0]?.type || "audio/webm" });
    let audioUrl: string | null = null;
    try {
      const base64 = await blobToBase64(combinedBlob);
      const result = await uploadChunk.mutateAsync({
        captureId: id,
        chunkIndex: 999, // final combined chunk
        base64,
        mimeType: combinedBlob.type,
      });
      audioUrl = result.url;
    } catch {
      setError("Couldn't upload your recording. Please try again.");
      setRecordState("idle");
      return;
    }

    // Transcribe
    setRecordState("transcribing");
    try {
      const { transcript } = await transcribe.mutateAsync({
        audioUrl,
        durationHint: durationS,
      });

      // Update the capture with the real transcript
      setRecordState("creating");
      const finalResult = await createCapture.mutateAsync({
        mode: "voice",
        durationS,
        transcript,
        audioKey: audioUrl,
      });
      await utils.capture.recent.invalidate();
      navigate(`/capture/${finalResult.id}/sort`);
    } catch (err: any) {
      setError(err?.message ?? "Transcription failed. Please try again.");
      setRecordState("idle");
    }
  }, [captureId, uploadChunk, transcribe, createCapture, navigate, utils]);

  // Auto-stop on silence
  useEffect(() => {
    if (silenceCountdown === 0) {
      stopRecording();
    }
  }, [silenceCountdown, stopRecording]);

  const isProcessing = ["stopping", "uploading", "transcribing", "creating"].includes(recordState);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-lg mx-auto px-4 py-8 gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Capture</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Say or type whatever's in your head. Wren will sort it.
        </p>
      </div>

      {/* Disclosure */}
      <div className="flex items-start gap-2 rounded-lg p-3 text-xs text-muted-foreground"
        style={{ background: "oklch(0.135 0.030 245)", border: "1px solid oklch(0.215 0.030 245)" }}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "oklch(0.74 0.14 72)" }} />
        <span>{DISCLOSURE}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg p-3 text-sm text-destructive-foreground"
          style={{ background: "oklch(0.18 0.06 22)", border: "1px solid oklch(0.35 0.12 22)" }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode selector */}
      {mode === "idle" && !isProcessing && (
        <div className="flex flex-col gap-3">
          {voiceAvailable && (
            <button
              onClick={startRecording}
              className="flex items-center gap-4 rounded-xl p-5 text-left transition-all active:scale-[0.98]"
              style={{
                background: "oklch(0.135 0.030 245)",
                border: "1px solid oklch(0.215 0.030 245)",
              }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.74 0.14 72 / 0.15)", border: "1px solid oklch(0.74 0.14 72 / 0.3)" }}>
                <Mic className="w-5 h-5" style={{ color: "oklch(0.74 0.14 72)" }} />
              </div>
              <div>
                <div className="font-semibold text-foreground">Voice capture</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Speak freely — stops after 3 min of silence
                </div>
              </div>
            </button>
          )}
          <button
            onClick={() => setMode("text")}
            className="flex items-center gap-4 rounded-xl p-5 text-left transition-all active:scale-[0.98]"
            style={{
              background: "oklch(0.135 0.030 245)",
              border: "1px solid oklch(0.215 0.030 245)",
            }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.68 0.17 155 / 0.12)", border: "1px solid oklch(0.68 0.17 155 / 0.25)" }}>
              <Type className="w-5 h-5" style={{ color: "oklch(0.68 0.17 155)" }} />
            </div>
            <div>
              <div className="font-semibold text-foreground">Text capture</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Type whatever's on your mind
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Voice recording state */}
      {mode === "voice" && !isProcessing && (
        <div className="flex flex-col items-center gap-6 py-8">
          {/* Pulsing mic */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ background: "oklch(0.74 0.14 72)" }} />
            <div className="w-20 h-20 rounded-full flex items-center justify-center relative"
              style={{ background: "oklch(0.74 0.14 72 / 0.15)", border: "2px solid oklch(0.74 0.14 72 / 0.5)" }}>
              <Mic className="w-8 h-8" style={{ color: "oklch(0.74 0.14 72)" }} />
            </div>
          </div>

          {/* Caption */}
          <p className="text-sm text-muted-foreground text-center min-h-[1.5rem]">
            {caption || "Listening…"}
          </p>

          {/* Silence countdown */}
          {silenceCountdown !== null && silenceCountdown <= 15 && (
            <p className="text-xs text-muted-foreground">
              Stopping in {silenceCountdown}s…
            </p>
          )}

          {/* Stop button */}
          <Button
            onClick={stopRecording}
            variant="outline"
            className="gap-2 rounded-full px-6"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop recording
          </Button>

          <button
            onClick={() => {
              recorderRef.current?.stop().catch(() => {});
              setMode("idle");
              setRecordState("idle");
              setCaptureId(null);
            }}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.74 0.14 72)" }} />
          <p className="text-sm text-muted-foreground text-center">
            {recordState === "uploading" && "Uploading recording…"}
            {recordState === "transcribing" && "Transcribing…"}
            {recordState === "creating" && "Saving capture…"}
            {recordState === "stopping" && "Finishing up…"}
          </p>
        </div>
      )}

      {/* Text input mode */}
      {mode === "text" && !isProcessing && (
        <div className="flex flex-col gap-4">
          <Textarea
            autoFocus
            placeholder="What's on your mind? Dump it all here — tasks, worries, ideas, half-thoughts…"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-[200px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleTextSubmit();
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || createCapture.isPending}
              className="flex-1 gap-2"
              style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.10 0.03 72)" }}
            >
              {createCapture.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Sort this
            </Button>
            <Button
              variant="outline"
              onClick={() => { setMode("idle"); setTextInput(""); }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">⌘↵ to submit</p>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
