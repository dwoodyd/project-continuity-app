import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BentoCardAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

interface BentoCardProps {
  icon?: ReactNode;
  title?: string;
  actions?: BentoCardAction[];
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  span2?: boolean;
  style?: React.CSSProperties;
  noPadding?: boolean;
}

/**
 * Standardized bento card — icon + Space Grotesk title + quick actions header row.
 * Spec change #2: every widget uses this same anatomy.
 */
export function BentoCard({
  icon,
  title,
  actions = [],
  headerRight,
  children,
  className,
  span2,
  style,
  noPadding,
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border relative",
        span2 && "col-span-2",
        noPadding ? "" : "p-4",
        className
      )}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        ...style,
      }}
    >
      {(icon || title || actions.length > 0) && (
        <div className={cn("flex items-center gap-2.5 mb-3", noPadding && "px-4 pt-4")}>
          {icon && (
            <span style={{ color: "oklch(0.74 0.14 72 / 0.90)" }} className="shrink-0 w-4 h-4 flex items-center justify-center">
              {icon}
            </span>
          )}
          {title && (
            <span className="font-brand font-semibold text-[13.5px] tracking-[0.01em] text-foreground">
              {title}
            </span>
          )}
          {(actions.length > 0 || headerRight) && (
            <div className="ml-auto flex items-center gap-1.5">
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  title={action.label}
                  className="w-[22px] h-[22px] rounded-md flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                  style={{ border: "1px solid oklch(0.30 0.02 240 / 0.60)" }}
                >
                  {action.icon}
                </button>
              ))}
              {headerRight}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
