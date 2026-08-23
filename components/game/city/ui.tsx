"use client";

import type { ReactNode } from "react";

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="city-game min-h-[var(--vv-height,100dvh)] bg-[var(--cg-ink)]/95 py-0 sm:py-8">
      <div className="cg-screen-shell relative mx-auto flex min-h-[var(--vv-height,100dvh)] w-full max-w-[30rem] flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[var(--cg-bg)] shadow-[var(--cg-shadow-lift)] sm:min-h-[calc(100dvh-4rem)] sm:rounded-[2.5rem]">
        {children}
      </div>
    </div>
  );
}

export function StageShell({ children }: { children: ReactNode }) {
  return (
    <div className="city-game min-h-[100dvh] bg-[var(--cg-ink)]/95">
      <div className="mx-auto min-h-[100dvh] w-full max-w-7xl bg-[var(--cg-bg)] shadow-[var(--cg-shadow-lift)] xl:my-6 xl:min-h-[calc(100dvh-3rem)] xl:rounded-[2.5rem]">
        {children}
      </div>
    </div>
  );
}

export function BigButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  icon,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "accent" | "ghost" | "outline";
  disabled?: boolean;
  icon?: ReactNode;
  type?: "button" | "submit";
}) {
  const styles: Record<string, string> = {
    primary: "bg-[var(--cg-primary)] text-[var(--cg-primary-fg)] shadow-[var(--cg-shadow-lift)]",
    accent: "bg-[var(--cg-accent)] text-[var(--cg-accent-fg)] shadow-[var(--cg-shadow-lift)]",
    ghost: "bg-[var(--cg-secondary)] text-[var(--cg-secondary-fg)]",
    outline:
      "border-2 border-[var(--cg-border)] bg-[var(--cg-card)] text-[var(--cg-fg)]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`cg-tap-lift flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold disabled:opacity-40 sm:py-5 sm:text-lg ${styles[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="overflow-visible ps-[0.2em] pe-[0.35em] text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--cg-muted)]">
      {children}
    </p>
  );
}

export function IconBtn({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="cg-tap-lift flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cg-secondary)] text-[var(--cg-fg)]"
    >
      {children}
    </button>
  );
}
