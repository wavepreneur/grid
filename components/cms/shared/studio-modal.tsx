"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

type StudioModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  hero?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
};

const widths = { md: "sm:max-w-md", lg: "sm:max-w-xl", xl: "sm:max-w-3xl" };

export function StudioModal({
  open,
  onClose,
  title,
  subtitle,
  hero,
  children,
  footer,
  size = "lg",
}: StudioModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-rise-in flex max-h-[92vh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-3xl bg-card shadow-lift sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {hero}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-foreground">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-lift flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-border bg-secondary/50 px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function StudioDetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-border py-3 last:border-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}
