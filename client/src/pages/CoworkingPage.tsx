/**
 * CoworkingPage — Body Doubling Room (ADHD Hack #2)
 *
 * Architecture:
 * - Room list loaded via tRPC (coworking.listRooms)
 * - Session start/end via tRPC (coworking.joinSession / leaveSession)
 * - Real-time presence via WebSocket at /ws/coworking
 * - Status dots: working / stuck / done
 * - Session timer: client-side only
 * - AI next-step: one call at session close only (~200-300 tokens)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  LogOut,
  Sparkles,
  ChevronRight,
  History,
} from "lucide-react";
import { trpc as trpcClient } from "@/lib/trpc";

// ── Types ────────────────────────────────────────────────────────────────────
type ParticipantStatus = "working" | "stuck" | "done";

interface Participant {
  userId: number;
  name: string;
  status: ParticipantStatus;
  workingOn: string;
  joinedAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function statusColor(status: ParticipantStatus): string {
  if (status === "working") return "bg-emerald-500";
  if (status === "stuck") return "bg-amber-400";
  return "bg-slate-500";
}

function statusLabel(status: ParticipantStatus): string {
  if (status === "working") return "Working";
  if (status === "stuck") return "Stuck";
  return "Done";
}

// ── WebSocket hook ────────────────────────────────────────────────────────────
function useCoworkingWS(
  roomSlug: string | null,
  userId: number | null,
  userName: string | null,
  workingOn: string,
  onSnapshot: (participants: Participant[]) => void,
  onJoined: (participant: Participant) => void,
  onLeft: (userId: number) => void,
  onStatusChanged: (userId: number, status: ParticipantStatus) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    if (!roomSlug || !userId || !userName) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/coworking`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          roomSlug,
          userId,
          name: userName,
          workingOn,
          status: "working",
        })
      );
      // Keepalive ping every 25s
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "snapshot") onSnapshot(msg.participants);
        if (msg.type === "joined") onJoined(msg.participant);
        if (msg.type === "left") onLeft(msg.userId);
        if (msg.type === "status_changed") onStatusChanged(msg.userId, msg.status);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [roomSlug, userId, userName, workingOn, onSnapshot, onJoined, onLeft, onStatusChanged]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "leave" }));
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
  }, []);

  const sendStatusUpdate = useCallback((status: ParticipantStatus) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "status_update", status }));
    }
  }, []);

  useEffect(() => {
    if (roomSlug && userId) connect();
    return () => disconnect();
  }, [roomSlug, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { disconnect, sendStatusUpdate };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CoworkingPage() {
  const { user } = useAuth();
  const utils = trpcClient.useUtils();

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: rooms = [], isLoading: roomsLoading } = trpc.coworking.listRooms.useQuery();
  const { data: recentSessions = [] } = trpc.coworking.myRecentSessions.useQuery({ limit: 5 });

  // ── Session state ─────────────────────────────────────────────────────────
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedRoomSlug, setSelectedRoomSlug] = useState<string | null>(null);
  const [workingOn, setWorkingOn] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [myStatus, setMyStatus] = useState<ParticipantStatus>("working");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [aiNextStep, setAiNextStep] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const joinMutation = trpc.coworking.joinSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setElapsedSeconds(0);
    },
    onError: () => toast.error("Couldn't join the room. Try again."),
  });

  const leaveMutation = trpc.coworking.leaveSession.useMutation({
    onSuccess: (data) => {
      setAiNextStep(data.aiNextStep);
      setSessionId(null);
      setSelectedRoomId(null);
      setSelectedRoomSlug(null);
      setParticipants([]);
      utils.coworking.myRecentSessions.invalidate();
    },
    onError: () => toast.error("Couldn't end the session. Try again."),
  });

  const updateStatusMutation = trpc.coworking.updateStatus.useMutation();

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // ── WebSocket presence ────────────────────────────────────────────────────
  const handleSnapshot = useCallback((ps: Participant[]) => setParticipants(ps), []);
  const handleJoined = useCallback(
    (p: Participant) => setParticipants((prev) => [...prev.filter((x) => x.userId !== p.userId), p]),
    []
  );
  const handleLeft = useCallback(
    (uid: number) => setParticipants((prev) => prev.filter((x) => x.userId !== uid)),
    []
  );
  const handleStatusChanged = useCallback(
    (uid: number, status: ParticipantStatus) =>
      setParticipants((prev) =>
        prev.map((p) => (p.userId === uid ? { ...p, status } : p))
      ),
    []
  );

  const { disconnect, sendStatusUpdate } = useCoworkingWS(
    selectedRoomSlug,
    sessionId ? (user?.id ?? null) : null,
    user?.name ?? null,
    workingOn,
    handleSnapshot,
    handleJoined,
    handleLeft,
    handleStatusChanged
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleJoin() {
    if (!selectedRoomId || !workingOn.trim()) return;
    joinMutation.mutate({ roomId: selectedRoomId, workingOn: workingOn.trim() });
  }

  async function handleLeave(generateNextStep: boolean) {
    if (!sessionId) return;
    setIsLeaving(true);
    disconnect();
    await leaveMutation.mutateAsync({ sessionId, generateNextStep });
    setIsLeaving(false);
  }

  function handleStatusChange(status: ParticipantStatus) {
    setMyStatus(status);
    sendStatusUpdate(status);
    if (sessionId) updateStatusMutation.mutate({ sessionId, status });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const inSession = !!sessionId;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
          Body Doubling
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Work alongside others. Presence alone helps ADHD brains stay on task.
        </p>
      </div>

      {/* Post-session AI next step */}
      {aiNextStep && !inSession && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Wren's suggested next step
          </div>
          <p className="text-sm text-foreground/90">{aiNextStep}</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-xs"
            onClick={() => setAiNextStep(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Active session view */}
      {inSession && selectedRoom ? (
        <div className="space-y-6">
          {/* Room + timer */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">In room</p>
                <p className="text-lg font-semibold text-foreground">{selectedRoom.name}</p>
              </div>
              <div className="flex items-center gap-2 text-amber-400 font-log text-xl">
                <Clock className="h-5 w-5" />
                {formatDuration(elapsedSeconds)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground/70">Working on:</span> {workingOn}
            </div>

            {/* Status selector */}
            <div className="flex gap-2 flex-wrap">
              {(["working", "stuck", "done"] as ParticipantStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    myStatus === s
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                      : "border-border bg-transparent text-muted-foreground hover:border-amber-500/30"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusColor(s)}`} />
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              In the room ({participants.length})
            </p>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Just you right now. Others may join.</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor(p.status)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.name}
                        {p.userId === user?.id && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      {p.workingOn && (
                        <p className="text-xs text-muted-foreground truncate">{p.workingOn}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${
                        p.status === "working"
                          ? "border-emerald-500/40 text-emerald-400"
                          : p.status === "stuck"
                          ? "border-amber-400/40 text-amber-400"
                          : "border-slate-500/40 text-slate-400"
                      }`}
                    >
                      {statusLabel(p.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLeave(false)}
              disabled={isLeaving}
              className="border-border text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Leave quietly
            </Button>
            <Button
              size="sm"
              onClick={() => handleLeave(true)}
              disabled={isLeaving}
              className="bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {isLeaving ? "Wrapping up…" : "Leave + get next step from Wren"}
            </Button>
          </div>
        </div>
      ) : (
        /* Room selection + intake form */
        <div className="space-y-6">
          {/* Room list */}
          {roomsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Choose a room</p>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setSelectedRoomSlug(room.slug);
                  }}
                  className={`w-full text-left rounded-xl border px-5 py-4 transition-all ${
                    selectedRoomId === room.id
                      ? "border-amber-500/60 bg-amber-500/10"
                      : "border-border bg-card hover:border-amber-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{room.name}</p>
                      {room.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{room.description}</p>
                      )}
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 transition-colors ${
                        selectedRoomId === room.id ? "text-amber-400" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Intake form */}
          {selectedRoomId && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">What are you working on?</p>
              <Textarea
                value={workingOn}
                onChange={(e) => setWorkingOn(e.target.value)}
                placeholder="e.g. Writing the intro section of my report"
                className="resize-none bg-card border-border text-foreground placeholder:text-muted-foreground/50 min-h-[80px]"
                maxLength={500}
              />
              <Button
                onClick={handleJoin}
                disabled={!workingOn.trim() || joinMutation.isPending}
                className="w-full bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {joinMutation.isPending ? "Joining…" : "Start session"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Recent sessions history */}
      {!inSession && recentSessions.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            {showHistory ? "Hide" : "Show"} recent sessions
          </button>
          {showHistory && (
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-card/50 px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-foreground truncate flex-1">{s.workingOn}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`h-2 w-2 rounded-full ${statusColor(s.status as ParticipantStatus)}`} />
                      <span className="text-xs text-muted-foreground">
                        {s.durationMinutes != null ? `${s.durationMinutes}m` : "—"}
                      </span>
                    </div>
                  </div>
                  {s.aiNextStep && (
                    <p className="text-xs text-amber-400/80 flex items-start gap-1">
                      <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                      {s.aiNextStep}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/50">
                    {new Date(s.joinedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* What is body doubling? */}
      {!inSession && (
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            What is body doubling?
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Body doubling is an ADHD strategy where working near another person — even virtually — helps
            regulate attention and reduce avoidance. You don't need to talk. Just being present together
            creates enough ambient accountability to get things done.
          </p>
        </div>
      )}
    </div>
  );
}
