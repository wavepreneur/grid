import { X } from "lucide-react";
import type { ReactNode } from "react";

/** Lovable City-Games admin primitives — shared look & feel for Studio. */

export function Panel({
  title,
  action,
  children,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      {title || action ? (
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-bold">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  type = "button",
  className = "",
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "danger" | "accent";
  size?: "sm" | "md";
  icon?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground shadow-soft",
    accent: "bg-accent text-accent-foreground shadow-soft",
    ghost: "bg-secondary text-secondary-foreground",
    outline: "border border-border bg-card text-foreground",
    danger: "bg-destructive text-destructive-foreground",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tap-lift inline-flex items-center justify-center gap-2 rounded-2xl font-semibold disabled:opacity-40 ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-base outline-none focus:border-primary focus:outline-none";

export function Chip({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        tone || "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </span>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className={`animate-rise-in max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl ${
          wide ? "sm:max-w-3xl" : "sm:max-w-xl"
        }`}
      >
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="tap-lift flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Bar({ value, tone = "bg-primary" }: { value: number; tone?: string }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-secondary">
      <span
        className={`block h-full rounded-full ${tone}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </span>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
