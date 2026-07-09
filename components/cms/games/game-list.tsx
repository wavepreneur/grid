"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createGame } from "@/app/actions/cms/games";
import { GridButton, GridError, GridInput, GridLabel } from "@/components/grid/grid-shell";
import { StudioBadge } from "@/components/cms/admin-shell";
import type { StudioBlueprint, StudioGame } from "@/lib/cms/types";

type Props = {
  games: StudioGame[];
  blueprints: StudioBlueprint[];
};

export function GameList({ games, blueprints }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [blueprintId, setBlueprintId] = useState<string | "">("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createGame({
        name,
        blueprint_id: blueprintId || null,
        blank: !blueprintId,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.data) {
        setError("Erstellen fehlgeschlagen.");
        return;
      }
      setOpen(false);
      router.push(`/admin/games/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {open ? (
        <form onSubmit={handleCreate} className="grid-panel space-y-4 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Neues Game</h2>
          {error ? <GridError message={error} /> : null}
          <div>
            <GridLabel>Name</GridLabel>
            <GridInput value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <GridLabel>Blueprint (optional)</GridLabel>
            <select
              className="grid-input w-full rounded-xl px-4 py-3 text-sm text-white"
              value={blueprintId}
              onChange={(e) => setBlueprintId(e.target.value)}
            >
              <option value="">Leer starten — Features manuell wählen</option>
              {blueprints.map((bp) => (
                <option key={bp.id} value={bp.id}>
                  {bp.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <GridButton type="submit" disabled={pending} className="w-auto px-6">
              {pending ? "Erstellen…" : "Game erstellen"}
            </GridButton>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[var(--grid-border)] px-5 py-3 text-sm text-[var(--grid-muted)]"
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid-panel flex w-full items-center justify-center rounded-2xl border border-dashed border-[var(--grid-border)] p-8 text-sm font-medium text-[var(--grid-accent)] transition hover:border-[var(--grid-accent)]/50"
        >
          + Game erstellen
        </button>
      )}

      <div className="grid gap-4">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/admin/games/${game.id}`}
            className="grid-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 transition hover:border-[var(--grid-accent)]/30"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{game.name}</h3>
                <StudioBadge tone={game.status === "published" ? "live" : "draft"}>
                  {game.status}
                </StudioBadge>
                {game.gps_enabled ? <StudioBadge tone="default">GPS</StudioBadge> : null}
              </div>
              <p className="mt-1 text-sm text-[var(--grid-muted)]">
                v{game.published_version_number} · {game.slug}
              </p>
            </div>
            <span className="text-xs text-[var(--grid-muted)]">
              Bearbeiten → Live-Events nur via Publish / Push
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
