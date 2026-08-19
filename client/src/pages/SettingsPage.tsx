import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { buildWrenToneDirective, WREN_TONE_PRESETS, type WrenTonePreset } from "@/lib/wrenToneClient";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Lightbulb,
  Loader2,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Play,
  Sun,
  User,
  FolderOpen,
  Trash2,
  BookOpen,
  ArrowUpRight,
  Smartphone,
  Share,
  Mail,
  Unlink,
  Crown,
  CreditCard,
  Star,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import notify from "@/lib/notify";
import { useTheme } from "@/contexts/ThemeContext";
import { useIntro } from "@/contexts/IntroContext";
import { useNotifications } from "@/hooks/useNotifications";
import { format } from "date-fns";
import { PushPermissionInterstitial } from "@/components/PushPermissionInterstitial";

// ─── Idea Processing Card ─────────────────────────────────────────────────────
function IdeaProcessingCard({
  idea,
  projects,
  onResolve,
  isPending,
}: {
  idea: any;
  projects: any[];
  onResolve: (action: "park" | "promote" | "future" | "discard", projectId?: number) => void;
  isPending: boolean;
}) {
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();

  return (
    <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-900/10 space-y-3">
      {/* Raw content */}
      <p className="text-sm text-foreground leading-relaxed">{idea.rawContent}</p>

      {/* AI-parsed intent */}
      {idea.parsedIntent && (
        <div className="flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed italic">
            {idea.parsedIntent}
          </p>
        </div>
      )}

      {/* Metadata row */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
        <span>Captured {format(new Date(idea.createdAt), "MMM d, h:mm a")}</span>
        {idea.capturedDuringTask && (
          <>
            <span>·</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400">
              during focus
            </Badge>
          </>
        )}
      </div>

      {/* Project picker (shown when "Add to project" is clicked) */}
      {showProjectPicker && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Which project?</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id === selectedProjectId ? undefined : p.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all",
                  selectedProjectId === p.id
                    ? "border-foreground/30 bg-foreground/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/20"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", selectedProjectId === p.id ? "bg-foreground" : "bg-muted-foreground/30")} />
                {p.title}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 text-xs h-7"
              disabled={!selectedProjectId || isPending}
              onClick={() => {
                onResolve("promote", selectedProjectId);
                setShowProjectPicker(false);
              }}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7"
              onClick={() => setShowProjectPicker(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Action row */}
      {!showProjectPicker && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1.5"
            disabled={isPending}
            onClick={() => onResolve("park")}
          >
            <BookOpen className="w-3 h-3" />
            Add to Vault
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1.5"
            disabled={isPending}
            onClick={() => setShowProjectPicker(true)}
          >
            <FolderOpen className="w-3 h-3" />
            Add to project
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1.5 text-muted-foreground"
            disabled={isPending}
            onClick={() => onResolve("future")}
          >
            <ArrowUpRight className="w-3 h-3" />
            Future idea
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 text-muted-foreground gap-1.5 ml-auto"
            disabled={isPending}
            onClick={() => onResolve("discard")}
          >
            <Trash2 className="w-3 h-3" />
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Google Calendar Section ──────────────────────────────────────────────
function GoogleCalendarSection() {
  const utils = trpc.useUtils();
  const { data: status, isLoading } = trpc.calendar.getStatus.useQuery();
  const disconnect = trpc.calendar.disconnect.useMutation({
    onSuccess: () => {
      notify.saved("Google Calendar disconnected.");
      utils.calendar.getStatus.invalidate();
    },
    onError: () => notify.error("Failed to disconnect."),
  });

  const handleConnect = () => {
    window.location.href = "/api/calendar/connect";
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking connection...</div>;
  }

  if (status?.connected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-foreground">Connected</span>
          {status.connectedAt && (
            <span className="text-xs text-muted-foreground">since {new Date(status.connectedAt).toLocaleDateString()}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Your calendar events are included in Weekly Compass AI recommendations.</p>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1.5 text-muted-foreground"
          disabled={disconnect.isPending}
          onClick={() => disconnect.mutate()}
        >
          {disconnect.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Connect your Google Calendar so the Weekly Compass can factor in your scheduled events when making AI recommendations.</p>
      <Button
        size="sm"
        variant="outline"
        className="text-xs gap-1.5"
        onClick={handleConnect}
      >
        <Calendar className="w-3.5 h-3.5" />
        Connect Google Calendar
      </Button>
    </div>
  );
}

// ─── Weekly Digest Card ──────────────────────────────────────────────────────
function WeeklyDigestCard() {
  const sendDigest = trpc.system.sendWeeklyDigest.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        notify.saved("Digest sent! Check your notifications.");
      } else {
        notify.error("Could not send digest. Try again later.");
      }
    },
    onError: () => notify.error("Failed to send digest."),
  });

  return (
    <div className="p-5 rounded-xl bg-card border border-border space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Weekly Digest</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Every Monday at 8 AM, Continuary sends you a summary of last week — completed tasks, Clarity insights, and active projects. You can also trigger it manually anytime.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        disabled={sendDigest.isPending}
        onClick={() => sendDigest.mutate()}
      >
        {sendDigest.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Mail className="w-3.5 h-3.5" />
        )}
        Send digest now
      </Button>
    </div>
  );
}

// ─── Wren Tone Card ───────────────────────────────────────────────────────────
function WrenToneCard() {
  const utils = trpc.useUtils();
  const { data: tone, isLoading } = trpc.settings.getWrenTone.useQuery();
  const updateTone = trpc.settings.updateWrenTone.useMutation({
    onSuccess: () => {
      utils.settings.getWrenTone.invalidate();
      notify.saved("Wren's tone updated.");
    },
    onError: () => notify.error("Couldn't save — try again."),
  });

  const [local, setLocal] = useState<{
    wrenGentleDirect: number;
    wrenBriefThorough: number;
    wrenCalmEnergizing: number;
    wrenFollowsChallenges: number;
    wrenDefaultMode: "doing" | "reflecting" | "grounding";
  } | null>(null);

  useEffect(() => {
    if (tone && !local) {
      setLocal({
        wrenGentleDirect: tone.wrenGentleDirect,
        wrenBriefThorough: tone.wrenBriefThorough,
        wrenCalmEnergizing: tone.wrenCalmEnergizing,
        wrenFollowsChallenges: tone.wrenFollowsChallenges,
        wrenDefaultMode: tone.wrenDefaultMode,
      });
    }
  }, [tone, local]);

  const current = local ?? {
    wrenGentleDirect: 50,
    wrenBriefThorough: 50,
    wrenCalmEnergizing: 50,
    wrenFollowsChallenges: 50,
    wrenDefaultMode: "reflecting" as const,
  };

  const preview = buildWrenToneDirective(current);

  const handleSave = useCallback(() => {
    if (!local) return;
    updateTone.mutate(local);
  }, [local, updateTone]);

  const handleQuickPreset = useCallback((preset: WrenTonePreset) => {
    const next = { ...WREN_TONE_PRESETS[preset] };
    setLocal(next);
    updateTone.mutate(next);
  }, [updateTone]);

  const [previewResponse, setPreviewResponse] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = useCallback(async () => {
    if (!local) return;
    setPreviewLoading(true);
    setPreviewResponse(null);
    try {
      const directive = buildWrenToneDirective(local);
      setPreviewResponse(directive
        ? `With these settings, Wren's replies will be: ${directive}`
        : "Wren will use her default voice — warm, calm, and grounded.");
    } finally {
      setPreviewLoading(false);
    }
  }, [local]);

  const dials: { key: keyof typeof current; left: string; right: string }[] = [
    { key: "wrenGentleDirect", left: "Gentle", right: "Direct" },
    { key: "wrenBriefThorough", left: "Brief", right: "Thorough" },
    { key: "wrenCalmEnergizing", left: "Calm", right: "Energizing" },
    { key: "wrenFollowsChallenges", left: "Follows your lead", right: "Nudges forward" },
  ];

  if (isLoading) return null;

  return (
    <div id="wren-tone" className="p-5 rounded-xl bg-card border border-border space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Wren's Voice</p>
        <p className="text-xs text-muted-foreground mt-0.5">One voice, used everywhere Wren talks with you.</p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Quick preset</p>
        <p className="text-[11px] text-muted-foreground mb-2.5">Choose a starting voice. These update the same controls below.</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: "gentle", label: "Gentle", desc: "Warm, supportive" },
            { value: "direct", label: "Direct", desc: "Calm, factual" },
            { value: "firm", label: "Firm", desc: "Concise, no fluff" },
          ] as const).map(({ value, label, desc }) => {
            const preset = WREN_TONE_PRESETS[value];
            const selected = current.wrenGentleDirect === preset.wrenGentleDirect
              && current.wrenBriefThorough === preset.wrenBriefThorough
              && current.wrenCalmEnergizing === preset.wrenCalmEnergizing
              && current.wrenFollowsChallenges === preset.wrenFollowsChallenges
              && current.wrenDefaultMode === preset.wrenDefaultMode;
            return (
              <button
                key={value}
                onClick={() => handleQuickPreset(value)}
                disabled={updateTone.isPending}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all disabled:opacity-60",
                  selected
                    ? "border-foreground/30 bg-foreground/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/20"
                )}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="text-[10px] opacity-70">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode selector */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Default mode</p>
        <div className="grid grid-cols-3 gap-2">
          {(["doing", "reflecting", "grounding"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setLocal(prev => prev ? { ...prev, wrenDefaultMode: m } : null)}
              className={cn(
                "py-2 px-3 rounded-lg border text-xs font-medium transition-all capitalize",
                current.wrenDefaultMode === m
                  ? "border-foreground/30 bg-foreground/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/20"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Fine-tune */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Fine-tune</p>
        {dials.map(({ key, left, right }) => (
          <div key={key}>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{left}</span>
              <span>{right}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={current[key] as number}
              onChange={(e) => setLocal(prev => prev ? { ...prev, [key]: Number(e.target.value) } : null)}
              className="w-full h-1.5 rounded-full accent-amber-500 cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="rounded-lg px-3 py-2.5 text-xs text-muted-foreground italic" style={{ background: "oklch(0.16 0.01 240 / 0.6)", border: "1px solid oklch(0.30 0.02 240 / 0.4)" }}>
        {preview}
      </div>

      {/* Preview response */}
      {previewResponse && (
        <div className="rounded-lg px-3 py-2.5 text-xs space-y-1" style={{ background: "oklch(0.72 0.10 65 / 0.08)", border: "1px solid oklch(0.72 0.10 65 / 0.2)" }}>
          <p className="font-medium text-amber-500/80">Preview</p>
          <p className="text-muted-foreground">{previewResponse}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          disabled={previewLoading}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors bg-muted hover:bg-muted/80 text-muted-foreground border border-border"
        >
          {previewLoading ? "Previewing…" : "Preview"}
        </button>
        <button
          onClick={handleSave}
          disabled={updateTone.isPending}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
        >
          {updateTone.isPending ? "Saving…" : "Save Wren's voice"}
        </button>
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { theme, toggleTheme } = useTheme();
  const { replayIntro } = useIntro();
  const { permission, isSupported, requestPermission, scheduleCheckInNotifications } = useNotifications();
  const [showPushInterstitial, setShowPushInterstitial] = useState(false);
  const updateSchedule = trpc.notifications.updateSchedule.useMutation();
  const { data: pushStatus, refetch: refetchPushStatus } = trpc.notifications.getPushStatus.useQuery();
  const registerPush = trpc.notifications.registerPush.useMutation();

  const scheduleCheckInReminders = async (morning: string, midday: string, evening: string) => {
    const notifEnabled = settings?.notificationsEnabled !== false;
    scheduleCheckInNotifications({
      morningEnabled: notifEnabled,
      morningTime: morning,
      middayEnabled: notifEnabled,
      middayTime: midday,
      eveningEnabled: notifEnabled,
      eveningTime: evening,
    });
    // Save schedule to server for server-side push delivery
    await updateSchedule.mutateAsync({ morningTime: morning, middayTime: midday, eveningTime: evening });
    // Register push subscription server-side if not already registered
    if (permission === "granted" && !pushStatus?.registered) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (vapidKey) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey,
          });
          const key = sub.getKey("p256dh");
          const authKey = sub.getKey("auth");
          if (key && authKey) {
            await registerPush.mutateAsync({
              endpoint: sub.endpoint,
              p256dh: btoa(String.fromCharCode(...Array.from(new Uint8Array(key)))),
              auth: btoa(String.fromCharCode(...Array.from(new Uint8Array(authKey)))),
            });
            refetchPushStatus();
          }
        }
      } catch (e) {
        console.warn("[Push] Could not register server-side push:", e);
      }
    }
  };

  const { data: ideas, refetch: refetchIdeas } = trpc.ai.listIdeas.useQuery();
  const { data: settings } = trpc.settings.getProfile.useQuery();
  const { data: projects } = trpc.projects.listActive.useQuery();

  const recordEvent = trpc.gamification.recordEvent.useMutation();

  const resolveIdea = trpc.ai.resolveIdea.useMutation({
    onSuccess: (_, vars) => {
      const actionLabels: Record<string, string> = { park: "Added to Vault.", promote: "Added to project.", future: "Saved as future idea.", discard: "Dismissed." };
      notify.saved(actionLabels[vars.action]);
      // Haptic + gamification event for idea processing
      if (navigator.vibrate) navigator.vibrate(40);
      const label = vars.action === "park" ? "Idea moved to Vault"
        : vars.action === "promote" ? "Idea added to project"
        : vars.action === "future" ? "Idea saved for later"
        : "Idea released";
      recordEvent.mutate({ eventType: "idea_processed", label });
      refetchIdeas();
    },
    onError: () => notify.error("Failed to process idea."),
  });

  const updateSettings = trpc.settings.updateSettings.useMutation({
    onSuccess: () => notify.saved("Settings saved."),
    onError: () => notify.error("Failed to save settings."),
  });

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

  // Capture the beforeinstallprompt event on Android/Chrome
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSTip((v) => !v);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') notify.saved('App installed! Check your home screen.');
      setDeferredPrompt(null);
    } else {
      // Fallback: guide user manually
      setShowIOSTip(true);
    }
  };

  const [activeTab, setActiveTab] = useState<"profile" | "ideas" | "preferences" | "subscription">("profile");
  const { data: billingStatus } = trpc.paypal.status.useQuery();
  const [morningTime, setMorningTime] = useState("08:00");
  const [middayTime, setMiddayTime] = useState("12:00");
  const [eveningTime, setEveningTime] = useState("17:00");
  const [frictionOpen, setFrictionOpen] = useState(false);
  const [frictionNote, setFrictionNote] = useState("");
  const [showFrictionHistory, setShowFrictionHistory] = useState(false);
  const { data: frictionLogs } = trpc.friction.list.useQuery();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const openWrenTone = useCallback(() => {
    setActiveTab("preferences");
    requestAnimationFrame(() => document.getElementById("wren-tone")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== "preferences") return;
    setActiveTab("preferences");
    if (window.location.hash === "#wren-tone") {
      requestAnimationFrame(() => document.getElementById("wren-tone")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [location]);

  // Invite management (admin only)
  const isAdmin = (user as any)?.role === "admin";
  const [inviteLabel, setInviteLabel] = useState("");
  const { data: inviteCodes, refetch: refetchInvites } = trpc.invites.list.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const generateInvite = trpc.invites.generate.useMutation({
    onSuccess: () => {
      notify.saved("Invite code generated.");
      setInviteLabel("");
      refetchInvites();
    },
    onError: (err) => notify.error(err.message ?? "Could not generate code."),
  });

  const revokeAiConsent = trpc.settings.revokeAiConsent.useMutation({
    onSuccess: () => notify.saved("AI consent revoked. The consent notice will reappear on next login."),
    onError: () => notify.error("Failed to update AI consent."),
  });
  const giveAiConsentSettings = trpc.settings.giveAiConsent.useMutation({
    onSuccess: () => notify.saved("AI features enabled."),
    onError: () => notify.error("Failed to update AI consent."),
  });
  const deleteAccount = trpc.settings.deleteAccount.useMutation({
    onSuccess: () => {
      notify.saved("Account deleted. Goodbye.");
      setTimeout(() => logout(), 1200);
    },
    onError: (err) => notify.error(err.message ?? "Deletion failed. Please try again."),
  });
  const submitFriction = trpc.friction.submit.useMutation({
    onSuccess: () => {
      notify.saved("Noted. Thank you.");
      setFrictionNote("");
      setFrictionOpen(false);
      utils.friction.list.invalidate();
    },
    onError: () => notify.error("Could not save note."),
  });

  const tabs = [
    { id: "profile" as const, label: "Your profile", icon: User },
    { id: "preferences" as const, label: "How you work", icon: Settings },
    { id: "subscription" as const, label: "Subscription", icon: CreditCard },
  ];

  const unresolvedIdeas = ideas?.filter((i) => !i.resolvedStatus && i.parkedStatus) ?? [];
  const processedIdeas = ideas?.filter((i) => i.resolvedStatus) ?? [];

  return (
    <>
    <div className="px-5 py-7 space-y-7 page-enter max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-brand text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">You &amp; Wren</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What Wren knows about you, and how you work together.{" "}
          <button
            onClick={() => navigate("/wren/memory")}
            className="text-amber-500 hover:text-amber-400 underline underline-offset-2 transition-colors"
          >
            See what Wren remembers →
          </button>
          {" "}
          <button
            onClick={openWrenTone}
            className="text-amber-500 hover:text-amber-400 underline underline-offset-2 transition-colors"
          >
            Tune how Wren talks →
          </button>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>

          </button>
        ))}
      </div>

      {/* ── Profile Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center text-lg font-semibold text-foreground">
                {user?.name?.charAt(0) ?? "?"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{user?.name ?? "User"}</p>
                  {user?.isPro && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">PRO</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user?.email ?? ""}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">Theme</p>
                    <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  Switch to {theme === "dark" ? "light" : "dark"}
                </Button>
              </div>
              {/* Onboarding Replay row */}
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <Play className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Replay Intro</p>
                    <p className="text-sm text-muted-foreground">Watch the full onboarding intro again</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => replayIntro()}>
                  Replay
                </Button>
              </div>
              {/* Install App row — always show unless already running as installed PWA */}
              {!isInStandalone && (
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Install App</p>
                      <p className="text-xs text-muted-foreground">
                        {isIOS ? "Add to your home screen" : "Install as a native app"}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleInstallClick}>
                    {isIOS ? <><Share className="w-3.5 h-3.5 mr-1" />Install</> : "Install"}
                  </Button>
                </div>
              )}
              {/* iOS install tip */}
              {showIOSTip && (
                <div className="mx-0 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 leading-relaxed border-t border-border">
                  Tap the <strong>Share</strong> button <span className="inline-block">⬆</span> at the bottom of Safari, then tap <strong>"Add to Home Screen"</strong>.
                </div>
              )}
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Sign out</p>
                    <p className="text-xs text-muted-foreground">End your session</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  Sign out
                </Button>
              </div>
            </div>
          </div>

          {/* Friction log */}
          <div className="p-4 rounded-xl border border-dashed border-border space-y-3">
            {!frictionOpen ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFrictionOpen(true)}
                  className="text-left text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Something felt off? <span className="underline underline-offset-2">Leave a quick note</span>
                </button>
                {frictionLogs && frictionLogs.length > 0 && (
                  <button
                    onClick={() => setShowFrictionHistory(!showFrictionHistory)}
                    className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2"
                  >
                    {showFrictionHistory ? "Hide" : `View ${frictionLogs.length} note${frictionLogs.length === 1 ? "" : "s"}`}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">What felt off?</p>
                <textarea
                  value={frictionNote}
                  onChange={(e) => setFrictionNote(e.target.value)}
                  placeholder="Anything confusing, broken, or frustrating — even small things..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-primary text-white hover:bg-primary/90"
                    disabled={!frictionNote.trim() || submitFriction.isPending}
                    onClick={() => submitFriction.mutate({ note: frictionNote, pageContext: "settings" })}
                  >
                    Send note
                  </Button>
                  <button
                    onClick={() => { setFrictionOpen(false); setFrictionNote(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {/* Friction log history */}
            {showFrictionHistory && frictionLogs && frictionLogs.length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Your logged notes</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {frictionLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <p className="text-xs text-foreground leading-relaxed">{log.note}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground/60">
                          {format(new Date(log.createdAt), "MMM d, yyyy · h:mm a")}
                        </p>
                        {log.pageContext && (
                          <span className="text-[10px] text-muted-foreground/40">· {log.pageContext}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Data & Privacy */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <p className="text-xs font-medium text-foreground">AI Data &amp; Privacy</p>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground">AI-assisted features</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {settings?.aiConsentGiven
                    ? "Your notes and check-in answers are sent to Google Gemini to generate plans and insights."
                    : "AI features are disabled. Enable to allow note content to be sent to Google Gemini for plan generation."}
                </p>
              </div>
              {settings?.aiConsentGiven ? (
                <button
                  onClick={() => revokeAiConsent.mutate()}
                  disabled={revokeAiConsent.isPending}
                  className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors shrink-0"
                >
                  {revokeAiConsent.isPending ? "Saving…" : "Revoke"}
                </button>
              ) : (
                <button
                  onClick={() => giveAiConsentSettings.mutate()}
                  disabled={giveAiConsentSettings.isPending}
                  className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors shrink-0"
                >
                  {giveAiConsentSettings.isPending ? "Saving…" : "Enable AI"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/privacy")}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </button>
              <span className="text-muted-foreground/30 text-xs">·</span>
              <button
                onClick={() => navigate("/terms")}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Terms of Service
              </button>
              <span className="text-muted-foreground/30 text-xs">·</span>
              <button
                onClick={async () => {
                  try {
                    const data = await utils.settings.exportData.fetch();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    const dl = new Date(); const dlStr = `${dl.getFullYear()}-${String(dl.getMonth()+1).padStart(2,"0")}-${String(dl.getDate()).padStart(2,"0")}`; a.download = `continuary-export-${dlStr}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    notify.saved("Data exported successfully.");
                  } catch {
                    notify.error("Export failed. Please try again.");
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Export my data
              </button>
            </div>
          </div>

          {/* Danger zone — delete account */}
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
            <p className="text-xs font-medium text-destructive">Danger zone</p>
            {!deleteOpen ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete account</p>
                  <p className="text-xs text-muted-foreground">Permanently remove all your data. Cannot be undone.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-foreground leading-relaxed">
                  This will permanently delete your account, all projects, check-ins, vault items, and AI sessions.
                  Type <strong>DELETE</strong> to confirm.
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="text-sm h-8"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs h-7"
                    disabled={deleteConfirmText !== "DELETE" || deleteAccount.isPending}
                    onClick={() => deleteAccount.mutate({ confirmation: "DELETE" })}
                  >
                    {deleteAccount.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Permanently delete
                  </Button>
                  <button
                    onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admin: Invite Management ──────────────────────────────────────── */}
      {activeTab === "profile" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 tracking-widest uppercase">Admin</span>
            <span className="text-xs text-muted-foreground">— Invite Codes</span>
          </div>

          {/* Generate new code */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Generate invite code</p>
            <div className="flex gap-2">
              <Input
                value={inviteLabel}
                onChange={(e) => setInviteLabel(e.target.value)}
                placeholder="Label (optional - e.g. Sarah M.)"
                className="text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && generateInvite.mutate({ label: inviteLabel || undefined })}
              />
              <Button
                size="sm"
                onClick={() => generateInvite.mutate({ label: inviteLabel || undefined })}
                disabled={generateInvite.isPending}
                className="shrink-0"
              >
                {generateInvite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
              </Button>
            </div>
          </div>

          {/* Code list */}
          {inviteCodes && inviteCodes.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  {inviteCodes.length} code{inviteCodes.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="divide-y divide-border">
                {inviteCodes.map((code) => (
                  <div key={code.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-log font-medium text-foreground tracking-widest">{code.code}</p>
                      {code.label && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{code.label}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {code.usedAt ? (
                        <Badge variant="secondary" className="text-xs">
                          Used
                        </Badge>
                      ) : (
                        <>
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 text-xs border-0">
                            Available
                          </Badge>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(code.code);
                              notify.saved("Copied to clipboard.");
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                          >
                            Copy
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inviteCodes?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No invite codes yet. Generate one above.
            </p>
          )}
        </div>
      )}

      {/* Idea Sanctuary tab removed — the sidebar Ideas page (/ideas) is the canonical home */}
      {activeTab === "ideas" && (
        <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-3">
          <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">Ideas have moved</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Your captured ideas now live in the <strong>Ideas</strong> page in the sidebar — where you can add to tasks, scratch, or dismiss them.
          </p>
        </div>
      )}



      {/* ── Preferences Tab ──────────────────────────────────────────────────── */}
      {activeTab === "preferences" && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <p className="text-sm font-semibold text-foreground">ADHD Preferences</p>
            <div className="space-y-3">
              {[
                { key: "morningNotifEnabled", label: "Morning check-in reminder", desc: "Daily reminder to set your intention" },
                { key: "middayNotifEnabled", label: "Midday pulse reminder", desc: "A gentle nudge to check your plan" },
                { key: "eveningNotifEnabled", label: "Evening close reminder", desc: "End-of-day reflection prompt" },
                { key: "focusModeEnabled", label: "Single Focus Mode", desc: "Distraction-free task execution" },
                { key: "driftDetectionEnabled", label: "Drift detection", desc: "Alert when you stray from declared intention" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <button
                    onClick={() => updateSettings.mutate({ [key]: !(settings as any)?.[key] })}
                    aria-label={`${(settings as any)?.[key] !== false ? "Disable" : "Enable"} ${label}`}
                    aria-pressed={(settings as any)?.[key] !== false}
                    className={cn(
                      "w-10 h-6 rounded-full transition-colors relative shrink-0",
                      (settings as any)?.[key] !== false ? "bg-foreground" : "bg-muted-foreground/30"
                    )}
                  >
                    <span aria-hidden="true" className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform",
                      (settings as any)?.[key] !== false ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Visual comfort</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Make the app easier to read or quieter to look at. These choices save to your account.</p>
            </div>
            <div className="space-y-3">
              {[
                { key: "reducedVisualNoise", label: "Reduced visual noise", desc: "Soften accents and flatten decorative gradients." },
              ].map(({ key, label, desc }) => {
                const enabled = Boolean((settings as any)?.[key]);
                return (
                  <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSettings.mutate({ [key]: !enabled })}
                      aria-label={`${enabled ? "Disable" : "Enable"} ${label}`}
                      aria-pressed={enabled}
                      className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", enabled ? "bg-foreground" : "bg-muted-foreground/30")}
                    >
                      <span aria-hidden="true" className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform", enabled ? "translate-x-4" : "translate-x-0.5")} />
                    </button>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">Larger text</p>
                  <p className="text-xs text-muted-foreground">Increase reading size across Continuary.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings.mutate({ fontSizePreference: settings?.fontSizePreference === "large" ? "medium" : "large" })}
                  aria-label={`${settings?.fontSizePreference === "large" ? "Disable" : "Enable"} larger text`}
                  aria-pressed={settings?.fontSizePreference === "large"}
                  className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", settings?.fontSizePreference === "large" ? "bg-foreground" : "bg-muted-foreground/30")}
                >
                  <span aria-hidden="true" className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform", settings?.fontSizePreference === "large" ? "translate-x-4" : "translate-x-0.5")} />
                </button>
              </div>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Push Notifications</p>
            </div>

            {!isSupported && (
              <p className="text-xs text-muted-foreground">Push notifications are not supported in this browser.</p>
            )}

            {isSupported && permission === "default" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enable push notifications to receive check-in reminders even when the app is in the background.
                </p>
                <Button size="sm" variant="outline" onClick={() => requestPermission()}>
                  Enable notifications
                </Button>
              </div>
            )}

            {isSupported && permission === "denied" && (
              <p className="text-xs text-muted-foreground">
                Notifications are blocked. Enable them in your browser settings to receive check-in reminders.
              </p>
            )}

            {isSupported && permission === "granted" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Notifications enabled</p>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Morning check-in", value: morningTime, setter: setMorningTime },
                    { label: "Midday pulse", value: middayTime, setter: setMiddayTime },
                    { label: "Evening close", value: eveningTime, setter: setEveningTime },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <input
                        type="time"
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        style={{colorScheme: 'light dark'}}
                        className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    scheduleCheckInReminders(morningTime, middayTime, eveningTime);
                    notify.saved("Check-in reminders scheduled.");
                  }}
                >
                  Save notification times
                </Button>
              </div>
            )}
          </div>

          {/* Cold Project Threshold */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Cold project alert</p>
                <p className="text-xs text-muted-foreground mt-0.5">Notify me when a project hasn't moved in:</p>
              </div>
              <span className="text-sm font-semibold tabular-nums" style={{ color: "oklch(0.74 0.14 72)" }}>
                {settings?.coldProjectThresholdDays ?? 5} days
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={14}
              step={1}
              value={settings?.coldProjectThresholdDays ?? 5}
              onChange={(e) => updateSettings.mutate({ coldProjectThresholdDays: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>2 days</span>
              <span>7 days</span>
              <span>14 days</span>
            </div>
          </div>

          {/* Weekly Digest */}
          <WeeklyDigestCard />

          {/* Quick preset + Wren Tone Dials */}
          <WrenToneCard />

          {/* Google Calendar Integration */}
          <div id="calendar" className="p-5 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">Google Calendar</p>
            </div>
            <GoogleCalendarSection />
          </div>

          {/* What's New changelog */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <p className="text-sm font-semibold text-foreground">What's New</p>
            <div className="space-y-2">
              {[
                { v: "v1.7", note: "Google Calendar integration — Weekly Compass reads your real schedule" },
                { v: "v1.6", note: "Whisper voice-to-text in Clarity Engine, 52-week activity heatmap" },
                { v: "v1.5", note: "⌘K Command Palette, Pricing page, GlossaryTerm tooltips, Amnesty auto-dissolve" },
                { v: "v1.4", note: "Replay Intro fix, sidebar micro-interactions, PH banner redesign" },
                { v: "v1.3", note: "Onboarding v3 — cinematic word reveals, ambient glow, swipe navigation" },
                { v: "v1.2", note: "Evidence Log, streak badge, cold project threshold setting" },
                { v: "v1.1", note: "Weekly Compass, Knowledge Vault, Pro upgrade via PayPal" },
                { v: "v1.0", note: "Daily check-ins, Clarity Engine, project health scores" },
              ].map(({ v, note }) => (
                <div key={v} className="flex gap-2 items-start">
                  <span className="text-xs font-log shrink-0 mt-0.5" style={{ color: "#f6c878" }}>{v}</span>
                  <span className="text-xs text-muted-foreground">{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Refresh Data */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <p className="text-sm font-semibold text-foreground">Refresh Data</p>
            <p className="text-xs text-muted-foreground">Force a fresh reload of all app data. Use this if something looks stale or out of sync.</p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3 h-3" />
              Reload app
            </Button>
          </div>
          {/* About / Replay Intro */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <p className="text-sm font-semibold text-foreground">About Continuary</p>
            <p className="text-xs text-muted-foreground">Replay the intro to revisit what Continuary is built for, or copy the link to share with someone new.</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => replayIntro()} className="text-xs gap-1.5">
                <Play className="w-3 h-3" />
                Replay intro
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.assign("/tour")} className="text-xs gap-1.5">
                Take the tour
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { navigator.clipboard.writeText(window.location.origin + "/intro"); notify.saved("Link copied"); }}>
                Copy share link
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── Subscription Tab ─────────────────────────────────────────────── */}
      {activeTab === "subscription" && (
        <div className="space-y-4">
          {/* Status card */}
          {billingStatus && (() => {
            const bs = billingStatus.billingStatus;
            const isFoundingMember = billingStatus.isFoundingMember;
            const daysRemaining = billingStatus.daysRemaining;
            const betaEnd = billingStatus.betaEndDate ? new Date(billingStatus.betaEndDate) : null;

            if (bs === "trialing_no_card" || bs === null || bs === undefined) {
              return (
                <div className="p-5 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Beta access — no card required</p>
                      <p className="text-xs text-muted-foreground">
                        {daysRemaining !== null ? `${daysRemaining} days remaining` : betaEnd ? `Ends ${betaEnd.toLocaleDateString()}` : "Full access during beta"}
                      </p>
                    </div>
                    {isFoundingMember && (
                      <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">FOUNDING MEMBER</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You have full access to all features during the beta period. No payment is required now.
                    When you're ready to lock in your {isFoundingMember ? "founding rate for life" : "plan"}, you can upgrade at any time.
                  </p>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold" onClick={() => navigate("/pro")}>
                    {isFoundingMember ? "Lock in my founding rate" : "View plans"}
                  </Button>
                </div>
              );
            }

            if (bs === "free_tier_founding_rate_waiting") {
              return (
                <div className="p-5 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                      <Star className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Free tier</p>
                      <p className="text-xs text-muted-foreground">
                        {isFoundingMember ? "Your founding rate is reserved and waiting" : "Upgrade to unlock full access"}
                      </p>
                    </div>
                    {isFoundingMember && (
                      <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">FOUNDING RATE LOCKED</span>
                    )}
                  </div>
                  {isFoundingMember && (
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3 space-y-1">
                      <p className="text-xs font-semibold text-amber-300">Your founding rate is locked for life</p>
                      <p className="text-xs text-white/50">Pro: $4.99/mo or $39.99/yr · Keeper: $9.99/mo or $79.99/yr</p>
                      <p className="text-[10px] text-white/30">Retail rates after cohort: Pro $7.99/mo · Keeper $14.99/mo</p>
                    </div>
                  )}
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold" onClick={() => navigate("/pro")}>
                    {isFoundingMember ? "Lock in my founding rate" : "Upgrade to Pro"}
                  </Button>
                </div>
              );
            }

            if (bs === "active") {
              const tier = billingStatus.foundingTier ?? (billingStatus.isPro ? "pro" : null);
              const tierLabel = tier === "keeper" ? "Keeper" : tier === "pro" ? "Pro" : "Pro";
              const tierColor = tier === "keeper" ? "text-violet-400" : "text-amber-400";
              const tierBg = tier === "keeper" ? "bg-violet-500/10" : "bg-amber-500/10";
              return (
                <div className="p-5 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", tierBg)}>
                      <Crown className={cn("w-4 h-4", tierColor)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{tierLabel} — Active</p>
                      <p className="text-xs text-muted-foreground">
                        {billingStatus.proSince ? `Active since ${new Date(billingStatus.proSince).toLocaleDateString()}` : "Subscription active"}
                      </p>
                    </div>
                    {isFoundingMember && (
                      <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">FOUNDING RATE</span>
                    )}
                  </div>
                  {isFoundingMember && (
                    <p className="text-xs text-muted-foreground">
                      Your founding rate is locked for life — it never increases even as retail pricing rises.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate("/pro")} className="text-xs">
                      Manage plan
                    </Button>
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* What you get as a founding member */}
          {billingStatus?.isFoundingMember && (
            <div className="p-5 rounded-xl bg-card border border-border space-y-3">
              <p className="text-sm font-semibold text-foreground">Founding member perks</p>
              <ul className="space-y-2">
                {[
                  "Free during beta — 90 days Pro access, no card required",
                  "Founding rate locked for life — never increases",
                  "Direct line to the founder — DM + monthly office hours (Keeper)",
                  "First access to Lifewoven and Operator House",
                  "Founding Member badge in app",
                ].map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
    {showPushInterstitial && (
      <PushPermissionInterstitial
        onAllow={() => { setShowPushInterstitial(false); requestPermission(); }}
        onDismiss={() => setShowPushInterstitial(false)}
      />
    )}
    </>
  );
}
