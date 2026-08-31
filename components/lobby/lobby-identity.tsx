"use client";

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";

type Tone = "team" | "player";

type IdentityFieldProps = {
  label: string;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
  step?: string;
  previewHint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

const tones: Record<
  Tone,
  {
    card: string;
    cardFocus: string;
    icon: string;
    bar: string;
    barIdle: string;
    caret: string;
    badge: string;
  }
> = {
  team: {
    card: "from-teal-50 via-white to-white ring-teal-100",
    cardFocus: "ring-teal-400/70 shadow-[0_16px_32px_-18px_rgba(13,148,136,0.55)]",
    icon: "bg-teal-600 text-white",
    bar: "bg-teal-600",
    barIdle: "bg-teal-200",
    caret: "caret-teal-700",
    badge: "bg-teal-600 text-white",
  },
  player: {
    card: "from-amber-50 via-white to-white ring-amber-100",
    cardFocus: "ring-amber-400/70 shadow-[0_16px_32px_-18px_rgba(217,119,6,0.4)]",
    icon: "bg-amber-500 text-white",
    bar: "bg-amber-500",
    barIdle: "bg-amber-200",
    caret: "caret-amber-600",
    badge: "bg-ink text-white",
  },
};

export function IdentityField({
  label,
  hint,
  icon,
  tone = "player",
  step,
  previewHint,
  maxLength,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  ...inputProps
}: IdentityFieldProps) {
  const id = useId();
  const palette = tones[tone];
  const [focused, setFocused] = useState(false);
  const [inner, setInner] = useState(
    String(value ?? defaultValue ?? ""),
  );
  const shown = value !== undefined ? String(value) : inner;
  const filled = shown.trim().length >= 2;
  const preview = shown.trim();

  return (
    <div
      className={`rounded-[1.4rem] bg-gradient-to-br p-4 ring-1 transition ${palette.card} ${
        focused ? palette.cardFocus : "shadow-sm"
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${palette.icon}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-2">
            <label
              htmlFor={id}
              className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-800"
            >
              {label}
            </label>
            {step ? (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {step}
              </span>
            ) : null}
          </div>
          {hint ? (
            <p className="mt-0.5 text-sm leading-snug text-slate-500">{hint}</p>
          ) : null}
        </div>
        {filled ? (
          <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check size={14} strokeWidth={3} />
          </span>
        ) : null}
      </div>

      <input
        id={id}
        maxLength={maxLength}
        {...inputProps}
        {...(value !== undefined ? { value } : { defaultValue })}
        onChange={(event) => {
          if (value === undefined) setInner(event.target.value);
          onChange?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className={`w-full appearance-none border-0 bg-transparent px-0 py-1 font-[family-name:var(--font-outfit)] text-[1.65rem] font-extrabold leading-tight tracking-tight text-slate-900 outline-none ring-0 placeholder:font-semibold placeholder:text-slate-300 ${palette.caret}`}
      />
      <div
        className={`mt-1 h-1.5 rounded-full transition-colors ${
          focused || filled ? palette.bar : palette.barIdle
        }`}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={`inline-flex max-w-[75%] items-center truncate rounded-full px-3 py-1 text-xs font-bold tracking-wide transition ${
            preview ? palette.badge : "bg-white/80 text-slate-400"
          }`}
        >
          {preview || previewHint || "Wird hier angezeigt"}
        </span>
        {maxLength ? (
          <span className="text-[11px] font-bold tabular-nums text-slate-400">
            {shown.length}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function LobbyPrimaryButton({
  children,
  pending,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      onClick={onClick}
      className="tap-lift mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-4 text-base font-extrabold text-white shadow-[0_14px_28px_-12px_rgba(13,148,136,0.65)] transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}
