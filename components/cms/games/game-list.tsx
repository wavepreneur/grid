"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteGames,
  getGamesDeleteStatus,
  takeGamesOffline,
} from "@/app/actions/cms/delete";
import {
  createGame,
  createGameFromTemplate,
  duplicateGames,
} from "@/app/actions/cms/games";
import type { GameDeleteStatus } from "@/lib/cms/delete-status";
import {
  useGamesLiveMeta,
  useInvalidateStudioGames,
  useStudioGamesList,
  useStudioTemplates,
} from "@/lib/hooks/use-studio-games";
import { StudioBadge } from "@/components/cms/admin-shell";
import { GameStatusSwitch } from "@/components/cms/games/game-status-switch";
import { StudioBulkBar, StudioSelectCheckbox } from "@/components/cms/shared/studio-bulk-bar";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { StudioDuplicateModal } from "@/components/cms/shared/studio-duplicate-modal";
import {
  IconArrowRight,
  IconCopy,
  IconGamepad,
  IconPlus,
  IconTemplate,
  IconTrash,
} from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioEmptyState,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import type { StudioGame } from "@/lib/cms/types";

type GameWithLive = StudioGame & { liveEventCount: number };

type GameSort = "updated" | "created" | "status" | "name";
type CreateMode = "blank" | "template";

const SORT_OPTIONS: Array<{ id: GameSort; label: string }> = [
  { id: "updated", label: "Zuletzt bearbeitet" },
  { id: "created", label: "Zuletzt erstellt" },
  { id: "status", label: "Status (Veröffentlicht → Entwurf)" },
  { id: "name", label: "Name (A–Z)" },
];

function sortGames<T extends StudioGame>(list: T[], sort: GameSort): T[] {
  const next = [...list];
  switch (sort) {
    case "created":
      return next.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "status":
      return next.sort((a, b) => {
        const order: Record<string, number> = { published: 0, draft: 1, archived: 2 };
        const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        return diff !== 0 ? diff : a.name.localeCompare(b.name, "de", { sensitivity: "base" });
      });
    case "name":
      return next.sort((a, b) =>
        a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
      );
    case "updated":
    default:
      return next.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
  }
}

type Props = {
  initialGames: StudioGame[];
  initialTemplates: StudioGame[];
};

export function GameList({ initialGames, initialTemplates }: Props) {
  const router = useRouter();
  const invalidateGames = useInvalidateStudioGames();
  const { data: games = initialGames } = useStudioGamesList(initialGames);
  const { data: templates = initialTemplates } = useStudioTemplates(initialTemplates);
  const gameIds = useMemo(() => games.map((g) => g.id), [games]);
  const { data: liveMeta = [] } = useGamesLiveMeta(gameIds);
  const liveCountByGame = useMemo(
    () => new Map(liveMeta.map((s) => [s.gameId, s.liveEvents.length])),
    [liveMeta],
  );
  const gamesWithLive = useMemo(
    () =>
      games.map((game) => ({
        ...game,
        liveEventCount: liveCountByGame.get(game.id) ?? 0,
      })),
    [games, liveCountByGame],
  );
  const [open, setOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("blank");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteStatuses, setDeleteStatuses] = useState<GameDeleteStatus[]>([]);
  const [offlineConfirm, setOfflineConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [duplicatePending, setDuplicatePending] = useState(false);
  const [sort, setSort] = useState<GameSort>("updated");

  const sortedGames = useMemo(() => sortGames(gamesWithLive, sort), [gamesWithLive, sort]);
  const sortedTemplates = useMemo(
    () => sortGames(templates, "updated"),
    [templates],
  );

  const allSelected =
    sortedGames.length > 0 && sortedGames.every((g) => selectedIds.has(g.id));
  const someSelected =
    sortedGames.some((g) => selectedIds.has(g.id)) && !allSelected;

  const blockedLive = deleteStatuses.filter((s) => s.liveEvents.length > 0);
  const blockedPools = deleteStatuses.filter((s) => s.activeTicketPools > 0);
  const needsOffline = blockedLive.length > 0 || blockedPools.length > 0;

  function openCreateForm(mode: CreateMode = "blank", presetTemplateId?: string) {
    setOpen(true);
    setCreateMode(mode);
    setName("");
    setTemplateId(presetTemplateId ?? templates[0]?.id ?? "");
    setError(null);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      if (createMode === "template") {
        if (!templateId) {
          setError("Bitte eine Vorlage auswählen.");
          return;
        }
        const result = await createGameFromTemplate({ templateId, name });
        if (!result.success) {
          setError(result.error);
          return;
        }
        if (!result.data?.id) {
          setError("Erstellen fehlgeschlagen.");
          return;
        }
        setOpen(false);
        invalidateGames();
        router.push(`/admin/games/${result.data.id}`);
        return;
      }

      const result = await createGame({ name });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.data?.id) {
        setError("Erstellen fehlgeschlagen.");
        return;
      }
      setOpen(false);
      invalidateGames();
      router.push(`/admin/games/${result.data.id}`);
    } finally {
      setCreating(false);
    }
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(sortedGames.map((g) => g.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function openDeleteModal(ids: string[]) {
    setDeleteError(null);
    setOfflineConfirm(false);
    setDeleteIds(ids);
    const result = await getGamesDeleteStatus(ids);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDeleteStatuses(result.data!);
    setDeleteOpen(true);
  }

  function openDuplicateModal(ids: string[]) {
    setDuplicateIds(ids);
    setDuplicateOpen(true);
  }

  async function confirmDuplicate(count: number) {
    setDuplicatePending(true);
    setError(null);
    try {
      const result = await duplicateGames(duplicateIds, count);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const { createdCount } = result.data!;
      setDuplicateOpen(false);
      setSelectedIds(new Set());
      setMessage(
        createdCount === 1
          ? "Spiel dupliziert."
          : `${createdCount} Spiele dupliziert.`,
      );
      invalidateGames();
    } finally {
      setDuplicatePending(false);
    }
  }

  async function confirmDelete() {
    setDeletePending(true);
    setDeleteError(null);
    try {
      if (needsOffline && !offlineConfirm) {
        setDeleteError("Bitte bestätige, dass laufende Live-Events beendet werden sollen.");
        return;
      }

      if (needsOffline && offlineConfirm) {
        const offlineResult = await takeGamesOffline(
          deleteStatuses
            .filter((s) => s.liveEvents.length > 0 || s.activeTicketPools > 0)
            .map((s) => s.gameId),
        );
        if (!offlineResult.success) {
          setDeleteError(offlineResult.error);
          return;
        }
      }

      const refreshed = await getGamesDeleteStatus(deleteIds);
      if (!refreshed.success) {
        setDeleteError(refreshed.error);
        return;
      }
      setDeleteStatuses(refreshed.data!);

      const result = await deleteGames(deleteIds);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }

      const { deletedIds, failed } = result.data!;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of deletedIds) next.delete(id);
        return next;
      });

      if (failed.length > 0 && deletedIds.length === 0) {
        setDeleteError(failed.map((f) => f.error).join(" · "));
        return;
      }

      setDeleteOpen(false);
      if (deletedIds.length > 0) {
        setMessage(
          deletedIds.length === 1
            ? "Eintrag gelöscht."
            : `${deletedIds.length} Einträge gelöscht.`,
        );
      }
      if (failed.length > 0) {
        setError(`${failed.length} Eintrag/Einträge konnten nicht gelöscht werden.`);
      }
      invalidateGames();
    } finally {
      setDeletePending(false);
    }
  }

  const deleteWarnings = useMemo(() => {
    if (deleteStatuses.length === 0) return null;
    const live = deleteStatuses.filter((s) => s.liveEvents.length > 0);
    const pools = deleteStatuses.filter((s) => s.activeTicketPools > 0);
    const poolDeletes = deleteStatuses.filter(
      (s) => s.ticketPoolCount > 0 && s.activeTicketPools === 0 && s.liveEvents.length === 0,
    );
    const totalPoolsToDelete = poolDeletes.reduce((sum, s) => sum + s.ticketPoolCount, 0);
    return (
      <>
        {live.length > 0 ? (
          <StudioHint tone="warn">
            {live.length === 1
              ? "1 ausgewähltes Spiel läuft gerade live."
              : `${live.length} ausgewählte Spiele laufen gerade live.`}{" "}
            Beende die Events, bevor du löschst.
            <ul className="mt-2 list-disc pl-5 text-xs">
              {live.flatMap((s) =>
                s.liveEvents.map((e) => (
                  <li key={e.id}>
                    {e.title} ({e.invite_code}) · {e.status}
                  </li>
                )),
              )}
            </ul>
          </StudioHint>
        ) : null}
        {pools.length > 0 && live.length === 0 ? (
          <StudioHint tone="warn">
            {pools.length} Spiel(e) haben aktive Ticket-Pools. Diese werden beim Offline-Stellen pausiert.
          </StudioHint>
        ) : null}
        {totalPoolsToDelete > 0 && live.length === 0 && pools.length === 0 ? (
          <StudioHint tone="info">
            {totalPoolsToDelete === 1
              ? "1 Ticket-Pool wird mit den Spielen gelöscht."
              : `${totalPoolsToDelete} Ticket-Pools werden mit den Spielen gelöscht.`}
          </StudioHint>
        ) : null}
      </>
    );
  }, [deleteStatuses]);

  return (
    <div className="space-y-10 pb-24">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      {open ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <StudioSectionTitle
            icon={<IconPlus size={18} />}
            title="Neues Spiel"
            description="Leer starten oder eine gespeicherte Vorlage als Ausgangspunkt duplizieren."
          />
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreateMode("blank")}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  createMode === "blank"
                    ? "border-teal-300 bg-teal-50 text-teal-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                Leer starten
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("template")}
                disabled={templates.length === 0}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  createMode === "template"
                    ? "border-teal-300 bg-teal-50 text-teal-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                Aus Vorlage
              </button>
            </div>

            {createMode === "template" && templates.length === 0 ? (
              <StudioHint tone="info">
                Noch keine Vorlagen gespeichert. Markiere ein bestehendes Spiel im Editor als Vorlage.
              </StudioHint>
            ) : null}

            <div>
              <StudioLabel>Name</StudioLabel>
              <StudioInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="z. B. Berlin City Quest"
              />
            </div>

            {createMode === "template" ? (
              <div>
                <StudioLabel hint="Aufgaben, Layer, Logik und Einstellungen werden übernommen">
                  Vorlage
                </StudioLabel>
                <StudioSelect
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  required
                >
                  {sortedTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </StudioSelect>
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <StudioButton type="submit" disabled={creating} icon={<IconPlus size={16} />}>
              {creating ? "Wird erstellt…" : "Spiel erstellen"}
            </StudioButton>
            <StudioButton type="button" variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </StudioButton>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => openCreateForm("blank")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-sm font-medium text-teal-600 transition hover:border-teal-300 hover:bg-teal-50/50"
        >
          <IconPlus size={18} />
          Neues Spiel erstellen
        </button>
      )}

      <section>
        <StudioSectionTitle
          icon={<IconGamepad size={18} />}
          title="Meine Spiele"
          description="Entwürfe und veröffentlichte Spiele für Live-Events."
        />

        {gamesWithLive.length === 0 ? (
          <StudioEmptyState
            icon={<IconGamepad size={32} />}
            title="Noch keine Spiele"
            description="Erstelle dein erstes Spiel — leer oder aus einer gespeicherten Vorlage."
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <StudioSelectCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                  label="Alle auf dieser Seite auswählen"
                />
                <span className="text-sm text-slate-600">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} ausgewählt`
                    : "Alle auf dieser Seite auswählen"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="game-sort" className="text-xs font-medium text-slate-500">
                  Sortieren
                </label>
                <StudioSelect
                  id="game-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as GameSort)}
                  className="w-auto min-w-[220px] py-2 text-sm"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </StudioSelect>
              </div>
            </div>

            <div className="grid gap-3">
              {sortedGames.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  selected={selectedIds.has(game.id)}
                  onToggle={(checked) => toggleOne(game.id, checked)}
                  onDuplicate={() => openDuplicateModal([game.id])}
                  onDelete={() => openDeleteModal([game.id])}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section id="vorlagen">
        <StudioSectionTitle
          icon={<IconTemplate size={18} />}
          title="Meine Vorlagen"
          description="Spiele, die du als Ausgangspunkt für neue Projekte speicherst — nicht für Live-Events."
        />

        {templates.length === 0 ? (
          <StudioEmptyState
            icon={<IconTemplate size={32} />}
            title="Noch keine Vorlagen"
            description='Speichere ein Spiel über „Als Vorlage" im Spiel-Editor — es erscheint dann hier.'
          />
        ) : (
          <div className="grid gap-3">
            {sortedTemplates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/30 p-5 shadow-sm"
              >
                <Link
                  href={`/admin/games/${template.id}`}
                  className="group flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                      <IconTemplate size={20} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                        <StudioBadge tone="draft">Vorlage</StudioBadge>
                        {template.gps_enabled ? (
                          <StudioBadge>GPS</StudioBadge>
                        ) : (
                          <StudioBadge>Indoor</StudioBadge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {template.description?.trim() || template.slug}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-600">
                    Bearbeiten
                    <IconArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>

                <StudioButton
                  type="button"
                  variant="secondary"
                  icon={<IconPlus size={14} />}
                  onClick={() => openCreateForm("template", template.id)}
                >
                  Spiel erstellen
                </StudioButton>

                <button
                  type="button"
                  aria-label={`${template.name} löschen`}
                  onClick={() => openDeleteModal([template.id])}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <StudioBulkBar
        count={selectedIds.size}
        label={selectedIds.size === 1 ? "Spiel ausgewählt" : "Spiele ausgewählt"}
        pending={deletePending || duplicatePending}
        onClear={() => setSelectedIds(new Set())}
        onDuplicate={() => openDuplicateModal([...selectedIds])}
        onDelete={() => openDeleteModal([...selectedIds])}
      />

      <StudioDuplicateModal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        itemLabel={duplicateIds.length === 1 ? "Spiel" : "Spiele"}
        selectedCount={duplicateIds.length}
        pending={duplicatePending}
        onConfirm={confirmDuplicate}
      />

      <StudioDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Löschen?"
        count={deleteIds.length}
        itemLabel={deleteIds.length === 1 ? "Eintrag" : "Einträge"}
        pending={deletePending}
        warnings={
          <>
            {deleteWarnings}
            {deleteError ? <StudioError message={deleteError} /> : null}
          </>
        }
        offlineSwitch={
          needsOffline
            ? {
                checked: offlineConfirm,
                onChange: setOfflineConfirm,
                label:
                  blockedLive.length > 0
                    ? "Live-Events beenden und Ticket-Pools pausieren (offline stellen), dann löschen"
                    : "Ticket-Pools pausieren (offline stellen), dann löschen",
              }
            : undefined
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function GameRow({
  game,
  selected,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  game: GameWithLive;
  selected: boolean;
  onToggle: (checked: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-5 shadow-sm transition ${
        selected ? "border-teal-300 bg-teal-50/20" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <StudioSelectCheckbox
        checked={selected}
        onChange={onToggle}
        label={`${game.name} auswählen`}
      />

      <Link
        href={`/admin/games/${game.id}`}
        className="group flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-600">
            <IconGamepad size={20} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">{game.name}</h3>
              {game.liveEventCount > 0 ? <StudioBadge tone="live">Live</StudioBadge> : null}
              <GameStatusSwitch
                gameId={game.id}
                status={game.status}
                publishedVersionNumber={game.published_version_number}
                liveEventCount={game.liveEventCount}
                compact
              />
              {game.gps_enabled ? <StudioBadge>GPS</StudioBadge> : <StudioBadge>Indoor</StudioBadge>}
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

      <button
        type="button"
        aria-label={`${game.name} duplizieren`}
        onClick={onDuplicate}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
      >
        <IconCopy size={16} />
      </button>

      <button
        type="button"
        aria-label={`${game.name} löschen`}
        onClick={onDelete}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
}
