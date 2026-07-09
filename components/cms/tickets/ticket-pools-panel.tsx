"use client";

import { useState, useTransition } from "react";
import { activateTicketPool, createTicketPool } from "@/app/actions/cms/tickets";
import { GridButton, GridError, GridInput, GridLabel, GridSelect } from "@/components/grid/grid-shell";
import { StudioBadge } from "@/components/cms/admin-shell";
import type { StudioGame, StudioTicketPool } from "@/lib/cms/types";

type Props = {
  pools: StudioTicketPool[];
  games: StudioGame[];
};

export function TicketPoolsPanel({ pools, games }: Props) {
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
      window.location.reload();
    });
  }

  function handleActivate(poolId: string) {
    startTransition(async () => {
      await activateTicketPool(poolId);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      {open ? (
        <form onSubmit={handleCreate} className="grid-panel space-y-4 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Ticket-Pool erstellen</h2>
          {error ? <GridError message={error} /> : null}
          <div>
            <GridLabel>Game</GridLabel>
            <GridSelect value={gameId} onChange={(e) => setGameId(e.target.value)} required>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </GridSelect>
          </div>
          <div>
            <GridLabel>Name</GridLabel>
            <GridInput value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <GridLabel>Modus</GridLabel>
            <GridSelect
              value={mode}
              onChange={(e) => setMode(e.target.value as "single" | "pool")}
            >
              <option value="single">Einzel-Tickets (unabhängig)</option>
              <option value="pool">Pool / Scope (z. B. 3000 Aktivierungen)</option>
            </GridSelect>
          </div>
          {mode === "pool" ? (
            <div>
              <GridLabel>Max. Aktivierungen</GridLabel>
              <GridInput
                type="number"
                value={maxActivations}
                onChange={(e) => setMaxActivations(e.target.value)}
              />
            </div>
          ) : null}
          <GridButton type="submit" disabled={pending} className="w-auto px-6">
            Pool anlegen
          </GridButton>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid-panel w-full rounded-2xl border border-dashed border-[var(--grid-border)] p-6 text-sm font-medium text-[var(--grid-accent)]"
        >
          + Ticket-Pool erstellen
        </button>
      )}

      <div className="grid gap-4">
        {pools.map((pool) => {
          const used = Number(pool.used_activations ?? 0);
          const max = pool.max_activations ? Number(pool.max_activations) : null;
          const pct = max ? Math.min(100, Math.round((used / max) * 100)) : null;

          return (
            <div key={pool.id} className="grid-panel rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
                    <StudioBadge tone={pool.status === "active" ? "live" : "draft"}>
                      {pool.status}
                    </StudioBadge>
                    <StudioBadge>{pool.mode}</StudioBadge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--grid-muted)]">
                    {pool.studio_games?.name ?? pool.game_id}
                  </p>
                </div>
                {pool.status === "draft" ? (
                  <GridButton
                    type="button"
                    className="w-auto px-4 py-2 text-xs"
                    disabled={pending}
                    onClick={() => handleActivate(pool.id)}
                  >
                    Aktivieren
                  </GridButton>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Aktivierungen" value={String(used)} />
                <Stat label="Kapazität" value={max ? String(max) : "∞"} />
                <Stat
                  label="Spieler / Aktivierung"
                  value={String(pool.max_players_per_activation)}
                />
              </div>

              {pct !== null ? (
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[var(--grid-accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--grid-muted)]">{pct}% belegt</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--grid-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
