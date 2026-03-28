import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lightbulb, Mic, MicOff, Send, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNotifications } from "@/hooks/useNotifications";

interface IdeaSanctuaryModalProps {
  open: boolean;
  onClose: () => void;
  capturedDuringTask?: boolean;
}

export default function IdeaSanctuaryModal({
  open,
  onClose,
  capturedDuringTask = false,
}: IdeaSanctuaryModalProps) {
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { queueOfflineIdea, getOfflineQueue, removeFromOfflineQueue } = useNotifications();
  const utils = trpc.useUtils();

  const captureIdea = trpc.ai.captureIdea.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setContent("");
        onClose();
      }, 1200);
    },
    onError: async () => {
      // Fall back to offline queue
      if (content.trim()) {
        await queueOfflineIdea(content.trim());
        toast.info("Saved offline. Will sync when connection returns.", {
          icon: <WifiOff className="w-4 h-4" />,
        });
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setContent("");
          onClose();
        }, 1500);
      }
    },
  });

  const transcribeVoice = trpc.vault.transcribeVoice.useMutation({
    onSuccess: (data) => {
      setContent((prev) => (prev ? prev + "\n" + data.transcript : data.transcript));
    },
    onError: () => toast.error("Transcription failed."),
  });

  // Track online/offline status
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Sync offline queue when back online
  useEffect(() => {
    if (isOffline) return;

    const syncQueue = async () => {
      const queue = await getOfflineQueue();
      const pending = queue.filter((q) => !q.synced);
      if (pending.length === 0) return;

      for (const item of pending) {
        try {
          await captureIdea.mutateAsync({ content: item.content, capturedDuringTask: false });
          await removeFromOfflineQueue(item.id);
        } catch {
          // Will retry next time
        }
      }
      if (pending.length > 0) {
        await utils.ai.listIdeas.invalidate();
        toast.success(`${pending.length} offline idea${pending.length > 1 ? "s" : ""} synced.`);
      }
    };

    syncQueue();
  }, [isOffline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check queued count
  useEffect(() => {
    getOfflineQueue().then((q) => setQueuedCount(q.filter((i) => !i.synced).length));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for SW sync trigger
  useEffect(() => {
    const handler = () => {
      if (!isOffline) {
        getOfflineQueue().then(async (queue) => {
          for (const item of queue.filter((q) => !q.synced)) {
            try {
              await captureIdea.mutateAsync({ content: item.content, capturedDuringTask: false });
              await removeFromOfflineQueue(item.id);
            } catch {}
          }
        });
      }
    };
    window.addEventListener("continuity:sync-ideas", handler);
    return () => window.removeEventListener("continuity:sync-ideas", handler);
  }, [isOffline]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!content.trim()) return;

    if (isOffline) {
      await queueOfflineIdea(content.trim());
      toast.info("Saved offline. Will sync when connection returns.", {
        icon: <WifiOff className="w-4 h-4" />,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setContent("");
        onClose();
      }, 1500);
      return;
    }

    captureIdea.mutate({ content: content.trim(), capturedDuringTask });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
    if (e.key === "Escape") onClose();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1]!;
          transcribeVoice.mutate({
            audioBase64: base64,
            mimeType: "audio/webm",
            fileName: `idea-${Date.now()}.webm`,
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Idea Sanctuary
          </DialogTitle>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              Park this thought. It won't derail you. Back to work in seconds.
            </p>
            {isOffline && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
          </div>
          {queuedCount > 0 && !isOffline && (
            <p className="text-xs text-muted-foreground mt-1">
              {queuedCount} idea{queuedCount > 1 ? "s" : ""} queued offline — syncing now.
            </p>
          )}
        </DialogHeader>

        <div className="px-5 py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What just occurred to you?"
            className="min-h-[100px] resize-none text-sm bg-muted/30 border-border/60 focus:border-foreground/20"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5">⌘ + Enter to save</p>
        </div>

        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={transcribeVoice.isPending}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isRecording
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {transcribeVoice.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
            {isRecording ? "Stop" : "Voice"}
          </button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || captureIdea.isPending}
              className="gap-1.5"
            >
              {saved ? (
                "Saved ✓"
              ) : captureIdea.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving</>
              ) : isOffline ? (
                <><WifiOff className="w-3.5 h-3.5" /> Save offline</>
              ) : (
                <><Send className="w-3.5 h-3.5" /> Park it</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
