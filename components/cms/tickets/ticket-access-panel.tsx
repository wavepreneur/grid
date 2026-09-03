"use client";

import { useMemo, useState, useTransition } from "react";
import {
  appendAccessCodes,
  createAccessBatch,
  revokeAccessCode,
  type StudioAccessBatchView,
  type StudioAccessCodeView,
} from "@/app/actions/cms/access";
import { IconDownload, IconPlus, IconTrash } from "@/components/cms/studio-icons";
import { Chip, Empty } from "@/components/cms/ui";
import { useStudioCache } from "@/lib/platform/studio-cache";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
} from "@/components/cms/studio-ui";
import type { StudioGame } from "@/lib/cms/types";
import type { AccessStatus } from "@/lib/grid/access";
import { formatTeamSeatPreview, splitTeamSeats } from "@/lib/grid/team-seats";

type Props = {
  batches: StudioAccessBatchView[];
  games: StudioGame[];
};

const STATUS_LABEL: Record<AccessStatus, string> = {
  unused: "Unbenutzt",
  redeemed: "Aktiviert",
  expired: "Abgelaufen",
  revoked: "Gelöscht",
};

function statusTone(status: AccessStatus) {
  if (status === "redeemed") return "bg-success/20 text-success-foreground";
  if (status === "expired") return "bg-accent/30 text-accent-foreground";
  if (status === "revoked") return "bg-destructive/15 text-destructive";
  return "bg-secondary text-secondary-foreground";
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvForBatch(batch: StudioAccessBatchView) {
  const allCodes = [...batch.codes, ...batch.archived_codes];
  const header = [
    "code",
    "team",
    "status",
    "redeemed_at",
    "last_joined_at",
    "valid_until",
    "revoked_at",
    "player_count",
    "seat_count",
  ];
  const lines = allCodes.map((row) =>
    [
      row.code,
      row.team_name ?? "",
      row.status,
      row.redeemed_at ?? "",
      row.last_joined_at ?? "",
      row.valid_until ?? "",
      row.revoked_at ?? "",
      String(row.player_count),
      String(row.seat_count),
    ]
      .map((cell) => `"${cell.replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(batch: StudioAccessBatchView) {
  const blob = new Blob([csvForBatch(batch)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${batch.name.replace(/[^\w\-]+/g, "-")}-codes.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TicketAccessPanel({ batches, games }: Props) {
  const cache = useStudioCache();
  const published = useMemo(
    () => games.filter((g) => !g.is_template && g.status === "published" && g.published_version_number > 0),
    [games],
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [gameId, setGameId] = useState(published[0]?.id ?? "");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"team" | "event_pool">("team");
  const [teamCount, setTeamCount] = useState("3");
  const [playerCount, setPlayerCount] = useState("14");
  const [maxActivations, setMaxActivations] = useState("40000");
  const [validUntil, setValidUntil] = useState("");
  const [extraQty, setExtraQty] = useState<Record<string, string>>({});

  const seatSplit = useMemo(
    () => splitTeamSeats(Number(playerCount) || 0, Number(teamCount) || 0),
    [playerCount, teamCount],
  );

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      if (kind === "team" && !seatSplit.ok) {
        setError(seatSplit.error);
        return;
      }
      const until = validUntil.trim()
        ? new Date(`${validUntil}T23:59:59`).toISOString()
        : null;
      const result = await createAccessBatch({
        game_id: gameId,
        name,
        kind,
        player_count: Number(playerCount) || 0,
        team_count: Number(teamCount) || 0,
        max_activations: kind === "event_pool" ? Number(maxActivations) || 1 : null,
        valid_until: until,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setName("");
      cache.invalidateTickets();
    });
  }

  function handleRevoke(codeId: string) {
    startTransition(async () => {
      const result = await revokeAccessCode(codeId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      cache.invalidateTickets();
    });
  }

  function handleAppend(batchId: string) {
    const qty = Math.max(1, Number(extraQty[batchId] ?? "1") || 1);
    startTransition(async () => {
      const result = await appendAccessCodes(batchId, qty);
      if (!result.success) {
        setError(result.error);
        return;
      }
      cache.invalidateTickets();
    });
  }

  return (
    <div className="space-y-5">
      {open ? (
        <form onSubmit={handleCreate} className="rounded-3xl bg-card p-5 shadow-soft">
          <StudioSectionTitle
            icon={<IconPlus size={18} />}
            title="Zugänge erzeugen"
            description="Codes sofort spielbar — kein extra Aktivieren. Spieler tippen den Code auf /go."
          />
          {error ? (
            <div className="mb-4">
              <StudioError message={error} />
            </div>
          ) : null}
          {published.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Veröffentliche zuerst ein Spiel. Entwürfe können keine Tickets bekommen.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <StudioLabel>Spiel</StudioLabel>
                <StudioSelect value={gameId} onChange={(e) => setGameId(e.target.value)} required>
                  {published.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </StudioSelect>
              </div>
              <div>
                <StudioLabel>Name</StudioLabel>
                <StudioInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="z. B. Tabbrain Sommer 2026"
                />
              </div>
              <div>
                <StudioLabel>Art</StudioLabel>
                <StudioSelect
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "team" | "event_pool")}
                >
                  <option value="team">Team-Codes — ein Code pro Team, gemeinsames Event</option>
                  <option value="event_pool">Event-Code — ein Code, Geräte werden gezählt</option>
                </StudioSelect>
              </div>
              {kind === "team" ? (
                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <StudioLabel>Teilnehmer</StudioLabel>
                      <StudioInput
                        type="number"
                        min={1}
                        max={4000}
                        value={playerCount}
                        onChange={(e) => setPlayerCount(e.target.value)}
                      />
                    </div>
                    <div>
                      <StudioLabel>Anzahl Teams</StudioLabel>
                      <StudioInput
                        type="number"
                        min={1}
                        max={500}
                        value={teamCount}
                        onChange={(e) => setTeamCount(e.target.value)}
                      />
                    </div>
                  </div>
                  {seatSplit.ok ? (
                    <StudioHint>
                      {seatSplit.seats.length} Codes · {formatTeamSeatPreview(seatSplit.seats)}
                    </StudioHint>
                  ) : (
                    <StudioHint tone="warn">{seatSplit.error}</StudioHint>
                  )}
                </div>
              ) : (
                <div>
                  <StudioLabel hint="Geräte, die mit dem einen Code reinkommen">Teilnehmer / Geräte</StudioLabel>
                  <StudioInput
                    type="number"
                    min={1}
                    value={maxActivations}
                    onChange={(e) => setMaxActivations(e.target.value)}
                  />
                </div>
              )}
              <div>
                <StudioLabel hint="Leer = kein automatisches Ende">Gültig bis</StudioLabel>
                <StudioInput
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <StudioButton
              type="submit"
              disabled={pending || published.length === 0 || (kind === "team" && !seatSplit.ok)}
              icon={<IconPlus size={16} />}
            >
              {pending ? "Erzeuge…" : "Codes erzeugen"}
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
          className="tap-lift flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-card px-5 py-5 text-sm font-bold text-primary shadow-soft"
        >
          <IconPlus size={18} />
          Zugänge erzeugen
        </button>
      )}

      {error && !open ? <StudioError message={error} /> : null}

      {batches.length === 0 ? (
        <Empty>Noch keine Tickets. Erzeuge oben Codes für ein veröffentlichtes Spiel.</Empty>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              pending={pending}
              extraQty={extraQty[batch.id] ?? "1"}
              onExtraQty={(value) => setExtraQty((prev) => ({ ...prev, [batch.id]: value }))}
              onAppend={() => handleAppend(batch.id)}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BatchCard({
  batch,
  pending,
  extraQty,
  onExtraQty,
  onAppend,
  onRevoke,
}: {
  batch: StudioAccessBatchView;
  pending: boolean;
  extraQty: string;
  onExtraQty: (value: string) => void;
  onAppend: () => void;
  onRevoke: (codeId: string) => void;
}) {
  const used = batch.codes.filter((c) => c.status === "redeemed").length;
  const live = batch.codes.filter((c) => c.status !== "revoked" && c.status !== "expired").length;

  return (
    <article className="overflow-hidden rounded-3xl bg-card shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{batch.name}</h3>
            <Chip>
              {batch.kind === "team" ? "Team-Codes" : "Event-Code"}
            </Chip>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {batch.game_name ?? "Spiel"}
            {batch.valid_until ? ` · bis ${formatWhen(batch.valid_until)}` : ""}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {batch.kind === "event_pool"
              ? `${batch.used_activations} / ${batch.max_activations ?? "∞"} Geräte`
              : [
                  `${used} von ${live} Codes aktiviert`,
                  batch.seat_sizes.length > 0
                    ? `${batch.seat_sizes.reduce((sum, n) => sum + n, 0)} Personen (${batch.seat_sizes.join(", ")})`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        <StudioButton
          type="button"
          variant="secondary"
          className="px-3 py-2 text-xs"
          icon={<IconDownload size={14} />}
          onClick={() => downloadCsv(batch)}
        >
          CSV
        </StudioButton>
      </div>

      <div className="overflow-x-auto border-t border-border/70">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-secondary/60 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5">Team</th>
              <th className="px-4 py-2.5">Plätze</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Aktiviert</th>
              <th className="px-4 py-2.5">Zuletzt</th>
              <th className="px-4 py-2.5">Ablauf</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {batch.codes.length === 0 ? (
              <tr className="border-t border-border/50">
                <td colSpan={8} className="px-4 py-4 text-center text-sm text-muted-foreground">
                  Keine aktiven Codes. Gelöschte Codes liegen im Archiv.
                </td>
              </tr>
            ) : (
              batch.codes.map((row) => (
                <CodeRow key={row.id} row={row} pending={pending} onRevoke={onRevoke} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {batch.archived_codes.length > 0 ? (
        <details className="border-t border-border/70 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            Archiv ({batch.archived_codes.length}) · automatische Löschung nach 30 Tagen
          </summary>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-secondary/60 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Team</th>
                  <th className="px-4 py-2.5">Plätze</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Aktiviert</th>
                  <th className="px-4 py-2.5">Zuletzt</th>
                  <th className="px-4 py-2.5">Gelöscht</th>
                  <th className="px-4 py-2.5">Ablauf</th>
                </tr>
              </thead>
              <tbody>
                {batch.archived_codes.map((row) => (
                  <ArchivedCodeRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {batch.kind === "team" ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-4 py-3">
          <StudioInput
            type="number"
            min={1}
            max={200}
            value={extraQty}
            onChange={(e) => onExtraQty(e.target.value)}
            className="mt-0 w-24"
          />
          <StudioButton type="button" variant="ghost" disabled={pending} onClick={onAppend}>
            Weitere Team-Codes
          </StudioButton>
        </div>
      ) : null}
    </article>
  );
}

function ArchivedCodeRow({ row }: { row: StudioAccessCodeView }) {
  return (
    <tr className="border-t border-border/50">
      <td className="px-4 py-2.5 font-mono text-base font-bold tracking-wide">{row.code}</td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {row.kind === "event_pool" ? "Gemeinsames Event" : row.team_name ?? "—"}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {row.kind === "team" && row.seat_count > 0 ? `${row.player_count}/${row.seat_count}` : "—"}
      </td>
      <td className="px-4 py-2.5">
        <Chip tone={statusTone(row.status)}>{STATUS_LABEL[row.status]}</Chip>
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{formatWhen(row.redeemed_at)}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{formatWhen(row.last_joined_at)}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{formatWhen(row.revoked_at)}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{formatWhen(row.valid_until)}</td>
    </tr>
  );
}

function CodeRow({
  row,
  pending,
  onRevoke,
}: {
  row: StudioAccessCodeView;
  pending: boolean;
  onRevoke: (codeId: string) => void;
}) {
  return (
    <tr className="border-t border-border/50">
      <td className="px-4 py-2.5 font-mono text-base font-bold tracking-wide">{row.code}</td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {row.kind === "event_pool" ? "Gemeinsames Event" : row.team_name ?? "—"}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {row.kind === "team" && row.seat_count > 0
          ? `${row.player_count}/${row.seat_count}`
          : "—"}
      </td>
      <td className="px-4 py-2.5">
        <Chip tone={statusTone(row.status)}>{STATUS_LABEL[row.status]}</Chip>
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{formatWhen(row.redeemed_at)}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{formatWhen(row.last_joined_at)}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{formatWhen(row.valid_until)}</td>
      <td className="px-4 py-2.5 text-right">
        {row.status === "revoked" ? null : (
          <button
            type="button"
            disabled={pending}
            onClick={() => onRevoke(row.id)}
            className="tap-lift inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            <IconTrash size={12} />
            Löschen
          </button>
        )}
      </td>
    </tr>
  );
}
