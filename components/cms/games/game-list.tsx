"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createGame } from "@/app/actions/cms/games";
import { StudioBadge } from "@/components/cms/admin-shell";
import { IconArrowRight, IconGamepad, IconPlus } from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioEmptyState,
  StudioError,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
} from "@/components/cms/studio-ui";
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
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <StudioSectionTitle
            icon={<IconPlus size={18} />}
            title="Neues Spiel"
            description="Gib einen Namen ein — optional startest du mit einer Vorlage."
          />
          {error ? <div className="mb-4"><StudioError message={error} /></div> : null}
          <div className="space-y-4">
            <div>
              <StudioLabel>Name</StudioLabel>
              <StudioInput value={name} onChange={(e) => setName(e.target.value)} required placeholder="z. B. Berlin City Quest" />
            </div>
            <div>
              <StudioLabel hint="Optional — Features und Ablauf werden vorausgefüllt">
                Vorlage
              </StudioLabel>
              <StudioSelect value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)}>
                <option value="">Leer starten</option>
                {blueprints.map((bp) => (
                  <option key={bp.id} value={bp.id}>
                    {bp.name}
                  </option>
                ))}
              </StudioSelect>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <StudioButton type="submit" disabled={pending} icon={<IconPlus size={16} />}>
              {pending ? "Wird erstellt…" : "Spiel erstellen"}
            </StudioButton>
            <StudioButton type="button" variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </StudioButton>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-sm font-medium text-teal-600 transition hover:border-teal-300 hover:bg-teal-50/50"
        >
          <IconPlus size={18} />
          Neues Spiel erstellen
        </button>
      )}

      {games.length === 0 ? (
        <StudioEmptyState
          icon={<IconGamepad size={32} />}
          title="Noch keine Spiele"
          description="Erstelle dein erstes Spiel oder starte mit einer Vorlage."
        />
      ) : (
        <div className="grid gap-3">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/admin/games/${game.id}`}
              className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-600">
                  <IconGamepad size={20} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{game.name}</h3>
                    <StudioBadge tone={game.status === "published" ? "live" : "draft"}>
                      {game.status === "published" ? "Veröffentlicht" : "Entwurf"}
                    </StudioBadge>
                    {game.gps_enabled ? (
                      <StudioBadge>GPS</StudioBadge>
                    ) : (
                      <StudioBadge>Indoor</StudioBadge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Version {game.published_version_number} · {game.slug}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-600">
                Bearbeiten
                <IconArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
