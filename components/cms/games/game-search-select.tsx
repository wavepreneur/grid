"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@/components/cms/studio-icons";
import { inputCls } from "@/components/cms/ui";
import { useDebouncedValue } from "@/lib/hooks/use-task-library-search";
import { useStudioGamePicker } from "@/lib/hooks/use-studio-games";
import { gameUsesLayerPacks } from "@/lib/cms/layer-packs";
import type { StudioGamePickerItem } from "@/lib/cms/types";

type Props = {
  value: StudioGamePickerItem | null;
  onChange: (game: StudioGamePickerItem | null) => void;
  publishedOnly?: boolean;
  excludeCompose?: boolean;
  placeholder?: string;
  hintFor?: (game: StudioGamePickerItem) => string;
};

export function GameSearchSelect({
  value,
  onChange,
  publishedOnly = false,
  excludeCompose = false,
  placeholder = "Spiel suchen…",
  hintFor,
}: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const search = useDebouncedValue(query, 200);
  const picker = useStudioGamePicker({
    search: open ? search : value?.name === query ? "" : search,
    publishedOnly,
    excludeCompose,
    enabled: open,
  });
  const games = picker.data ?? [];

  useEffect(() => {
    if (value && !open) setQuery(value.name);
  }, [value, open]);

  function pick(game: StudioGamePickerItem) {
    onChange(game);
    setQuery(game.name);
    setOpen(false);
  }

  return (
    <div className="relative">
      {open ? (
        <button
          type="button"
          aria-label="Liste schließen"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className="relative z-20">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value && e.target.value !== value.name) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${inputCls} mt-0 border-0 bg-secondary pl-11 shadow-none`}
        />
      </div>
      {open ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl bg-card p-2 shadow-soft">
          {picker.isPending && games.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Spiele laden…</p>
          ) : games.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Kein passendes Spiel.</p>
          ) : (
            games.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => pick(game)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left ${
                  game.id === value?.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{game.name}</span>
                  <span
                    className={`block text-xs ${game.id === value?.id ? "opacity-80" : "text-muted-foreground"}`}
                  >
                    {hintFor
                      ? hintFor(game)
                      : gameUsesLayerPacks(game)
                        ? "schon geteilt"
                        : game.slug}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
