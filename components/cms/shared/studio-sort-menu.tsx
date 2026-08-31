"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { IconCheck, IconChevronDown, IconSort } from "@/components/cms/studio-icons";

export type StudioSortOption<T extends string = string> = {
  id: T;
  label: string;
  description?: string;
  icon?: ReactNode;
};

type Props<T extends string> = {
  value: T;
  options: Array<StudioSortOption<T>>;
  onChange: (id: T) => void;
  label?: string;
};

export function StudioSortMenu<T extends string>({
  value,
  options,
  onChange,
  label = "Sortieren",
}: Props<T>) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.id === value),
  );
  const [highlight, setHighlight] = useState(selectedIndex);
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;
  const selected = options[selectedIndex] ?? options[0];

  function choose(id: T) {
    onChange(id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    setHighlight(selectedIndex);

    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((i) => Math.min(i + 1, options.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setHighlight(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setHighlight(options.length - 1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const option = options[highlightRef.current];
        if (option) choose(option.id);
        return;
      }
      if (event.key === "Tab") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
    // choose reads current onChange/options; re-bind when the menu opens or options change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedIndex, options]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${selected?.label ?? ""}`}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onTriggerKeyDown}
        className={`tap-lift inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-left transition ${
          open
            ? "border-primary/40 bg-card text-foreground shadow-soft"
            : "border-border bg-card text-foreground shadow-soft hover:border-primary/35"
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <IconSort size={14} />
        </span>
        <span className="min-w-0">
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </span>
          <span className="block truncate text-sm font-bold leading-tight">
            {selected?.label}
          </span>
        </span>
        <IconChevronDown
          size={16}
          className={`text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="animate-pop-in absolute right-0 z-50 mt-2 w-[min(18.5rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-1.5 shadow-lift"
        >
          {options.map((option, index) => {
            const active = option.id === value;
            const focused = index === highlight;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(option.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                  active
                    ? "bg-primary/12 text-foreground"
                    : focused
                      ? "bg-secondary text-foreground"
                      : "text-foreground hover:bg-secondary"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {option.icon ?? <IconSort size={15} />}
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block text-sm font-bold leading-tight">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {active ? <IconCheck size={14} className="text-primary" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
