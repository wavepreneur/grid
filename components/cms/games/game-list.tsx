"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  useRefreshStudioGamesList,
  useStudioGamesList,
  useStudioTemplates,
} from "@/lib/hooks/use-studio-games";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";
import { prefetchStudioGame } from "@/lib/hooks/use-studio-game-detail";
import { StudioBulkBar, StudioSelectCheckbox } from "@/components/cms/shared/studio-bulk-bar";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { StudioDuplicateModal } from "@/components/cms/shared/studio-duplicate-modal";
import { StudioSortMenu, type StudioSortOption } from "@/components/cms/shared/studio-sort-menu";
import {
  IconAlpha,
  IconCalendar,
  IconClock,
  IconCopy,
  IconDevices,
  IconGamepad,
  IconKeyRound,
  IconLive,
  IconMapPin,
  IconPlay,
  IconPlus,
  IconSearch,
  IconTemplate,
  IconDownload,
  IconTrash,
} from "@/components/cms/studio-icons";
import { Chip, Empty, inputCls } from "@/components/cms/ui";
import { GameStatusSwitch } from "@/components/cms/games/game-status-switch";
import { GameTestPlayModal } from "@/components/cms/games/game-test-play-modal";
import { GameStationCodesModal } from "@/components/cms/games/game-station-codes-modal";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import type { StudioGame } from "@/lib/cms/types";
import { parseRuntimeProfiles, type ContentMode } from "@/lib/cms/layer-model";
import {
  surfaceDescriptionDe,
  surfaceLabelDe,
  surfaceTaglineDe,
} from "@/lib/cms/game-slots";

type GameWithLive = StudioGame & { liveEventCount: number };

type GameSort = "updated" | "created" | "status" | "name";
type CreateMode = "blank" | "template";

const SURFACE_OPTIONS: ContentMode[] = ["outdoor", "indoor", "online"];

function gameDefaultSurface(game: StudioGame): ContentMode {
  return parseRuntimeProfiles(game.runtime_profiles).default_mode;
}

const SORT_OPTIONS: Array<StudioSortOption<GameSort>> = [
  {
    id: "updated",
    label: "Zuletzt bearbeitet",
    description: "Neueste Änderungen zuerst",
    icon: <IconClock size={15} />,
  },
  {
    id: "created",
    label: "Zuletzt erstellt",
    description: "Neue Spiele zuerst",
    icon: <IconCalendar size={15} />,
  },
  {
    id: "status",
    label: "Status",
    description: "Veröffentlicht → Entwurf",
    icon: <IconLive size={15} />,
  },
  {
    id: "name",
    label: "Name (A–Z)",
    description: "Alphabetisch nach Titel",
    icon: <IconAlpha size={15} />,
  },
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
  const queryClient = useQueryClient();
  const { orgSlug } = useStudioShell();
  const refreshGames = useRefreshStudioGamesList();
  const { data: games = initialGames } = useStudioGamesList(initialGames);
  const { data: templates = initialTemplates } = useStudioTemplates(initialTemplates);
  const gameIds = useMemo(() => games.map((g) => g.id), [games]);
  const { data: liveMetaData } = useGamesLiveMeta(gameIds);
  const liveMeta = Array.isArray(liveMetaData) ? liveMetaData : [];
  const liveCountByGame = useMemo(
    () => new Map(liveMeta.map((s) => [s.gameId, s.liveEvents?.length ?? 0])),
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
  const [surface, setSurface] = useState<ContentMode>("outdoor");
  const [templateId, setTemplateId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteStatuses, setDeleteStatuses] = useState<GameDeleteStatus[]>([]);
  const [offlineConfirm, setOfflineConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [sort, setSort] = useState<GameSort>("updated");
  const [statusTab, setStatusTab] = useState<"alle" | "draft" | "published" | "archived">("alle");
  const [surfaceTab, setSurfaceTab] = useState<"alle" | ContentMode>("alle");
  const [query, setQuery] = useState("");

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gamesWithLive.filter((g) => {
      if (statusTab === "alle") {
        if (g.status === "archived") return false;
      } else if (g.status !== statusTab) {
        return false;
      }
      if (surfaceTab !== "alle" && gameDefaultSurface(g) !== surfaceTab) {
        return false;
      }
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        (g.city_slug ?? "").toLowerCase().includes(q)
      );
    });
  }, [gamesWithLive, statusTab, surfaceTab, query]);

  const sortedGames = useMemo(() => sortGames(filteredGames, sort), [filteredGames, sort]);
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
    setSurface("outdoor");
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
        await refreshGames();
        router.push(`/admin/games/${result.data.id}`);
        return;
      }

      const result = await createGame({ name, surface });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.data?.id) {
        setError("Erstellen fehlgeschlagen.");
        return;
      }
      setOpen(false);
      await refreshGames();
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

  const duplicateMutation = useMutation({
    mutationFn: async ({ ids, count }: { ids: string[]; count: number }) => {
      const result = await duplicateGames(ids, count);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: async (data) => {
      setDuplicateOpen(false);
      setSelectedIds(new Set());
      setMessage(
        data.createdCount === 1
          ? "Spiel dupliziert."
          : `${data.createdCount} Spiele dupliziert.`,
      );
      await refreshGames();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Duplizieren fehlgeschlagen.");
    },
  });

  async function confirmDuplicate(count: number) {
    setError(null);
    duplicateMutation.mutate({ ids: duplicateIds, count });
  }

  const deleteMutation = useMutation({
    mutationFn: async ({
      ids,
      offlineFirst,
      offlineGameIds,
    }: {
      ids: string[];
      offlineFirst: boolean;
      offlineGameIds: string[];
    }) => {
      if (offlineFirst) {
        const offlineResult = await takeGamesOffline(offlineGameIds);
        if (!offlineResult.success) throw new Error(offlineResult.error);
      }

      const refreshed = await getGamesDeleteStatus(ids);
      if (!refreshed.success) throw new Error(refreshed.error);

      const blocked = refreshed.data!.some(
        (s) => s.liveEvents.length > 0 || s.activeTicketPools > 0,
      );
      if (blocked) {
        throw new Error("Live-Events oder Ticket-Pools blockieren noch das Löschen.");
      }

      const result = await deleteGames(ids);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onMutate: async ({ ids }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.games.list(orgSlug) }),
        queryClient.cancelQueries({ queryKey: queryKeys.games.templates(orgSlug) }),
      ]);

      const previousGames = queryClient.getQueryData<StudioGame[]>(queryKeys.games.list(orgSlug));
      const previousTemplates = queryClient.getQueryData<StudioGame[]>(
        queryKeys.games.templates(orgSlug),
      );

      queryClient.setQueryData<StudioGame[]>(queryKeys.games.list(orgSlug), (old) =>
        (old ?? []).filter((game) => !ids.includes(game.id)),
      );
      queryClient.setQueryData<StudioGame[]>(queryKeys.games.templates(orgSlug), (old) =>
        (old ?? []).filter((game) => !ids.includes(game.id)),
      );

      return { previousGames, previousTemplates };
    },
    onSuccess: (data) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of data.deletedIds) next.delete(id);
        return next;
      });

      if (data.failed.length > 0 && data.deletedIds.length === 0) {
        setDeleteError(data.failed.map((f) => f.error).join(" · "));
        return;
      }

      setDeleteOpen(false);
      if (data.deletedIds.length > 0) {
        setMessage(
          data.deletedIds.length === 1
            ? "Eintrag gelöscht."
            : `${data.deletedIds.length} Einträge gelöscht.`,
        );
      }
      if (data.failed.length > 0) {
        setError(`${data.failed.length} Eintrag/Einträge konnten nicht gelöscht werden.`);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
    },
    onError: (err, _vars, context) => {
      if (context?.previousGames) {
        queryClient.setQueryData(queryKeys.games.list(orgSlug), context.previousGames);
      }
      if (context?.previousTemplates) {
        queryClient.setQueryData(queryKeys.games.templates(orgSlug), context.previousTemplates);
      }
      setDeleteError(err instanceof Error ? err.message : "Löschen fehlgeschlagen.");
    },
  });

  async function confirmDelete() {
    if (needsOffline && !offlineConfirm) {
      setDeleteError("Bitte bestätige, dass laufende Live-Events beendet werden sollen.");
      return;
    }

    setDeleteError(null);
    deleteMutation.mutate({
      ids: deleteIds,
      offlineFirst: needsOffline && offlineConfirm,
      offlineGameIds: deleteStatuses
        .filter((s) => s.liveEvents.length > 0 || s.activeTicketPools > 0)
        .map((s) => s.gameId),
    });
  }

  const deletePending = deleteMutation.isPending;
  const duplicatePending = duplicateMutation.isPending;

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
    <div className="space-y-5 pb-24">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      {open ? (
        <form onSubmit={handleCreate} className="rounded-3xl bg-card p-5 shadow-soft">
          <StudioSectionTitle
            icon={<IconPlus size={18} />}
            title="Neues Spiel"
            description="Spielort wählen — Ablauf später: Quiz → Level → Bonus."
          />
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreateMode("blank")}
                className={`tap-lift rounded-2xl px-4 py-2.5 text-sm font-bold ${
                  createMode === "blank"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                Leer starten
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("template")}
                disabled={templates.length === 0}
                className={`tap-lift rounded-2xl px-4 py-2.5 text-sm font-bold disabled:opacity-40 ${
                  createMode === "template"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                Aus Vorlage
              </button>
            </div>

            {createMode === "blank" ? (
              <div>
                <StudioLabel>Wo wird gespielt?</StudioLabel>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {SURFACE_OPTIONS.map((mode) => {
                    const active = surface === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSurface(mode)}
                        className={`tap-lift rounded-2xl px-3 py-3 text-left ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-black/10">
                          {mode === "outdoor" ? (
                            <IconMapPin size={18} />
                          ) : mode === "indoor" ? (
                            <IconKeyRound size={18} />
                          ) : (
                            <IconDevices size={18} />
                          )}
                        </span>
                        <p className="text-sm font-bold">{surfaceLabelDe(mode)}</p>
                        <p className={`mt-0.5 text-[11px] font-semibold uppercase tracking-wide ${active ? "opacity-90" : "opacity-70"}`}>
                          {surfaceTaglineDe(mode)}
                        </p>
                        <p className="mt-1.5 text-xs leading-5 opacity-80">
                          {surfaceDescriptionDe(mode)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

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
          className="tap-lift flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-card px-5 py-5 text-sm font-bold text-primary shadow-soft"
        >
          <IconPlus size={18} />
          Neues Spiel erstellen
        </button>
      )}

      <div className="rounded-3xl bg-card p-3 shadow-soft sm:p-4">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Spiel oder Stadt suchen…"
            className={`${inputCls} mt-0 border-0 bg-secondary pl-11 shadow-none`}
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <FilterTrack
            aria-label="Status"
            value={statusTab}
            onChange={setStatusTab}
            options={[
              { id: "alle", label: "Aktiv" },
              { id: "published", label: "Veröffentlicht" },
              { id: "draft", label: "Entwurf" },
              { id: "archived", label: "Archiv" },
            ]}
          />
          <FilterTrack
            aria-label="Spielfläche"
            value={surfaceTab}
            onChange={setSurfaceTab}
            options={[
              { id: "alle", label: "Alle" },
              ...SURFACE_OPTIONS.map((mode) => ({
                id: mode,
                label: surfaceLabelDe(mode),
              })),
            ]}
          />
        </div>
        {gamesWithLive.length > 0 && sortedGames.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <div className="flex items-center gap-3">
              <StudioSelectCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
                label="Alle auf dieser Seite auswählen"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} ausgewählt`
                  : `${sortedGames.length} Spiele`}
              </span>
            </div>
            <StudioSortMenu value={sort} options={SORT_OPTIONS} onChange={setSort} />
          </div>
        ) : null}
      </div>

      <section>
        {gamesWithLive.length === 0 ? (
          <Empty>Noch keine Spiele. Lege oben ein neues an.</Empty>
        ) : sortedGames.length === 0 ? (
          <Empty>Keine Treffer für diese Filter.</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
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
        )}
      </section>

      <section id="vorlagen" className="space-y-3">
        <StudioSectionTitle
          icon={<IconTemplate size={18} />}
          title="Meine Vorlagen"
          description="Ausgangspunkte für neue Projekte — nicht für Live-Events."
        />

        {templates.length === 0 ? (
          <Empty>Noch keine Vorlagen. Speichere ein Spiel im Editor als Vorlage.</Empty>
        ) : (
          <div className="space-y-2">
            {sortedTemplates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
              >
                <Link
                  href={`/admin/games/${template.id}`}
                  className="group flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
                      <IconTemplate size={20} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold">{template.name}</h3>
                        <Chip tone="bg-accent/30 text-accent-foreground">Vorlage</Chip>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {template.description?.trim() || template.slug}
                      </p>
                    </div>
                  </div>
                </Link>

                <StudioButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<IconPlus size={14} />}
                  onClick={() => openCreateForm("template", template.id)}
                >
                  Spiel erstellen
                </StudioButton>

                <button
                  type="button"
                  aria-label={`${template.name} löschen`}
                  onClick={() => openDeleteModal([template.id])}
                  className="tap-lift flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-destructive"
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

function FilterTrack<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (id: T) => void;
  "aria-label": string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex max-w-full flex-wrap rounded-2xl bg-secondary p-1"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`tap-lift rounded-xl px-3 py-1.5 text-xs font-bold sm:px-3.5 ${
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
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
  const queryClient = useQueryClient();
  const [testOpen, setTestOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const canTest = game.status === "published" || game.status === "draft";
  const isIndoor = gameDefaultSurface(game) === "indoor";

  const surfaceChip = surfaceLabelDe(gameDefaultSurface(game));

  return (
    <article
      className={`overflow-hidden rounded-3xl bg-card shadow-soft transition ${
        selected ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <Link
        href={`/admin/games/${game.id}`}
        prefetch
        onMouseEnter={() => void prefetchStudioGame(queryClient, game.id)}
        onFocus={() => void prefetchStudioGame(queryClient, game.id)}
        className="relative block aspect-[2/1] bg-secondary"
        aria-label={`${game.name} öffnen`}
      >
        {game.logo_url?.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.logo_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <IconGamepad size={36} />
          </span>
        )}
      </Link>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StudioSelectCheckbox
            checked={selected}
            onChange={onToggle}
            label={`${game.name} auswählen`}
          />
          <Chip tone="bg-primary/12 text-primary">{surfaceChip}</Chip>
          {game.liveEventCount > 0 ? (
            <Chip tone="bg-success/20 text-success-foreground">Live</Chip>
          ) : null}
          <GameStatusSwitch
            gameId={game.id}
            status={game.status}
            publishedVersionNumber={game.published_version_number}
            liveEventCount={game.liveEventCount}
            compact
          />
        </div>

        <h2 className="mt-3 text-xl font-bold">{game.name}</h2>
        <p className="text-sm text-muted-foreground">
          Version {game.published_version_number} · {game.slug}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/admin/games/${game.id}`}
            prefetch
            onMouseEnter={() => void prefetchStudioGame(queryClient, game.id)}
            onFocus={() => void prefetchStudioGame(queryClient, game.id)}
            className="tap-lift rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Öffnen
          </Link>
          <StudioButton
            type="button"
            size="sm"
            variant="secondary"
            icon={<IconPlay size={16} />}
            disabled={!canTest}
            title={
              canTest
                ? "Testen mit aktuellem Editor-Stand"
                : "Archivierte Spiele können nicht getestet werden"
            }
            onClick={() => setTestOpen(true)}
          >
            Testen
          </StudioButton>
          {isIndoor ? (
            <StudioButton
              type="button"
              size="sm"
              variant="ghost"
              icon={<IconDownload size={16} />}
              onClick={() => setCodesOpen(true)}
            >
              Codes
            </StudioButton>
          ) : null}
          <StudioButton
            type="button"
            size="sm"
            variant="ghost"
            icon={<IconCopy size={16} />}
            onClick={onDuplicate}
          >
            Duplizieren
          </StudioButton>
          <StudioButton
            type="button"
            size="sm"
            variant="outline"
            icon={<IconTrash size={16} />}
            onClick={onDelete}
          >
            Löschen
          </StudioButton>
        </div>
      </div>

      {canTest ? (
        <GameTestPlayModal
          open={testOpen}
          onClose={() => setTestOpen(false)}
          gameId={game.id}
          gameName={game.name}
          publishedVersionNumber={game.published_version_number}
        />
      ) : null}
      {isIndoor ? (
        <GameStationCodesModal
          open={codesOpen}
          onClose={() => setCodesOpen(false)}
          gameId={game.id}
          gameName={game.name}
        />
      ) : null}
    </article>
  );
}
