import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Bell,
  CheckCircle2,
  Lightbulb,
  Loader2,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  User,
  FolderOpen,
  Trash2,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/hooks/useNotifications";
import { format } from "date-fns";

// ─── Idea Processing Card ─────────────────────────────────────────────────────
function IdeaProcessingCard({
  idea,
  projects,
  onResolve,
  isPending,
}: {
  idea: any;
  projects: any[];
  onResolve: (action: "park" | "promote" | "discard", projectId?: number) => void;
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

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { permission, isSupported, requestPermission, scheduleCheckInNotifications } = useNotifications();

  const scheduleCheckInReminders = (morning: string, midday: string, evening: string) => {
    const notifEnabled = settings?.notificationsEnabled !== false;
    scheduleCheckInNotifications({
      morningEnabled: notifEnabled,
      morningTime: morning,
      middayEnabled: notifEnabled,
      middayTime: midday,
      eveningEnabled: notifEnabled,
      eveningTime: evening,
    });
  };

  const { data: ideas, refetch: refetchIdeas } = trpc.ai.listIdeas.useQuery();
  const { data: settings } = trpc.settings.getProfile.useQuery();
  const { data: projects } = trpc.projects.listActive.useQuery();

  const resolveIdea = trpc.ai.resolveIdea.useMutation({
    onSuccess: (_, vars) => {
      const actionLabels = { park: "Added to Vault.", promote: "Added to project.", discard: "Dismissed." };
      toast.success(actionLabels[vars.action]);
      refetchIdeas();
    },
    onError: () => toast.error("Failed to process idea."),
  });

  const updateSettings = trpc.settings.updateSettings.useMutation({
    onSuccess: () => toast.success("Settings saved."),
    onError: () => toast.error("Failed to save settings."),
  });

  const [activeTab, setActiveTab] = useState<"profile" | "ideas" | "preferences">("profile");
  const [morningTime, setMorningTime] = useState("08:00");
  const [middayTime, setMiddayTime] = useState("12:00");
  const [eveningTime, setEveningTime] = useState("17:00");

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "ideas" as const, label: "Idea Sanctuary", icon: Lightbulb },
    { id: "preferences" as const, label: "Preferences", icon: Settings },
  ];

  const unresolvedIdeas = ideas?.filter((i) => !i.resolvedStatus && i.parkedStatus) ?? [];
  const processedIdeas = ideas?.filter((i) => i.resolvedStatus) ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
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
            {id === "ideas" && unresolvedIdeas.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {unresolvedIdeas.length}
              </span>
            )}
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
                <p className="font-semibold text-foreground">{user?.name ?? "User"}</p>
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
        </div>
      )}

      {/* ── Idea Sanctuary Tab ───────────────────────────────────────────────── */}
      {activeTab === "ideas" && (
        <div className="space-y-5">
          {/* Header stats */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Idea Sanctuary</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unresolvedIdeas.length} waiting to be processed · {processedIdeas.length} resolved
              </p>
            </div>
            {unresolvedIdeas.length > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs">
                {unresolvedIdeas.length} pending
              </Badge>
            )}
          </div>

          {/* Empty state */}
          {unresolvedIdeas.length === 0 && processedIdeas.length === 0 && (
            <div className="p-8 rounded-xl border border-dashed border-border text-center">
              <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No ideas captured yet.</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use the lightbulb button (bottom-right) anywhere in the app to park ideas without losing focus.
                They'll appear here for processing.
              </p>
            </div>
          )}

          {/* All clear state */}
          {unresolvedIdeas.length === 0 && processedIdeas.length > 0 && (
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Processing queue is clear.</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                All captured ideas have been processed.
              </p>
            </div>
          )}

          {/* Processing queue */}
          {unresolvedIdeas.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Processing queue</p>
                <p className="text-xs text-muted-foreground/60">Each idea needs one decision: Vault, Project, or Dismiss</p>
              </div>
              <div className="space-y-3">
                {unresolvedIdeas.map((idea) => (
                  <IdeaProcessingCard
                    key={idea.id}
                    idea={idea}
                    projects={projects ?? []}
                    onResolve={(action, projectId) => resolveIdea.mutate({ id: idea.id, action, projectId })}
                    isPending={resolveIdea.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Processed ideas archive */}
          {processedIdeas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Processed</p>
              <div className="space-y-2">
                {processedIdeas.slice(0, 8).map((idea) => (
                  <div key={idea.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 opacity-60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground line-through truncate">{idea.rawContent}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Processed · {format(new Date(idea.resolvedAt ?? idea.updatedAt), "MMM d")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Preferences Tab ──────────────────────────────────────────────────── */}
      {activeTab === "preferences" && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <p className="text-sm font-semibold text-foreground">ADHD Preferences</p>
            <div className="space-y-3">
              {[
                { key: "morningCheckInEnabled", label: "Morning check-in reminder", desc: "Daily reminder to set your focus" },
                { key: "middayCheckInEnabled", label: "Midday alignment pulse", desc: "Midday reminder to check your plan" },
                { key: "eveningCheckInEnabled", label: "Evening closure reminder", desc: "End-of-day reflection prompt" },
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
                    className={cn(
                      "w-10 h-6 rounded-full transition-colors relative shrink-0",
                      (settings as any)?.[key] !== false ? "bg-foreground" : "bg-muted-foreground/30"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform",
                      (settings as any)?.[key] !== false ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              ))}
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
                    { label: "Midday check-in", value: middayTime, setter: setMiddayTime },
                    { label: "Evening closure", value: eveningTime, setter: setEveningTime },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <Input
                        type="time"
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="w-28 h-7 text-xs"
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
                    toast.success("Check-in reminders scheduled.");
                  }}
                >
                  Save notification times
                </Button>
              </div>
            )}
          </div>

          {/* Tone preference */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <p className="text-sm font-semibold text-foreground">AI Tone</p>
            <p className="text-xs text-muted-foreground">How should the AI communicate with you?</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "gentle", label: "Gentle", desc: "Warm, supportive" },
                { value: "direct", label: "Direct", desc: "Calm, factual" },
                { value: "firm", label: "Firm", desc: "Concise, no fluff" },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => updateSettings.mutate({ tonePreference: value as any })}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all",
                    settings?.tonePreference === value
                      ? "border-foreground/30 bg-foreground/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/20"
                  )}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-[10px] opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
