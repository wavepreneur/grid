"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconClose } from "@/components/cms/studio-icons";
import { useTaskLibraryTags } from "@/lib/hooks/use-task-library-search";

function tagKey(value: string) {
  return value.trim().toLocaleLowerCase("de");
}

function findExistingTag(value: string, pool: string[]) {
  const key = tagKey(value);
  if (!key) return null;
  return pool.find((tag) => tagKey(tag) === key) ?? null;
}

function parseTags(values: string[]) {
  const next: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || findExistingTag(trimmed, next)) continue;
    next.push(trimmed);
  }
  return next;
}

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
};

export function TaskTagsField({ value, onChange }: Props) {
  const { data } = useTaskLibraryTags();
  const libraryTags = data?.tags ?? [];
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => parseTags(value), [value]);
  const selectedKeys = useMemo(() => new Set(selected.map(tagKey)), [selected]);

  const suggestions = useMemo(() => {
    const query = tagKey(draft);
    return libraryTags
      .filter((tag) => !selectedKeys.has(tagKey(tag)))
      .filter((tag) => !query || tagKey(tag).includes(query))
      .slice(0, 8);
  }, [draft, libraryTags, selectedKeys]);

  useEffect(() => {
    setActiveIndex(0);
  }, [draft, open]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function pinTag(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const canonical = findExistingTag(trimmed, libraryTags) ?? findExistingTag(trimmed, selected) ?? trimmed;
    if (findExistingTag(canonical, selected)) {
      setDraft("");
      return;
    }
    onChange([...selected, canonical]);
    setDraft("");
    setOpen(true);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(selected.filter((entry) => tagKey(entry) !== tagKey(tag)));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Backspace" && !draft && selected.length > 0) {
      event.preventDefault();
      removeTag(selected[selected.length - 1]);
      return;
    }
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (open && suggestions[activeIndex]) {
        pinTag(suggestions[activeIndex]);
        return;
      }
      pinTag(draft);
    }
  }

  const showSuggestions = open && suggestions.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <div
        className="mt-1 flex min-h-[46px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-primary"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeTag(tag);
              }}
              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={`${tag} entfernen`}
            >
              <IconClose size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value.replace(/,/g, ""));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            const match = findExistingTag(draft, suggestions);
            if (match) pinTag(match);
          }}
          placeholder={selected.length === 0 ? "berlin, outdoor, quiz…" : "Tag hinzufügen"}
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-base outline-none placeholder:text-muted-foreground/70"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
        />
      </div>
      {showSuggestions ? (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-card p-1 shadow-soft"
          role="listbox"
        >
          {suggestions.map((tag, index) => {
            const active = index === activeIndex;
            return (
              <li key={tag}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${
                    active ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary/70"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pinTag(tag)}
                >
                  {tag}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
