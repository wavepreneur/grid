"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateGame } from "@/app/actions/cms/games";
import { saveGameAsLayerPacks } from "@/app/actions/cms/packs";
import { PackSearchSelect } from "@/components/cms/packs/pack-search-select";
import { StudioButton, StudioError } from "@/components/cms/studio-ui";
import { gameUsesLayerPacks, layerPackHintDe, layerPackLabelDe } from "@/lib/cms/layer-packs";
import type { StudioGame } from "@/lib/cms/types";
import { useInvalidateStudioPacks } from "@/lib/hooks/use-studio-packs";
import { useInvalidateStudioGames } from "@/lib/hooks/use-studio-games";
import { queryKeys } from "@/lib/platform/query-keys";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  game: StudioGame;
  onGameChange: (game: StudioGame) => void;
};

export function GameCompositionPanel({ game, onGameChange }: Props) {
  const invalidatePacks = useInvalidateStudioPacks();
  const invalidateGames = useInvalidateStudioGames();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const packed = gameUsesLayerPacks(game);

  function refresh(next: StudioGame) {
    onGameChange(next);
    invalidatePacks();
    invalidateGames();
    void queryClient.invalidateQueries({ queryKey: queryKeys.games.taskLinks(game.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(game.id) });
  }

  function setPack(layer: 1 | 2 | 3, packId: string | null) {
    startTransition(async () => {
      const result = await updateGame({
        id: game.id,
        layer1_pack_id: layer === 1 ? packId : undefined,
        layer2_pack_id: layer === 2 ? packId : undefined,
        layer3_pack_id: layer === 3 ? packId : undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      refresh(result.data);
    });
  }

  function extractPacks() {
    startTransition(async () => {
      const result = await saveGameAsLayerPacks(game.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      refresh(result.data);
    });
  }

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg font-bold">Packs andocken</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Spiel zuerst spielbar machen. Danach Layer 1 (Stadt) duplizieren, Layer 2 und 3 nur anhängen.
        {pending ? " Speichert…" : ""}
      </p>
      {error ? (
        <div className="mt-3">
          <StudioError message={error} />
        </div>
      ) : null}
      {!packed ? (
        <div className="mt-4">
          <StudioButton type="button" disabled={pending} onClick={extractPacks}>
            Dieses Spiel als Packs speichern
          </StudioButton>
          <p className="mt-2 text-xs text-muted-foreground">
            Erzeugt Stadt-, Missions- und Team-Pack aus den aktuellen Slots. GPS liegt danach im Stadt-Pack.
          </p>
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {([1, 2, 3] as const).map((layer) => {
          const current =
            layer === 1 ? game.layer1_pack_id : layer === 2 ? game.layer2_pack_id : game.layer3_pack_id;
          return (
            <div key={layer} className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Layer {layer} · {layerPackLabelDe(layer)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{layerPackHintDe(layer)}</p>
              <div className="mt-3">
                <PackSearchSelect
                  layer={layer}
                  value={current}
                  onChange={(packId) => setPack(layer, packId)}
                />
              </div>
              {current ? (
                <Link
                  href={`/admin/packs/${current}`}
                  className="mt-2 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Pack öffnen
                </Link>
              ) : (
                <Link
                  href="/admin/packs"
                  className="mt-2 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Pack anlegen
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
