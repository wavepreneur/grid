import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type GridShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Soft welcome layout for mass-play join / lobby (less “admin”). */
  variant?: "default" | "welcome";
  /** Optional game logo shown above the title. */
  logoUrl?: string | null;
  children: ReactNode;
};

export function GridShell({
  eyebrow = "GRID",
  title,
  description,
  variant = "default",
  logoUrl = null,
  children,
}: GridShellProps) {
  if (variant === "welcome") {
    return (
      <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-[linear-gradient(165deg,#0f766e_0%,#134e4a_42%,#f7f6f0_42.1%)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42%] opacity-30">
          <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute right-0 top-20 h-48 w-48 rounded-full bg-teal-300/30 blur-3xl" />
        </div>
        <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-6 text-center text-white">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-lg ring-2 ring-white/40"
                />
              ) : (
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold tracking-wide text-white shadow-lg backdrop-blur">
                  {title.slice(0, 1).toUpperCase()}
                </span>
              )}
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight drop-shadow-sm sm:text-4xl">
                {title}
              </h1>
              {description ? (
                <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-white/85">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)] sm:p-7">
              {children}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="grid-bg flex min-h-[100dvh] flex-col items-center justify-center px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <main className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10">
        <div className="mb-8 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
              G
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">
              {eyebrow}
            </p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-7 text-slate-500">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border-teal-600 bg-teal-600 text-white shadow-sm hover:border-teal-700 hover:bg-teal-700",
  secondary:
    "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};

export function GridButton({
  children,
  className = "",
  variant = "primary",
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
}) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500/25 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function GridInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`grid-input w-full rounded-xl px-4 py-3.5 text-base outline-none placeholder:text-slate-400 ${className}`}
      {...props}
    />
  );
}

export function GridSelect({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`grid-input w-full rounded-xl px-4 py-3.5 text-base outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function GridLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-medium text-slate-700">{children}</label>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function GridError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function GridSuccess({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      {message}
    </div>
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
      className="text-sm font-medium text-teal-600 underline-offset-4 hover:text-teal-700 hover:underline"
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
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function GridHint({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warn";
}) {
  const tones = {
    info: "border-slate-200 bg-slate-50 text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  );
}
