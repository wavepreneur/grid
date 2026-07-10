import type { ReactNode } from "react";

export function StudioPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
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
    default: "border-slate-200 bg-slate-50 text-slate-600",
    live: "border-emerald-200 bg-emerald-50 text-emerald-700",
    draft: "border-amber-200 bg-amber-50 text-amber-800",
    warn: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
