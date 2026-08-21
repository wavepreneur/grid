import type { ReactNode } from "react";

export function StudioPanel({
  children,
  className = "",
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`rounded-3xl bg-card p-5 shadow-soft ${className}`}>
      {title || action ? (
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-bold text-foreground">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StudioBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "live" | "draft" | "warn";
}) {
  const tones = {
    default: "bg-secondary text-secondary-foreground",
    live: "bg-success/20 text-success-foreground",
    draft: "bg-accent/30 text-accent-foreground",
    warn: "bg-destructive/15 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
