import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Bell,
  Brain,
  ChevronRight,
  Lightbulb,
  Loader2,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { data: ideas, refetch: refetchIdeas } = trpc.ai.listIdeas.useQuery();
  const { data: settings } = trpc.settings.getProfile.useQuery();

  const resolveIdea = trpc.ai.resolveIdea.useMutation({
    onSuccess: () => refetchIdeas(),
  });

  const updateSettings = trpc.settings.updateSettings.useMutation({
    onSuccess: () => toast.success("Settings saved."),
    onError: () => toast.error("Failed to save settings."),
  });

  const [activeTab, setActiveTab] = useState<"profile" | "ideas" | "preferences">("profile");

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "ideas" as const, label: "Idea Sanctuary", icon: Lightbulb },
    { id: "preferences" as const, label: "Preferences", icon: Settings },
  ];

  const unresolvedIdeas = ideas?.filter((i) => i.resolvedAt === null) ?? [];
  const resolvedIdeas = ideas?.filter((i) => i.resolvedAt !== null) ?? [];

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
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                {unresolvedIdeas.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
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

      {/* Idea Sanctuary Tab */}
      {activeTab === "ideas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {unresolvedIdeas.length} unresolved · {resolvedIdeas.length} resolved
            </p>
          </div>

          {unresolvedIdeas.length === 0 && resolvedIdeas.length === 0 && (
            <div className="p-8 rounded-xl border border-dashed border-border text-center">
              <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No ideas captured yet.</p>
              <p className="text-xs text-muted-foreground">
                Use the quick capture button (💡) anywhere in the app to park ideas without losing focus.
              </p>
            </div>
          )}

          {unresolvedIdeas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Needs attention</p>
              <div className="space-y-2">
                {unresolvedIdeas.map((idea) => (
                  <div key={idea.id} className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-sm text-foreground leading-relaxed">{idea.rawContent}</p>
                    {idea.parsedIntent && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Intent: {idea.parsedIntent}</p>
                    )}
                    <div className="flex gap-2 mt-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => resolveIdea.mutate({ id: idea.id, action: "park" })}
                      >
                        Add to vault
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => resolveIdea.mutate({ id: idea.id, action: "promote" })}
                      >
                        Add to project
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 text-muted-foreground"
                        onClick={() => resolveIdea.mutate({ id: idea.id, action: "discard" })}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolvedIdeas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Resolved</p>
              <div className="space-y-2">
                {resolvedIdeas.slice(0, 5).map((idea) => (
                  <div key={idea.id} className="p-3 rounded-lg border border-border bg-muted/20 opacity-60">
                    <p className="text-xs text-foreground line-through">{idea.rawContent}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Resolved · {format(new Date(idea.resolvedAt!), "MMM d")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preferences Tab */}
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

          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <p className="text-sm font-semibold text-foreground">Focus Timer</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "focusDuration", label: "Focus duration", unit: "min", defaultVal: 25 },
                { key: "breakDuration", label: "Break duration", unit: "min", defaultVal: 5 },
              ].map(({ key, label, unit, defaultVal }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                  <Input
                    type="number"
                    defaultValue={(settings as any)?.[key] ?? defaultVal}
                    min={1}
                    max={120}
                    className="text-sm"
                    onBlur={(e) => updateSettings.mutate({ [key]: parseInt(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
