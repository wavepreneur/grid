"use client";

import { useEffect, useRef, type KeyboardEvent, type ClipboardEvent } from "react";

type Props = {
  count: number;
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  /** Bump to focus the first box (e.g. after wrong answer). */
  focusToken?: number | string | null;
};

function sanitizeChar(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
}

export function CodeBoxesInput({
  count,
  values,
  onChange,
  disabled = false,
  className = "flex justify-center gap-2",
  inputClassName,
  focusToken = null,
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function focusAt(index: number) {
    const el = refs.current[index];
    if (!el || el.disabled) return;
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      el.select();
    });
  }

  useEffect(() => {
    if (focusToken == null || disabled) return;
    focusAt(0);
  }, [focusToken, disabled]);

  function writeAt(index: number, char: string) {
    const next = Array.from({ length: count }, (_, i) => values[i] ?? "");
    next[index] = char;
    onChange(next);
  }

  function handleChange(index: number, raw: string) {
    const char = sanitizeChar(raw);
    writeAt(index, char);
    if (char && index < count - 1) {
      focusAt(index + 1);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      const current = values[index] ?? "";
      if (current) {
        writeAt(index, "");
        return;
      }
      if (index > 0) {
        event.preventDefault();
        writeAt(index - 1, "");
        focusAt(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < count - 1) {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, count - index);
    if (!pasted) return;

    const next = Array.from({ length: count }, (_, i) => values[i] ?? "");
    for (let i = 0; i < pasted.length; i++) {
      next[index + i] = pasted[i]!;
    }
    onChange(next);
    focusAt(Math.min(index + pasted.length, count - 1));
  }

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={values[index] ?? ""}
          maxLength={1}
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          className={
            inputClassName ??
            "h-14 w-14 rounded-md border-2 border-[var(--cg-input)] bg-[var(--cg-bg)] text-center text-2xl font-bold uppercase tabular-nums text-[var(--cg-fg)] outline-none focus:border-[var(--cg-primary)] disabled:opacity-50"
          }
          aria-label={`Zeichen ${index + 1}`}
        />
      ))}
    </div>
  );
}
