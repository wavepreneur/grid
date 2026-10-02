"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteGames,
  getGamesDeleteStatus,
  takeGamesOffline,
} from "@/app/actions/cms/delete";
import {
  addGameLocale,
  createGame,
  createGameFromTemplate,
  duplicateGames,
} from "@/app/actions/cms/games";
import { composeGamesFromPacks } from "@/app/actions/cms/packs";
import { PackSearchSelect } from "@/components/cms/packs/pack-search-select";
import { composeGameName, gameUsesLayerPacks } from "@/lib/cms/layer-packs";
import {
  STUDIO_TAB_LOCALES,
  localeFlag,
  localeLabel,
  parseStudioLanguage,
  type StudioLanguage,
} from "@/lib/cms/languages";
import {
  gameLocales,
  hasLaunchCoverage,
  hasStartedIncompleteTranslation,
  isLocaleComplete,
  isLocaleOpen,
  isLocaleStartedIncomplete,
  localeCoverageMap,
} from "@/lib/cms/game-i18n";
import { CollectionPicker } from "@/components/cms/games/collection-picker";
import { GameLanguageCell } from "@/components/cms/games/game-language-cell";
import {
  useInvalidateStudioCollections,
  useStudioCollections,
} from "@/lib/hooks/use-studio-collections";
import type { GameDeleteStatus } from "@/lib/cms/delete-status";
import {
  useGamesLiveMeta,
  useRefreshStudioGamesList,
  useStudioGamesList,
  useStudioTemplates,
} from "@/lib/hooks/use-studio-games";
import { useDebouncedValue } from "@/lib/hooks/use-task-library-search";
import type { GameFilterInput, GameListPage, StudioGame } from "@/lib/cms/types";
import { StudioListSkeleton } from "@/components/cms/studio-list-skeletons";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { queryKeys } from "@/lib/platform/query-keys";
import { prefetchStudioGame } from "@/lib/hooks/use-studio-game-detail";
import { useComposeRecipes } from "@/lib/hooks/use-studio-packs";
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
  IconLanguages,
  IconLive,
  IconMapPin,
  IconPlay,
  IconPlus,
  IconSearch,
  IconStar,
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
import { parseRuntimeProfiles, type ContentMode } from "@/lib/cms/layer-model";
import {
  surfaceDescriptionDe,
  surfaceLabelDe,
  surfaceTaglineDe,
} from "@/lib/cms/game-slots";

type GameWithLive = StudioGame & { liveEventCount: number };

type GameSort = "updated" | "created" | "status" | "name" | "language";
type LanguageFilter = "alle" | StudioLanguage;
type TranslationFilter = "alle" | "open" | "started" | "done";
type SourceFilter = "alle" | "quellen";
type CreateMode = "compose" | "blank" | "template";

const SURFACE_OPTIONS: ContentMode[] = ["outdoor", "indoor", "online"];
const PAGE_SIZES = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

function matchesTranslationFilter(
  game: StudioGame,
  languageTab: LanguageFilter,
  translationTab: TranslationFilter,
): boolean {
  if (languageTab === "alle") {
    if (translationTab === "alle") return true;
    if (translationTab === "open") return !hasLaunchCoverage(game);
    if (translationTab === "started") return hasStartedIncompleteTranslation(game);
    return hasLaunchCoverage(game);
  }
  if (translationTab === "alle") {
    return gameLocales(game).includes(languageTab);
  }
  if (translationTab === "open") return isLocaleOpen(game, languageTab);
  if (translationTab === "started") return isLocaleStartedIncomplete(game, languageTab);
  return isLocaleComplete(game, languageTab);
}

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
  {
    id: "language",
    label: "Sprache",
    description: "Deutsch zuerst, dann weitere",
    icon: <IconLanguages size={15} />,
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
    case "language":
      return next.sort((a, b) => {
        const coverage = Number(hasLaunchCoverage(a)) - Number(hasLaunchCoverage(b));
        if (coverage !== 0) return coverage;
        const count = gameLocales(b).length - gameLocales(a).length;
        if (count !== 0) return count;
        return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
      });
    case "updated":
    default:
      return next.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
  }
}

type Props = {
  initialTemplates?: StudioGame[];
};

export function GameList({ initialTemplates = [] }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgSlug } = useStudioShell();
  const refreshGames = useRefreshStudioGamesList();
  const { data: templates = initialTemplates } = useStudioTemplates(initialTemplates);
  const { data: recipes = [] } = useComposeRecipes();
  const collectionsQuery = useStudioCollections();
  const invalidateCollections = useInvalidateStudioCollections();
  const collectionOverview = collectionsQuery.data;
  const collections = collectionOverview?.collections ?? [];
  const originIds = useMemo(
    () => new Set(recipes.map((recipe) => recipe.origin_game_id).filter((id): id is string => Boolean(id))),
    [recipes],
  );
  const [open, setOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("blank");
  const [name, setName] = useState("");
  const [surface, setSurface] = useState<ContentMode>("outdoor");
  const [templateId, setTemplateId] = useState<string>("");
  const [layer1PackId, setLayer1PackId] = useState<string | null>(null);
  const [layer2PackId, setLayer2PackId] = useState<string | null>(null);
  const [layer3PackId, setLayer3PackId] = useState<string | null>(null);
  const [layer1Label, setLayer1Label] = useState("");
  const [layer2Label, setLayer2Label] = useState("");
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
  const [languageTab, setLanguageTab] = useState<LanguageFilter>("alle");
  const [translationTab, setTranslationTab] = useState<TranslationFilter>("alle");
  const [sourceTab, setSourceTab] = useState<SourceFilter>("alle");
  const [collectionTab, setCollectionTab] = useState<string>("alle");
  const [listView, setListView] = useState<"games" | "cities">("games");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const search = useDebouncedValue(query, 250);
  const listFilters = useMemo<GameFilterInput>(
    () => ({
      page,
      pageSize,
      search,
      status: statusTab,
      language: languageTab === "alle" ? "alle" : languageTab,
      sourceIds: sourceTab === "quellen" ? [...originIds] : undefined,
      collectionId:
        collectionTab === "alle" ? undefined : collectionTab === "none" ? "none" : collectionTab,
      sort,
    }),
    [page, pageSize, search, statusTab, languageTab, sourceTab, originIds, collectionTab, sort],
  );
  const gamesQuery = useStudioGamesList(listFilters);
  const games = gamesQuery.data?.games ?? [];
  const total = gamesQuery.data?.total ?? 0;

  const visibleGames = useMemo(
    () =>
      games.filter((game) => {
        if (surfaceTab !== "alle" && gameDefaultSurface(game) !== surfaceTab) return false;
        return matchesTranslationFilter(game, "alle", translationTab);
      }),
    [games, surfaceTab, translationTab],
  );
  const languageCounts = useMemo(() => {
    const counts: Partial<Record<StudioLanguage, number>> = {};
    for (const locale of STUDIO_TAB_LOCALES) {
      counts[locale] = games.filter((g) => matchesTranslationFilter(g, locale, translationTab)).length;
    }
    return counts;
  }, [games, translationTab]);
  const translationCounts = useMemo(
    () => ({
      open: games.filter((g) => matchesTranslationFilter(g, languageTab, "open")).length,
      started: games.filter((g) => matchesTranslationFilter(g, languageTab, "started")).length,
      done: games.filter((g) => matchesTranslationFilter(g, languageTab, "done")).length,
    }),
    [games, languageTab],
  );
  const sortedTemplates = useMemo(() => sortGames(templates, "updated"), [templates]);
  const selectedCollection =
    collectionTab !== "alle" && collectionTab !== "none"
      ? collections.find((collection) => collection.id === collectionTab) ?? null
      : null;
  const cityRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = (citySlug: string) =>
      !needle || citySlug.toLowerCase().includes(needle.replace(/\s+/g, "-")) || citySlug.toLowerCase().includes(needle);

    if (collectionTab === "none") {
      return (collectionOverview?.unassignedCityCounts ?? []).filter((row) => matches(row.citySlug));
    }
    if (selectedCollection) {
      return selectedCollection.cityCounts.filter((row) => matches(row.citySlug));
    }
    const byCity = new Map<string, { citySlug: string; gameCount: number; parts: string[] }>();
    for (const collection of collections) {
      for (const row of collection.cityCounts) {
        const current = byCity.get(row.citySlug) ?? { citySlug: row.citySlug, gameCount: 0, parts: [] };
        current.gameCount += row.gameCount;
        current.parts.push(`${collection.name} ${row.gameCount}×`);
        byCity.set(row.citySlug, current);
      }
    }
    for (const row of collectionOverview?.unassignedCityCounts ?? []) {
      const current = byCity.get(row.citySlug) ?? { citySlug: row.citySlug, gameCount: 0, parts: [] };
      current.gameCount += row.gameCount;
      current.parts.push(`Ohne Collection ${row.gameCount}×`);
      byCity.set(row.citySlug, current);
    }
    return [...byCity.values()]
      .filter((row) => matches(row.citySlug))
      .sort((a, b) => b.gameCount - a.gameCount || a.citySlug.localeCompare(b.citySlug, "de"));
  }, [collectionOverview, collectionTab, collections, search, selectedCollection]);
  const cityTotal = cityRows.length;
  const cityPageCount = Math.max(1, Math.ceil(cityTotal / pageSize));
  const cityPage = Math.min(page, cityPageCount);
  const visibleCityRows = cityRows.slice((cityPage - 1) * pageSize, cityPage * pageSize);
  const collectionById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections],
  );
  const allCollectionGameCount =
    collections.reduce((sum, collection) => sum + collection.gameCount, 0) +
    (collectionOverview?.unassignedGameCount ?? 0);

  useEffect(() => {
    setPage(1);
  }, [search, statusTab, surfaceTab, sourceTab, languageTab, translationTab, sort, pageSize, collectionTab, listView]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);
  const visibleIds = useMemo(() => visibleGames.map((game) => game.id), [visibleGames]);
  const { data: liveMetaData } = useGamesLiveMeta(visibleIds);
  const liveCountByGame = useMemo(() => {
    const liveMeta = Array.isArray(liveMetaData) ? liveMetaData : [];
    return new Map(liveMeta.map((s) => [s.gameId, s.liveEvents?.length ?? 0]));
  }, [liveMetaData]);
  const visibleWithLive = useMemo(
    () =>
      visibleGames.map((game) => ({
        ...game,
        liveEventCount: liveCountByGame.get(game.id) ?? 0,
      })),
    [visibleGames, liveCountByGame],
  );

  const allSelected =
    visibleWithLive.length > 0 && visibleWithLive.every((g) => selectedIds.has(g.id));
  const someSelected =
    visibleWithLive.some((g) => selectedIds.has(g.id)) && !allSelected;

  const blockedLive = deleteStatuses.filter((s) => s.liveEvents.length > 0);
  const blockedPools = deleteStatuses.filter((s) => s.activeTicketPools > 0);
  const needsOffline = blockedLive.length > 0 || blockedPools.length > 0;

  function openCreateForm(mode: CreateMode = "blank", presetTemplateId?: string) {
    setOpen(true);
    setCreateMode(mode);
    setName("");
    setSurface("outdoor");
    setTemplateId(presetTemplateId ?? templates[0]?.id ?? "");
    setLayer1PackId(null);
    setLayer2PackId(null);
    setLayer3PackId(null);
    setLayer1Label("");
    setLayer2Label("");
    setCollectionId(collections[0]?.id ?? null);
    setError(null);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      if (createMode === "compose") {
        const autoName = name.trim() || composeGameName(layer1Label, layer2Label);
        const result = await composeGamesFromPacks({
          name: autoName,
          surface,
          layer1_pack_id: layer1PackId,
          layer2_pack_id: layer2PackId,
          layer3_pack_id: layer3PackId,
          collection_id: collectionId,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        const createdId = result.data?.createdIds[0];
        if (!createdId) {
          setError("Erstellen fehlgeschlagen.");
          return;
        }
        setOpen(false);
        await refreshGames();
        invalidateCollections();
        router.push(`/admin/games/${createdId}`);
        return;
      }

      if (createMode === "template") {
        if (!templateId) {
          setError("Bitte eine Vorlage auswählen.");
          return;
        }
        const result = await createGameFromTemplate({ templateId, name, collection_id: collectionId });
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
        invalidateCollections();
        router.push(`/admin/games/${result.data.id}`);
        return;
      }

      const result = await createGame({ name, surface, collection_id: collectionId });
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
      invalidateCollections();
      router.push(`/admin/games/${result.data.id}`);
    } finally {
      setCreating(false);
    }
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(visibleWithLive.map((g) => g.id)) : new Set());
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
        queryClient.cancelQueries({ queryKey: queryKeys.games.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.games.templates(orgSlug) }),
      ]);

      const previousLists = queryClient.getQueriesData<GameListPage>({
        queryKey: [...queryKeys.games.all, "list"],
      });
      const previousTemplates = queryClient.getQueryData<StudioGame[]>(
        queryKeys.games.templates(orgSlug),
      );

      queryClient.setQueriesData<GameListPage>(
        { queryKey: [...queryKeys.games.all, "list"] },
        (old) =>
          old?.games
            ? {
                games: old.games.filter((game) => !ids.includes(game.id)),
                total: Math.max(0, old.total - ids.length),
              }
            : old,
      );
      queryClient.setQueryData<StudioGame[]>(queryKeys.games.templates(orgSlug), (old) =>
        (old ?? []).filter((game) => !ids.includes(game.id)),
      );

      return { previousLists, previousTemplates };
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
      for (const [key, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, data);
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
            description="Zuerst spielbar machen. Packs später andocken — Mission nicht kopieren."
          />
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreateMode("compose")}
                className={`tap-lift rounded-2xl px-4 py-2.5 text-sm font-bold ${
                  createMode === "compose"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                Packs andocken
              </button>
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

            {createMode === "compose" ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <StudioLabel hint="Pro Stadt, andockbar an jede Mission">Stadt</StudioLabel>
                  <PackSearchSelect
                    layer={1}
                    value={layer1PackId}
                    onChange={(id, pack) => {
                      setLayer1PackId(id);
                      setLayer1Label(pack?.name ?? pack?.city_slug ?? "");
                    }}
                  />
                </div>
                <div>
                  <StudioLabel hint="Einmal pflegen, alle Städte">Mission</StudioLabel>
                  <PackSearchSelect
                    layer={2}
                    value={layer2PackId}
                    onChange={(id, pack) => {
                      setLayer2PackId(id);
                      setLayer2Label(pack?.name ?? "");
                    }}
                  />
                </div>
                <div>
                  <StudioLabel hint="Bonus / Rollen">Team</StudioLabel>
                  <PackSearchSelect
                    layer={3}
                    value={layer3PackId}
                    onChange={(id) => setLayer3PackId(id)}
                  />
                </div>
              </div>
            ) : null}

            {createMode === "blank" || createMode === "compose" ? (
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
              <StudioLabel>
                {createMode === "compose" ? "Name (optional)" : "Name"}
              </StudioLabel>
              <StudioInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={createMode !== "compose"}
                placeholder={
                  createMode === "compose"
                    ? composeGameName(layer1Label, layer2Label) || "Mission Stadt"
                    : "z. B. Berlin City Quest"
                }
              />
            </div>

            <CollectionPicker
              value={collectionId}
              collections={collections}
              onChange={setCollectionId}
              onCreated={() => invalidateCollections()}
            />

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
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Name, Stadt oder Spiel-Code…"
            className={`${inputCls} mt-0 border-0 bg-secondary pl-11 shadow-none`}
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <FilterTrack
            aria-label="Collection"
            value={collectionTab}
            onChange={setCollectionTab}
            options={[
              { id: "alle", label: "Alle Collections", count: allCollectionGameCount },
              ...collections.map((collection) => ({
                id: collection.id,
                label: collection.name,
                count: collection.gameCount,
                title: `${collection.gameCount} Spiele in ${collection.cityCount} Städten`,
              })),
              ...(collectionOverview && collectionOverview.unassignedGameCount > 0
                ? [
                    {
                      id: "none",
                      label: "Ohne Collection",
                      count: collectionOverview.unassignedGameCount,
                    },
                  ]
                : []),
            ]}
          />
          <FilterTrack
            aria-label="Ansicht"
            value={listView}
            onChange={setListView}
            options={[
              { id: "games", label: "Spiele" },
              {
                id: "cities",
                label: "Städte",
                count: cityTotal,
                title: "Wie oft welches Spiel in einer Stadt vorkommt",
              },
            ]}
          />
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
          <FilterTrack
            aria-label="Hauptspiele"
            value={sourceTab}
            onChange={setSourceTab}
            options={[
              { id: "alle", label: "Alle Spiele" },
              {
                id: "quellen",
                label: "Hauptspiele",
                count: originIds.size,
                title: "Nur Ursprungsspiele der Rezepte — Spielinfo, Layer 2 und 3 gelten für alle Städte",
              },
            ]}
          />
          <FilterTrack
            aria-label="Sprache"
            value={languageTab}
            onChange={setLanguageTab}
            options={[
              { id: "alle", label: "Alle Sprachen" },
              ...STUDIO_TAB_LOCALES.map((locale) => ({
                id: locale,
                label: localeLabel(locale),
                prefix: localeFlag(locale),
                count: translationTab === "alle" ? undefined : languageCounts[locale] ?? 0,
                title: localeLabel(locale),
              })),
            ]}
          />
          <FilterTrack
            aria-label="Übersetzung"
            value={translationTab}
            onChange={setTranslationTab}
            options={[
              { id: "alle", label: "Alle" },
              {
                id: "open",
                label: languageTab === "alle" ? "Launch fehlt" : "Offen",
                count: translationCounts.open,
                title:
                  languageTab === "alle"
                    ? "Deutsch und Englisch noch nicht vollständig"
                    : `${localeLabel(languageTab)} fehlt oder ist unter 100%`,
              },
              {
                id: "started",
                label: "Angefangen",
                count: translationCounts.started,
                title:
                  languageTab === "alle"
                    ? "Übersetzung begonnen, aber noch nicht fertig"
                    : `${localeLabel(languageTab)} angelegt, aber noch nicht fertig`,
              },
              {
                id: "done",
                label: "Fertig",
                count: translationCounts.done,
                title:
                  languageTab === "alle"
                    ? "Deutsch und Englisch vollständig"
                    : `${localeLabel(languageTab)} vollständig`,
              },
            ]}
          />
        </div>
        {(listView === "cities" ? cityTotal > 0 : total > 0) ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <div className="flex items-center gap-3">
              {listView === "games" ? (
                <StudioSelectCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                  label="Alle auf dieser Seite auswählen"
                />
              ) : null}
              <span className="text-sm text-muted-foreground">
                {listView === "cities"
                  ? selectedCollection
                    ? `${selectedCollection.gameCount} Spiele in ${cityTotal} Städten`
                    : collectionTab === "none"
                      ? `${collectionOverview?.unassignedGameCount ?? 0} Spiele in ${cityTotal} Städten`
                      : `${allCollectionGameCount} Spiele in ${cityTotal} Städten`
                  : selectedIds.size > 0
                    ? `${selectedIds.size} ausgewählt`
                    : `${total} Spiele`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-border bg-card p-1 shadow-soft" role="group" aria-label="Einträge pro Seite">
                {PAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setPage(1);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold tabular-nums ${
                      pageSize === size ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <StudioSortMenu value={sort} options={SORT_OPTIONS} onChange={setSort} />
            </div>
          </div>
        ) : null}
      </div>

      <section>
        {listView === "cities" ? (
          cityTotal === 0 ? (
            <Empty>Keine Städte für diese Collection.</Empty>
          ) : (
            <>
              <ul className="space-y-2">
                {visibleCityRows.map((row) => (
                  <li key={row.citySlug}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(row.citySlug === "ohne-stadt" ? "" : row.citySlug);
                        setListView("games");
                        setPage(1);
                      }}
                      className="tap-lift flex w-full items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-soft"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {row.citySlug === "ohne-stadt" ? "Ohne Stadt" : row.citySlug}
                        </span>
                        {"parts" in row && Array.isArray(row.parts) && row.parts.length > 0 ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {row.parts.join(" · ")}
                          </span>
                        ) : selectedCollection ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {selectedCollection.name}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {row.gameCount}×
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {(cityPage - 1) * pageSize + 1}–{Math.min(cityPage * pageSize, cityTotal)} von {cityTotal} Städten
                </p>
                <div className="flex items-center gap-2">
                  <StudioButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={cityPage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Zurück
                  </StudioButton>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    Seite {cityPage} / {cityPageCount}
                  </span>
                  <StudioButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={cityPage >= cityPageCount}
                    onClick={() => setPage((value) => Math.min(cityPageCount, value + 1))}
                  >
                    Weiter
                  </StudioButton>
                </div>
              </div>
            </>
          )
        ) : gamesQuery.isPending && games.length === 0 ? (
          <StudioListSkeleton rows={5} />
        ) : total === 0 ? (
          <Empty>Noch keine Spiele. Lege oben ein neues an.</Empty>
        ) : visibleGames.length === 0 ? (
          <Empty>Keine Treffer für diese Filter.</Empty>
        ) : (
          <>
            <ul className="space-y-3">
              {visibleWithLive.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  collectionName={
                    game.collection_id ? collectionById.get(game.collection_id)?.name ?? null : null
                  }
                  isOrigin={originIds.has(game.id)}
                  selected={selectedIds.has(game.id)}
                  onToggle={(checked) => toggleOne(game.id, checked)}
                  onDuplicate={() => openDuplicateModal([game.id])}
                  onDelete={() => openDeleteModal([game.id])}
                />
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                {rangeStart}–{rangeEnd} von {total}
                {query.trim() ? " Treffern" : ""}
              </p>
              <div className="flex items-center gap-2">
                <StudioButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Zurück
                </StudioButton>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  Seite {currentPage} / {pageCount}
                </span>
                <StudioButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                >
                  Weiter
                </StudioButton>
              </div>
            </div>
          </>
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
        extra={
          duplicateIds.some((id) => {
            const game = games.find((entry) => entry.id === id);
            return game ? gameUsesLayerPacks(game) : false;
          }) ? (
            <p className="mt-3 text-sm text-slate-600">
              Zusammengesteckte Spiele kopieren nur die drei Pack-Verweise. Layer 2 und 3 werden
              nicht vervielfacht — für eine neue Stadt das Stadt-Pack tauschen.
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Legacy-Spiele ohne Packs kopieren weiterhin alle Aufgaben-Verknüpfungen.
            </p>
          )
        }
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
  options: ReadonlyArray<{
    id: T;
    label: string;
    prefix?: string;
    count?: number;
    title?: string;
  }>;
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
            title={opt.title}
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`tap-lift inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold sm:px-3.5 ${
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.prefix ? (
              <span className="text-[0.95rem] leading-none" aria-hidden>
                {opt.prefix}
              </span>
            ) : null}
            {opt.label}
            {typeof opt.count === "number" ? (
              <span
                className={`tabular-nums ${
                  active ? "text-muted-foreground" : "text-muted-foreground/80"
                }`}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function GameLanguageBadges({ game }: { game: StudioGame }) {
  const router = useRouter();
  const refreshGames = useRefreshStudioGamesList();
  const [adding, setAdding] = useState(false);

  return (
    <GameLanguageCell
      gameId={game.id}
      locales={gameLocales(game)}
      sourceLocale={parseStudioLanguage(game.language)}
      coverageByLocale={localeCoverageMap(game)}
      variant="comfortable"
      adding={adding}
      onAdd={(language) => {
        setAdding(true);
        void addGameLocale(game.id, language).then((result) => {
          setAdding(false);
          if (!result.success) return;
          router.push(`/admin/games/${game.id}?lang=${language}`);
          void refreshGames();
        });
      }}
    />
  );
}

function formatListDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

function GameRow({
  game,
  collectionName,
  isOrigin,
  selected,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  game: GameWithLive;
  collectionName: string | null;
  isOrigin: boolean;
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
  const surface = gameDefaultSurface(game);
  const surfaceChip = surfaceLabelDe(surface);
  const city = game.city_slug?.trim() || "";
  const openHref = `/admin/games/${game.id}`;

  function prefetch() {
    void prefetchStudioGame(queryClient, game.id);
  }

  const meta = [
    surfaceChip,
    game.slug,
    city || null,
    `v${game.published_version_number}`,
    formatListDate(game.updated_at),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={`rounded-2xl shadow-soft ${
        selected ? "bg-primary/5 ring-1 ring-primary/20" : "bg-card"
      }`}
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="shrink-0 pt-1">
          <StudioSelectCheckbox
            checked={selected}
            onChange={onToggle}
            label={`${game.name} auswählen`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <Link
              href={openHref}
              prefetch
              onMouseEnter={prefetch}
              onFocus={prefetch}
              className="min-w-0 flex-1"
            >
              <div className="flex items-start gap-3">
                {game.logo_url?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.logo_url}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                    <IconGamepad size={20} />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold leading-snug text-foreground sm:text-lg">
                      {game.name}
                    </h2>
                    {collectionName ? (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {collectionName}
                      </span>
                    ) : null}
                    {isOrigin ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800"
                        title="Hauptspiel des Rezepts — Spielinfo, Layer 2 und 3 gelten für alle Städte"
                      >
                        <IconStar size={12} className="fill-amber-500 text-amber-500" />
                        Hauptspiel
                      </span>
                    ) : null}
                    {game.liveEventCount > 0 ? (
                      <Chip tone="bg-success/20 text-success-foreground">Live</Chip>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
                </div>
              </div>
            </Link>

            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
              {game.status === "archived" ? (
                <Chip tone="bg-secondary text-muted-foreground">Archiv</Chip>
              ) : (
                <GameStatusSwitch
                  gameId={game.id}
                  status={game.status}
                  publishedVersionNumber={game.published_version_number}
                  liveEventCount={game.liveEventCount}
                />
              )}
              <Link
                href={openHref}
                prefetch
                onMouseEnter={prefetch}
                onFocus={prefetch}
                className="tap-lift inline-flex h-9 items-center rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground"
              >
                Öffnen
              </Link>
              <button
                type="button"
                disabled={!canTest}
                title={canTest ? "Testen" : "Archivierte Spiele können nicht getestet werden"}
                aria-label={`${game.name} testen`}
                onClick={() => setTestOpen(true)}
                className="tap-lift inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
              >
                <IconPlay size={16} />
              </button>
              {isIndoor ? (
                <button
                  type="button"
                  title="Stationscodes"
                  aria-label={`${game.name} Codes`}
                  onClick={() => setCodesOpen(true)}
                  className="tap-lift inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <IconDownload size={16} />
                </button>
              ) : null}
              <button
                type="button"
                title="Duplizieren"
                aria-label={`${game.name} duplizieren`}
                onClick={onDuplicate}
                className="tap-lift inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <IconCopy size={16} />
              </button>
              <button
                type="button"
                title="Löschen"
                aria-label={`${game.name} löschen`}
                onClick={onDelete}
                className="tap-lift inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-destructive"
              >
                <IconTrash size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-border/60 pt-3">
            <GameLanguageBadges game={game} />
          </div>
        </div>
      </div>

      {testOpen && canTest ? (
        <GameTestPlayModal
          open={testOpen}
          onClose={() => setTestOpen(false)}
          gameId={game.id}
          gameName={game.name}
          publishedVersionNumber={game.published_version_number}
          locales={gameLocales(game)}
          defaultLanguage={parseStudioLanguage(game.language)}
        />
      ) : null}
      {codesOpen && isIndoor ? (
        <GameStationCodesModal
          open={codesOpen}
          onClose={() => setCodesOpen(false)}
          gameId={game.id}
          gameName={game.name}
        />
      ) : null}
    </li>
  );
}
