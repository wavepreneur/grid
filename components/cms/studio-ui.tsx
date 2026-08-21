import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { inputCls } from "@/components/cms/ui";

/* ── Form controls (City Games look) ───────────────────────────── */

export function StudioLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StudioInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`${inputCls} disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function StudioSelect({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`${inputCls} disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function StudioTextarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${inputCls} min-h-[6rem] resize-y ${className}`}
      {...props}
    />
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent" | "outline";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft",
  secondary: "border border-border bg-card text-foreground",
  outline: "border border-border bg-card text-foreground",
  ghost: "bg-secondary text-secondary-foreground",
  danger: "bg-destructive text-destructive-foreground",
  accent: "bg-accent text-accent-foreground shadow-soft",
};

export function StudioButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: ReactNode;
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
  };
  return (
    <button
      className={`tap-lift inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${buttonStyles[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function StudioLinkButton({
  href,
  children,
  variant = "secondary",
  icon,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`tap-lift inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-base font-semibold transition ${buttonStyles[variant]} ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}

export function StudioError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <span className="mt-0.5 font-bold">!</span>
      <p>{message}</p>
    </div>
  );
}

export function StudioSuccess({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-success/15 px-4 py-3 text-sm text-success-foreground">
      <p>{message}</p>
    </div>
  );
}

export function StudioHint({
  icon,
  children,
  tone = "info",
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "info" | "warn";
}) {
  const tones = {
    info: "bg-secondary text-secondary-foreground",
    warn: "bg-accent/25 text-accent-foreground",
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm ${tones[tone]}`}>
      {icon ? <span className="mt-0.5 text-muted-foreground">{icon}</span> : null}
      <p>{children}</p>
    </div>
  );
}

export function StudioSectionTitle({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StudioEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-12 text-center">
      {icon ? <span className="mb-3 text-muted-foreground">{icon}</span> : null}
      <p className="font-bold text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StudioStat({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="rounded-2xl bg-secondary px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function StudioChip({
  children,
  active,
  onClick,
  disabled,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition tap-lift";
  const styles = active
    ? "bg-primary text-primary-foreground"
    : "bg-secondary text-secondary-foreground hover:brightness-95";

  if (onClick) {
    return (
      <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${styles} disabled:opacity-40`}>
        {children}
      </button>
    );
  }
  return <span className={`${base} ${styles}`}>{children}</span>;
}
