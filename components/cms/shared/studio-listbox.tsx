"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { IconCheck, IconChevronDown } from "@/components/cms/studio-icons";

export type StudioListboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type StudioListboxProps = {
  value: string;
  options: StudioListboxOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
  /** field = form control; sidebar = project switcher in the nav. */
  variant?: "field" | "sidebar";
  placement?: "bottom" | "top";
  "aria-label"?: string;
  leading?: ReactNode;
  caption?: string;
  id?: string;
};

export function optionsFromSelectChildren(children: ReactNode): StudioListboxOption[] {
  const options: StudioListboxOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== "option") return;
    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    };
    const label = textFromNode(props.children);
    options.push({
      value: props.value === undefined ? label : String(props.value),
      label: label || String(props.value ?? ""),
      disabled: Boolean(props.disabled),
    });
  });
  return options;
}

function textFromNode(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement(node)) return textFromNode((node.props as { children?: ReactNode }).children);
  return "";
}

export function StudioListbox({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Auswählen…",
  className = "",
  name,
  required = false,
  variant = "field",
  placement = "bottom",
  leading,
  caption,
  id,
  "aria-label": ariaLabel,
}: StudioListboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );
  const selected = options.find((opt) => opt.value === value);
  const [highlight, setHighlight] = useState(selectedIndex);
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;

  function choose(next: string) {
    if (disabled) return;
    const option = options.find((opt) => opt.value === next);
    if (!option || option.disabled) return;
    onChange(next);
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
        setHighlight((i) => nextEnabledIndex(options, i, 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((i) => nextEnabledIndex(options, i, -1));
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setHighlight(nextEnabledIndex(options, -1, 1));
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setHighlight(nextEnabledIndex(options, options.length, -1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const option = options[highlightRef.current];
        if (option) choose(option.value);
        return;
      }
      if (event.key === "Tab") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedIndex, options]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  const menu = open ? (
    <div
      id={listId}
      role="listbox"
      aria-label={ariaLabel}
      className={`absolute z-50 w-full overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-lift ${
        placement === "top" ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"
      }`}
    >
      <div className="max-h-64 overflow-y-auto">
        {options.map((option, index) => {
          const active = option.value === value;
          const focused = index === highlight;
          return (
            <button
              key={`${option.value}-${index}`}
              type="button"
              role="option"
              aria-selected={active}
              disabled={option.disabled}
              onMouseEnter={() => {
                if (!option.disabled) setHighlight(index);
              }}
              onClick={() => choose(option.value)}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition disabled:opacity-40 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : focused
                    ? "bg-secondary text-foreground"
                    : "text-foreground hover:bg-secondary"
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{option.label}</span>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {active ? (
                  <IconCheck
                    size={14}
                    className={active ? "text-primary-foreground" : "text-primary"}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  const triggerCls =
    variant === "sidebar"
      ? `tap-lift flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition ${
          open
            ? "border-primary/45 bg-card shadow-soft"
            : "border-border bg-background hover:border-primary/35"
        }`
      : `tap-lift flex w-full items-center gap-2 rounded-2xl border px-4 py-2.5 text-left text-base outline-none transition ${
          open
            ? "border-primary bg-background shadow-soft"
            : "border-border bg-background hover:border-primary/40"
        }`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        onKeyDown={onTriggerKeyDown}
        className={`${triggerCls} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {leading}
        <span className="min-w-0 flex-1">
          {caption ? (
            <span className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {caption}
            </span>
          ) : null}
          <span
            className={`block truncate font-semibold text-foreground ${
              caption ? "text-sm leading-tight" : ""
            }`}
          >
            {selected?.label || placeholder}
          </span>
        </span>
        <IconChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {menu}
    </div>
  );
}

function nextEnabledIndex(
  options: StudioListboxOption[],
  from: number,
  step: 1 | -1,
): number {
  if (options.length === 0) return 0;
  let i = from;
  for (let n = 0; n < options.length; n += 1) {
    i += step;
    if (i < 0) i = options.length - 1;
    if (i >= options.length) i = 0;
    if (!options[i]?.disabled) return i;
  }
  return Math.max(0, from);
}

export function StudioSelect({
  className = "",
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  name,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = useMemo(() => optionsFromSelectChildren(children), [children]);
  const [uncontrolled, setUncontrolled] = useState(
    String(value ?? defaultValue ?? options[0]?.value ?? ""),
  );
  const current = value !== undefined ? String(value) : uncontrolled;

  function handleChange(next: string) {
    if (value === undefined) setUncontrolled(next);
    const fake = {
      target: { value: next, name: name ?? "" },
      currentTarget: { value: next, name: name ?? "" },
    };
    onChange?.(fake as ChangeEvent<HTMLSelectElement>);
  }

  return (
    <StudioListbox
      value={current}
      options={options}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      name={name}
      id={id}
      className={`mt-1 ${className}`}
      aria-label={typeof props["aria-label"] === "string" ? props["aria-label"] : undefined}
    />
  );
}
