import Link from "next/link";
import type { ReactNode } from "react";

type GridShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function GridShell({
  eyebrow = "GRID",
  title,
  description,
  children,
}: GridShellProps) {
  return (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <main className="grid-panel w-full max-w-xl p-8 sm:p-10">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--grid-accent)]">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-7 text-[var(--grid-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}

export function GridButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`grid-button w-full rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GridInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`grid-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none ${className}`}
      {...props}
    />
  );
}

export function GridSelect({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`grid-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function GridLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--grid-muted)]">
      {children}
    </label>
  );
}

export function GridError({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  );
}

export function GridLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-[var(--grid-accent)] underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}

export function GridStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--grid-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
