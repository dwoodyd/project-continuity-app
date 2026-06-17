/**
 * PageHeader — shared page title + subtitle + optional action slot
 *
 * Usage:
 *   <PageHeader title="Knowledge Vault" subtitle="Your captured thinking" />
 *   <PageHeader title="Projects" action={<Button>New</Button>} />
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Main page title */
  title: ReactNode;
  /** Optional subtitle / description below the title */
  subtitle?: ReactNode;
  /** Optional action slot (e.g. a button) rendered on the right */
  action?: ReactNode;
  /** Additional className for the outer container */
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground leading-tight font-brand">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{action}</div>
      )}
    </div>
  );
}
