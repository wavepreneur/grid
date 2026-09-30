"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getLayerPack, saveGameAsLayerPacks } from "@/app/actions/cms/packs";
import { StudioButton, StudioError, StudioInput, StudioLabel, StudioSuccess } from "@/components/cms/studio-ui";
import { IconSearch } from "@/components/cms/studio-icons";
import { inputCls } from "@/components/cms/ui";
import { gameUsesLayerPacks, layerPackLabelDe } from "@/lib/cms/layer-packs";
import type { StudioGame } from "@/lib/cms/types";
import { useInvalidateStudioGames, useStudioGamesList } from "@/lib/hooks/use-studio-games";
import { useInvalidateStudioPacks } from "@/lib/hooks/use-studio-packs";

function defaultPartNames(game: StudioGame) {
  const city = game.city_slug
    ? game.city_slug
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "";
  return {
    layer1: city || `${game.name} · Ort`,
    layer2: game.name,
    layer3: `${game.name} · Team`,
  };
}

export function SplitGamePanel() {
  const gamesQuery = useStudioGamesList();
  const invalidatePacks = useInvalidateStudioPacks();
  const invalidateGames = useInvalidateStudioGames();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [layer1, setLayer1] = useState("");
  const [layer2, setLayer2] = useState("");
  const [layer3, setLayer3] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sourceGames = useMemo(
    () => (gamesQuery.data ?? []).filter((game) => !game.compose_recipe_id && game.status !== "archived"),
    [gamesQuery.data],
  );
  const selected = sourceGames.find((game) => game.id === gameId) ?? null;
  const alreadySplit = selected ? gameUsesLayerPacks(selected) : false;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    if (!needle) return sourceGames;
    return sourceGames.filter((game) => {
      const hay = `${game.name} ${game.slug} ${game.city_slug ?? ""}`.toLocaleLowerCase("de");
      return hay.includes(needle);
    });
  }, [query, sourceGames]);

  useEffect(() => {
    const game = sourceGames.find((row) => row.id === gameId);
    if (!game) return;
    const defaults = defaultPartNames(game);
    setLayer1(defaults.layer1);
    setLayer2(defaults.layer2);
    setLayer3(defaults.layer3);
    if (!gameUsesLayerPacks(game)) return;
    let cancelled = false;
    void Promise.all([
      game.layer1_pack_id ? getLayerPack(game.layer1_pack_id) : null,
      game.layer2_pack_id ? getLayerPack(game.layer2_pack_id) : null,
      game.layer3_pack_id ? getLayerPack(game.layer3_pack_id) : null,
    ]).then(([one, two, three]) => {
      if (cancelled) return;
      if (one?.success && one.data) setLayer1(one.data.pack.name);
      if (two?.success && two.data) setLayer2(two.data.pack.name);
      if (three?.success && three.data) setLayer3(three.data.pack.name);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId, sourceGames]);

  function pickGame(game: StudioGame) {
    setGameId(game.id);
    setQuery(game.name);
    setOpen(false);
    setError(null);
    setMessage(null);
  }

  function split() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await saveGameAsLayerPacks(selected.id, {
        layer1,
        layer2,
        layer3,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      invalidatePacks();
      invalidateGames();
      setMessage(
        alreadySplit
          ? "Namen gespeichert. Die Teile liegen jetzt in den Rezepten bereit."
          : "Spiel ist geteilt. Mission und Team kannst du unten in ein Rezept legen.",
      );
    });
  }

  const canSplit = Boolean(selected) && layer1.trim() && layer2.trim() && layer3.trim();

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Schritt 1</p>
      <h2 className="mt-1 text-xl font-bold">Spiel aufteilen</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Nimm ein Spiel, das du schon getestet hast. Wir trennen es in Ort, Mission und Team — du gibst
        jedem Teil einen Namen, den du später wiederfindest.
      </p>

      {error ? (
        <div className="mt-4">
          <StudioError message={error} />
        </div>
      ) : null}
      {message ? (
        <div className="mt-4">
          <StudioSuccess message={message} />
        </div>
      ) : null}

      <div className="relative mt-5 max-w-xl">
        <StudioLabel>Getestetes Spiel</StudioLabel>
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
              if (selected && e.target.value !== selected.name) setGameId(null);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Spiel suchen…"
            className={`${inputCls} mt-0 border-0 bg-secondary pl-11 shadow-none`}
          />
        </div>
        {open ? (
          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl bg-card p-2 shadow-soft">
            {gamesQuery.isPending ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Spiele laden…</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Kein passendes Spiel. Lege zuerst unter Spiele eine Mahlzeit an und teste sie.
              </p>
            ) : (
              filtered.slice(0, 20).map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => pickGame(game)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left ${
                    game.id === gameId ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{game.name}</span>
                    <span className={`block text-xs ${game.id === gameId ? "opacity-80" : "text-muted-foreground"}`}>
                      {gameUsesLayerPacks(game) ? "schon geteilt" : "komplett · bereit zum Teilen"}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {([
            [1, layer1, setLayer1, "z. B. München"],
            [2, layer2, setLayer2, "z. B. First Profiler"],
            [3, layer3, setLayer3, "z. B. Klassik"],
          ] as const).map(([layer, value, setValue, placeholder]) => (
            <div key={layer}>
              <StudioLabel hint={layer === 1 ? "Stadt oder Venue" : layer === 2 ? "Die Geschichte" : "Bonus und Rollen"}>
                {layerPackLabelDe(layer)}
              </StudioLabel>
              <StudioInput
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        <StudioButton type="button" disabled={pending || !canSplit} onClick={split}>
          {alreadySplit ? "Namen speichern" : "In drei Teile teilen"}
        </StudioButton>
      </div>
    </section>
  );
}
