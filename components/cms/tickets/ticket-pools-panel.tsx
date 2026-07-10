"use client";

import { useState, useTransition } from "react";
import { activateTicketPool, createTicketPool } from "@/app/actions/cms/tickets";
import { StudioBadge, StudioPanel } from "@/components/cms/admin-shell";
import { IconPlus, IconTicket } from "@/components/cms/studio-icons";
import { useStudioCache } from "@/lib/platform/studio-cache";
import {
  StudioButton,
  StudioEmptyState,
  StudioError,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
  StudioStat,
} from "@/components/cms/studio-ui";
import type { StudioGame, StudioTicketPool } from "@/lib/cms/types";

type Props = {
  pools: StudioTicketPool[];
  games: StudioGame[];
};

export function TicketPoolsPanel({ pools, games }: Props) {
  const cache = useStudioCache();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"single" | "pool">("pool");
  const [maxActivations, setMaxActivations] = useState("3000");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTicketPool({
        game_id: gameId,
        name,
        mode,
        max_activations: mode === "pool" ? Number(maxActivations) || null : null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setName("");
      cache.prependTicketPool(result.data!);
    });
  }

  function handleActivate(poolId: string) {
    startTransition(async () => {
      const result = await activateTicketPool(poolId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      cache.patchTicketPool(poolId, { status: "active" });
    });
  }

  return (
    <div className="space-y-6">
      {open ? (
        <form onSubmit={handleCreate}>
          <StudioPanel>
            <StudioSectionTitle
              icon={<IconPlus size={18} />}
              title="Ticket-Pool erstellen"
              description="Verknüpfe ein Spiel mit Tickets für Teilnehmer."
            />
            {error ? <div className="mb-4"><StudioError message={error} /></div> : null}
            <div className="space-y-4">
              <div>
                <StudioLabel>Spiel</StudioLabel>
                <StudioSelect value={gameId} onChange={(e) => setGameId(e.target.value)} required>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </StudioSelect>
              </div>
              <div>
                <StudioLabel>Name</StudioLabel>
                <StudioInput value={name} onChange={(e) => setName(e.target.value)} required placeholder="z. B. Tabbrain Sommer 2026" />
              </div>
              <div>
                <StudioLabel>Modus</StudioLabel>
                <StudioSelect
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "single" | "pool")}
                >
                  <option value="single">Einzel-Tickets — jedes Ticket einmal nutzbar</option>
                  <option value="pool">Pool — gemeinsame Kapazität (z. B. 3.000 Starts)</option>
                </StudioSelect>
              </div>
              {mode === "pool" ? (
                <div>
                  <StudioLabel>Max. Aktivierungen</StudioLabel>
                  <StudioInput
                    type="number"
                    value={maxActivations}
                    onChange={(e) => setMaxActivations(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex gap-3">
              <StudioButton type="submit" disabled={pending} icon={<IconPlus size={16} />}>
                Pool anlegen
              </StudioButton>
              <StudioButton type="button" variant="ghost" onClick={() => setOpen(false)}>
                Abbrechen
              </StudioButton>
            </div>
          </StudioPanel>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-sm font-medium text-teal-600 transition hover:border-teal-300 hover:bg-teal-50/50"
        >
          <IconPlus size={18} />
          Ticket-Pool erstellen
        </button>
      )}

      {pools.length === 0 ? (
        <StudioEmptyState
          icon={<IconTicket size={32} />}
          title="Noch keine Ticket-Pools"
          description="Erstelle einen Pool, um Teilnehmer-Zugänge zu verwalten."
        />
      ) : (
        <div className="grid gap-4">
          {pools.map((pool) => {
            const used = Number(pool.used_activations ?? 0);
            const max = pool.max_activations ? Number(pool.max_activations) : null;
            const pct = max ? Math.min(100, Math.round((used / max) * 100)) : null;

            return (
              <StudioPanel key={pool.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{pool.name}</h3>
                      <StudioBadge tone={pool.status === "active" ? "live" : "draft"}>
                        {pool.status === "active" ? "Aktiv" : "Entwurf"}
                      </StudioBadge>
                      <StudioBadge>{pool.mode === "pool" ? "Pool" : "Einzel"}</StudioBadge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {pool.studio_games?.name ?? pool.game_id}
                    </p>
                  </div>
                  {pool.status === "draft" ? (
                    <StudioButton
                      type="button"
                      className="px-4 py-2 text-xs"
                      disabled={pending}
                      onClick={() => handleActivate(pool.id)}
                    >
                      Aktivieren
                    </StudioButton>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <StudioStat label="Aktivierungen" value={String(used)} />
                  <StudioStat label="Kapazität" value={max ? String(max) : "∞"} />
                  <StudioStat
                    label="Spieler pro Start"
                    value={String(pool.max_players_per_activation)}
                  />
                </div>

                {pct !== null ? (
                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{pct}% belegt</p>
                  </div>
                ) : null}
              </StudioPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
