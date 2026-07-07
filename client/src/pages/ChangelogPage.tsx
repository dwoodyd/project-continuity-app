/**
 * /changelog — Public release notes page.
 *
 * Accessible without login. Designed for founding members and SEO.
 * Data lives in client/src/data/changelog.ts — add new entries there.
 */
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Wrench, Bug } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { CHANGELOG, type ChangeCategory, type ChangelogEntry } from "@/data/changelog";

// ── Category config ────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<
  ChangeCategory,
  { label: string; Icon: React.ElementType; color: string; bg: string }
> = {
  new: {
    label: "New",
    Icon: Sparkles,
    color: "oklch(0.74 0.14 72)",        // amber/gold
    bg: "oklch(0.74 0.14 72 / 0.12)",
  },
  improved: {
    label: "Improved",
    Icon: Wrench,
    color: "oklch(0.68 0.17 155)",       // emerald
    bg: "oklch(0.68 0.17 155 / 0.12)",
  },
  fixed: {
    label: "Fixed",
    Icon: Bug,
    color: "oklch(0.65 0.15 240)",       // indigo-ish blue
    bg: "oklch(0.65 0.15 240 / 0.12)",
  },
};

function CategoryBadge({ category }: { category: ChangeCategory }) {
  const cfg = CATEGORY_CONFIG[category];
  const { Icon } = cfg;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function EntryCard({ entry, isLatest }: { entry: ChangelogEntry; isLatest: boolean }) {
  // Group changes by category for visual clarity
  const grouped: Record<ChangeCategory, string[]> = { new: [], improved: [], fixed: [] };
  for (const item of entry.changes) {
    grouped[item.category].push(item.text);
  }

  return (
    <article
      className="relative pl-8 pb-12 last:pb-0"
      style={{ borderLeft: "1px solid oklch(1 0 0 / 0.08)" }}
    >
      {/* Timeline dot */}
      <div
        className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full"
        style={{
          background: isLatest ? "oklch(0.74 0.14 72)" : "oklch(0.28 0.04 240)",
          boxShadow: isLatest ? "0 0 0 3px oklch(0.74 0.14 72 / 0.18)" : "none",
        }}
      />

      {/* Header */}
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
            style={{
              background: "oklch(0.195 0.036 245)",
              color: "oklch(0.74 0.14 72)",
            }}
          >
            v{entry.version}
          </span>
          {isLatest && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "oklch(0.74 0.14 72 / 0.15)", color: "oklch(0.74 0.14 72)" }}
            >
              Latest
            </span>
          )}
          <time
            dateTime={entry.date}
            className="text-xs"
            style={{ color: "oklch(0.54 0.016 240)" }}
          >
            {formatDate(entry.date)}
          </time>
        </div>
        <h2 className="text-lg font-semibold" style={{ color: "oklch(0.93 0.006 240)" }}>
          {entry.title}
        </h2>
        {entry.summary && (
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "oklch(0.65 0.016 240)" }}>
            {entry.summary}
          </p>
        )}
      </header>

      {/* Changes grouped by category */}
      <div className="space-y-4">
        {(["new", "improved", "fixed"] as ChangeCategory[]).map((cat) => {
          const items = grouped[cat];
          if (!items.length) return null;
          return (
            <div key={cat}>
              <div className="mb-2">
                <CategoryBadge category={cat} />
              </div>
              <ul className="space-y-1.5">
                {items.map((text, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed"
                    style={{ color: "oklch(0.78 0.010 240)" }}
                  >
                    <span
                      className="mt-2 w-1 h-1 rounded-full shrink-0"
                      style={{ background: CATEGORY_CONFIG[cat].color }}
                    />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function ChangelogPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.105 0.028 245)", color: "oklch(0.93 0.006 240)" }}
    >
      <PageMeta
        title="Changelog"
        description="Every update to Continuary — new features, improvements, and fixes. See what's been built for minds that keep going."
        path="/changelog"
      />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm mb-10 transition-colors"
          style={{ color: "oklch(0.54 0.016 240)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to app
        </Link>

        {/* Page header */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "oklch(0.93 0.006 240)" }}>
            Changelog
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "oklch(0.65 0.016 240)" }}>
            Every update to Continuary — new features, improvements, and fixes.
            Built for minds that keep going.
          </p>
        </header>

        {/* Timeline */}
        <div>
          {CHANGELOG.map((entry, i) => (
            <EntryCard key={entry.version} entry={entry} isLatest={i === 0} />
          ))}
        </div>

        {/* Footer */}
        <footer
          className="mt-16 pt-8 text-sm"
          style={{ borderTop: "1px solid oklch(1 0 0 / 0.08)", color: "oklch(0.54 0.016 240)" }}
        >
          <p>
            Questions or feedback?{" "}
            <a
              href="mailto:hello@continuary.app"
              className="underline underline-offset-2 transition-colors hover:opacity-80"
              style={{ color: "oklch(0.74 0.14 72)" }}
            >
              hello@continuary.app
            </a>
          </p>
          <p className="mt-2">
            <a href="/privacy" className="hover:opacity-80 transition-opacity underline underline-offset-2">Privacy</a>
            {" · "}
            <a href="/terms" className="hover:opacity-80 transition-opacity underline underline-offset-2">Terms</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
