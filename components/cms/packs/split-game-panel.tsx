"use client";

import { useEffect, useState, useTransition } from "react";
import { getLayerPack, saveGameAsLayerPacks } from "@/app/actions/cms/packs";
import { GameSearchSelect } from "@/components/cms/games/game-search-select";
import { StudioButton, StudioError, StudioInput, StudioLabel, StudioSuccess } from "@/components/cms/studio-ui";
import { gameUsesLayerPacks, layerPackLabelDe } from "@/lib/cms/layer-packs";
import type { StudioGamePickerItem } from "@/lib/cms/types";
import { useInvalidateStudioGames } from "@/lib/hooks/use-studio-games";
import { useInvalidateStudioPacks } from "@/lib/hooks/use-studio-packs";

function defaultPartNames(game: StudioGamePickerItem) {
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
  const invalidatePacks = useInvalidateStudioPacks();
  const invalidateGames = useInvalidateStudioGames();
  const [selected, setSelected] = useState<StudioGamePickerItem | null>(null);
  const [layer1, setLayer1] = useState("");
  const [layer2, setLayer2] = useState("");
  const [layer3, setLayer3] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const alreadySplit = selected ? gameUsesLayerPacks(selected) : false;

  useEffect(() => {
    if (!selected) return;
    const defaults = defaultPartNames(selected);
    setLayer1(defaults.layer1);
    setLayer2(defaults.layer2);
    setLayer3(defaults.layer3);
    if (!gameUsesLayerPacks(selected)) return;
    let cancelled = false;
    void Promise.all([
      selected.layer1_pack_id ? getLayerPack(selected.layer1_pack_id) : null,
      selected.layer2_pack_id ? getLayerPack(selected.layer2_pack_id) : null,
      selected.layer3_pack_id ? getLayerPack(selected.layer3_pack_id) : null,
    ]).then(([one, two, three]) => {
      if (cancelled) return;
      if (one?.success && one.data) setLayer1(one.data.pack.name);
      if (two?.success && two.data) setLayer2(two.data.pack.name);
      if (three?.success && three.data) setLayer3(three.data.pack.name);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

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
        <GameSearchSelect
          value={selected}
          onChange={setSelected}
          excludeCompose
          placeholder="Spiel suchen…"
          hintFor={(game) =>
            gameUsesLayerPacks(game) ? "schon geteilt" : "komplett · bereit zum Teilen"
          }
        />
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
