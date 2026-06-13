/**
 * HubPage — unified secondary navigation hub
 *
 * Replaces the mobile "More" drawer with a proper navigable page.
 * Groups all secondary features into clear sections.
 */
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BarChart2,
  ScrollText,
  Compass,
  Archive,
  Lightbulb,
  Settings,
  Home,
  GraduationCap,
  Ticket,
  Star,
  ClipboardList,
  Users,
  MessageSquare,
  PenLine,
  Zap,
  BookOpen,
  Anchor,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { FeedbackPanel } from "@/components/FeedbackPanel";

const SECTIONS = [
  {
    title: "Reflection & Growth",
    items: [
      { href: "/emotional-cycle", label: "Emotional Cycle",   icon: BarChart2,   description: "Track your energy and emotional patterns" },
      { href: "/evidence",        label: "Evidence Log",      icon: ScrollText,  description: "Your record of showing up" },
      { href: "/compass",         label: "Weekly Compass",    icon: Compass,     description: "Weekly intention and review" },
      { href: "/intelligence",    label: "Intelligence",      icon: Lightbulb,   description: "Cross-project patterns and health scores" },
    ],
  },
  {
    title: "Tools",
    items: [
      { href: "/scratch",  label: "Scratch Pad",        icon: PenLine,       description: "Quick notes, not linked to projects" },
      { href: "/clarity",  label: "Clarity Engine",     icon: Zap,           description: "Work through what's blocking you" },
      { href: "/vault",    label: "Knowledge Vault",    icon: BookOpen,      description: "Your captured thinking and sources" },
      { href: "/study",    label: "Single Focus Mode",  icon: ClipboardList, description: "One thing, no distractions" },
      { href: "/focus",         label: "Focus Sessions",  icon: Users,   description: "Timed deep-work sessions" },
      { href: "/thread-locks",  label: "Thread Locks",    icon: Anchor, description: "Context you saved before an interruption" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/settings",          label: "You & Wren",       icon: Settings,      description: "Profile, preferences, and your AI partner" },
      { href: "/welcome",           label: "About Continuary", icon: Home,          description: "What this app is and how it works" },
      { href: "/tour",              label: "Take the Tour",    icon: GraduationCap, description: "A guided walkthrough of the key features" },
      { href: "/pro",               label: "Pricing",          icon: Ticket,        description: "Plans and founding member access" },
      { href: "/founding-member",   label: "Founding Member",  icon: Star,          description: "Lock in your founding rate" },
    ],
  },
];

export default function HubPage() {
  const { user } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="px-5 py-7 max-w-4xl mx-auto space-y-8 page-enter">
      <div className="mb-2">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground leading-tight font-brand">Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">All features, in one place.</p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map(({ href, label, icon: Icon, description }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-card/60 border border-border/40 hover:bg-accent hover:border-border transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Feedback */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">
          Support
        </p>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-card/60 border border-border/40 hover:bg-accent hover:border-border transition-colors w-full text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground leading-tight">Send Feedback</p>
            <p className="text-xs text-muted-foreground mt-0.5">Report a bug or share a suggestion</p>
          </div>
        </button>
      </section>

      {/* Admin section */}
      {user?.role === "admin" && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/60 px-1">
            Admin
          </p>
          <div className="space-y-1">
            {[
              { href: "/admin/invites",      label: "Invite Codes",      icon: Ticket },
              { href: "/admin/feedback",     label: "Feedback Inbox",    icon: MessageSquare },
              { href: "/admin/onboarding",   label: "Onboarding Funnel", icon: BarChart2 },
              { href: "/admin/study",        label: "Study Tracker",     icon: GraduationCap },
              { href: "/admin/applications", label: "Applications",      icon: ClipboardList },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-foreground">{label}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <FeedbackPanel open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
