"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteTasks,
  getTasksDeleteStatus,
} from "@/app/actions/cms/delete";
import { duplicateTasks } from "@/app/actions/cms/tasks";
import type { TaskDeleteStatus } from "@/lib/cms/delete-status";
import { TaskGameUsageButton, TaskGameUsageList } from "@/components/cms/tasks/task-game-usage-modal";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import { StudioBulkBar, StudioSelectCheckbox } from "@/components/cms/shared/studio-bulk-bar";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { StudioDuplicateModal } from "@/components/cms/shared/studio-duplicate-modal";
import { StudioSortMenu, type StudioSortOption } from "@/components/cms/shared/studio-sort-menu";
import {
  IconAlpha,
  IconCalendar,
  IconClock,
  IconCopy,
  IconLayers,
  IconLive,
  IconSearch,
  IconTrash,
} from "@/components/cms/studio-icons";
import { Chip, Empty, inputCls } from "@/components/cms/ui";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import {
  taskListQueryKey,
  useRefreshStudioTasksList,
  useStudioTasksList,
  useTasksUsageMeta,
  type TaskWithUsage,
} from "@/lib/hooks/use-studio-tasks";
import type { StudioTask, TaskListPage } from "@/lib/cms/types";
import { useDebouncedValue, useTaskLibraryTags } from "@/lib/hooks/use-task-library-search";
import { StudioListSkeleton } from "@/components/cms/studio-list-skeletons";
import { useStudioShell } from "@/components/cms/studio-shell-provider";
import { useStudioConfirm } from "@/components/cms/shared/studio-confirm";
import { queryKeys } from "@/lib/platform/query-keys";
import { prefetchStudioTask } from "@/lib/hooks/use-studio-task-detail";

type TaskSort = "updated" | "created" | "name" | "live";
const PAGE_SIZES = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

const SORT_OPTIONS: Array<StudioSortOption<TaskSort>> = [
  {
    id: "updated",
    label: "Zuletzt bearbeitet",
    description: "Neueste Änderungen zuerst",
    icon: <IconClock size={15} />,
  },
  {
    id: "created",
    label: "Zuletzt erstellt",
    description: "Neue Aufgaben zuerst",
    icon: <IconCalendar size={15} />,
  },
  {
    id: "name",
    label: "Name (A–Z)",
    description: "Alphabetisch nach Titel",
    icon: <IconAlpha size={15} />,
  },
  {
    id: "live",
    label: "Veröffentlicht zuerst",
    description: "In veröffentlichten Spielen oben",
    icon: <IconLive size={15} />,
  },
];

function sortTasks(list: TaskWithUsage[], sort: TaskSort): TaskWithUsage[] {
  const next = [...list];
  switch (sort) {
    case "created":
      return next.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "name":
      return next.sort((a, b) =>
        a.title.localeCompare(b.title, "de", { sensitivity: "base" }),
      );
    case "live":
      return next.sort((a, b) => {
        const pubDiff = b.publishedGameCount - a.publishedGameCount;
        if (pubDiff !== 0) return pubDiff;
        const liveDiff = b.liveGameCount - a.liveGameCount;
        return liveDiff !== 0
          ? liveDiff
          : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    case "updated":
    default:
      return next.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
  }
}

type Props = {
  initialTasks?: StudioTask[];
};

export function TaskLibrary(_props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgSlug } = useStudioShell();
  const { alert } = useStudioConfirm();
  const refreshTasks = useRefreshStudioTasksList();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteStatuses, setDeleteStatuses] = useState<TaskDeleteStatus[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [sort, setSort] = useState<TaskSort>("updated");

  const tagFilter = searchParams.get("tag") ?? "";
  const liveFilter = searchParams.get("live") ?? "";
  const debouncedSearch = useDebouncedValue(search, 250);
  const serverSort = sort === "live" ? "updated" : sort;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tagFilter, sort, pageSize]);

  const listFilters = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      tag: tagFilter,
      sort: serverSort,
    }),
    [page, pageSize, debouncedSearch, tagFilter, serverSort],
  );
  const { data: pageData, isPending } = useStudioTasksList(listFilters);
  const rawTasks = pageData?.tasks ?? [];
  const total = pageData?.total ?? 0;
  const { data: tagIndex } = useTaskLibraryTags();
  const allTags = tagIndex?.tags ?? [];
  const taskIds = useMemo(() => rawTasks.map((t) => t.id), [rawTasks]);
  const { data: usageMeta = [] } = useTasksUsageMeta(taskIds);
  const usageByTask = useMemo(
    () => new Map(usageMeta.map((u) => [u.taskId, u])),
    [usageMeta],
  );
  const tasks = useMemo<TaskWithUsage[]>(
    () =>
      rawTasks.map((task) => {
        const usage = usageByTask.get(task.id);
        return {
          ...task,
          liveGameCount: usage?.liveGameCount ?? 0,
          publishedGameCount: usage?.publishedGameCount ?? 0,
          gameLinkCount: usage?.totalGameCount ?? 0,
        };
      }),
    [rawTasks, usageByTask],
  );

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (liveFilter === "live" && task.publishedGameCount === 0) return false;
      if (liveFilter === "offline" && task.publishedGameCount > 0) return false;
      return true;
    });
  }, [tasks, liveFilter]);

  const sortedTasks = useMemo(() => sortTasks(filtered, sort), [filtered, sort]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, currentPage * pageSize);

  const allSelected =
    sortedTasks.length > 0 && sortedTasks.every((t) => selectedIds.has(t.id));
  const someSelected =
    sortedTasks.some((t) => selectedIds.has(t.id)) && !allSelected;
  const hasDeleteBlockers = deleteStatuses.some((s) => !s.canDelete);

  function pushFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/tasks?${params.toString()}`);
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(sortedTasks.map((t) => t.id)) : new Set());
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
    setError(null);
    setDeleteIds(ids);
    try {
      const result = await getTasksDeleteStatus(ids);
      if (!result.success) {
        setError(result.error);
        await alert({
          title: "Löschen nicht möglich",
          description: result.error || "Löschstatus konnte nicht geladen werden.",
        });
        return;
      }
      setDeleteStatuses(result.data!);
      setDeleteOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Löschstatus konnte nicht geladen werden.";
      setError(message);
      await alert({ title: "Löschen nicht möglich", description: message });
    }
  }

  function openDuplicateModal(ids: string[]) {
    setDuplicateIds(ids);
    setDuplicateOpen(true);
  }

  const duplicateMutation = useMutation({
    mutationFn: async ({ ids, count }: { ids: string[]; count: number }) => {
      const result = await duplicateTasks(ids, count);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: async (data) => {
      setDuplicateOpen(false);
      setSelectedIds(new Set());
      setMessage(
        data.createdCount === 1
          ? "Aufgabe dupliziert."
          : `${data.createdCount} Aufgaben dupliziert.`,
      );
      await refreshTasks();
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
    mutationFn: async (ids: string[]) => {
      const result = await deleteTasks(ids);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onMutate: async (ids) => {
      const key = taskListQueryKey(orgSlug, listFilters);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TaskListPage>(key);
      queryClient.setQueryData<TaskListPage>(key, (old) =>
        old
          ? {
              tasks: old.tasks.filter((task) => !ids.includes(task.id)),
              total: Math.max(0, old.total - ids.length),
            }
          : old,
      );
      return { previous, key };
    },
    onSuccess: (data, ids) => {
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
            ? "Aufgabe gelöscht."
            : `${data.deletedIds.length} Aufgaben gelöscht.`,
        );
      }
      if (data.failed.length > 0) {
        setError(`${data.failed.length} Aufgabe(n) konnten nicht gelöscht werden.`);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    onError: (err, _ids, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
      setDeleteError(err instanceof Error ? err.message : "Löschen fehlgeschlagen.");
    },
  });

  async function confirmDelete() {
    if (hasDeleteBlockers) {
      setDeleteError(
        "Lösche zuerst die Spiele, in denen die Aufgabe noch eingebunden ist (auch als Einstiegsfrage).",
      );
      return;
    }

    setDeleteError(null);
    deleteMutation.mutate(deleteIds);
  }

  const deletePending = deleteMutation.isPending;
  const duplicatePending = duplicateMutation.isPending;

  function prefetchTask(taskId: string) {
    void prefetchStudioTask(queryClient, taskId);
  }

  const deleteWarnings = useMemo(() => {
    const blocked = deleteStatuses.filter((s) => !s.canDelete);
    const allGames = deleteStatuses.flatMap((s) => s.games);
    const uniqueGames = [...new Map(allGames.map((g) => [g.linkId, g])).values()];

    return (
      <>
        {blocked.length > 0 ? (
          <StudioHint tone="warn">
            {blocked.length === 1
              ? "Diese Aufgabe ist noch in Spielen eingebunden (Aufgabe oder Einstiegsfrage)."
              : `${blocked.length} Aufgaben sind noch in Spielen eingebunden.`}{" "}
            Lösche zuerst die betroffenen Spiele — danach ist endgültiges Löschen möglich.
          </StudioHint>
        ) : null}
        {uniqueGames.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Eingebunden in
            </p>
            <TaskGameUsageList games={uniqueGames} />
          </div>
        ) : null}
      </>
    );
  }, [deleteStatuses]);

  const hasActiveFilters = Boolean(tagFilter || liveFilter || search.trim());

  return (
    <div className="space-y-7 pb-24">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <div className="space-y-3">
        <div className="relative max-w-xl">
          <IconSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Aufgabe, Frage oder Schlagwort suchen…"
            className={`${inputCls} mt-0 pl-11`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["", "Alle"],
              ["live", "In veröffentlichten Spielen"],
              ["offline", "Nicht veröffentlicht"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id || "all"}
              type="button"
              onClick={() => pushFilter("live", id)}
              className={`tap-lift rounded-full px-4 py-2 text-sm font-bold ${
                liveFilter === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {allTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Schlagworte
            </span>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pushFilter("tag", tagFilter === t ? "" : t)}
                className={`tap-lift rounded-full px-3 py-1 text-xs font-bold ${
                  tagFilter === t
                    ? "bg-foreground text-background"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        ) : null}

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              router.push("/admin/tasks");
            }}
            className="text-sm font-bold text-primary"
          >
            Filter zurücksetzen
          </button>
        ) : null}
      </div>

      {isPending && rawTasks.length === 0 ? (
        <StudioListSkeleton rows={6} />
      ) : sortedTasks.length === 0 ? (
        <Empty>
          {total === 0
            ? "Keine Aufgabe gefunden. Lege oben eine neue an."
            : "Keine Treffer für diese Filter."}
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                  : `${total} Aufgaben`}
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
              <StudioSortMenu
                value={sort}
                options={SORT_OPTIONS}
                onChange={setSort}
              />
            </div>
          </div>

          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <article
                key={task.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-card p-3 shadow-soft ${
                  selectedIds.has(task.id) ? "ring-2 ring-primary/40" : ""
                }`}
              >
                <StudioSelectCheckbox
                  checked={selectedIds.has(task.id)}
                  onChange={(checked) => toggleOne(task.id, checked)}
                  label={`${task.title} auswählen`}
                />

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <TaskTilePreview title={task.title} content={task.content} compact />
                    <h2 className="truncate text-base font-bold">{task.title || "Ohne Titel"}</h2>
                    {task.publishedGameCount > 0 ? (
                      <Chip tone="bg-success/20 text-success-foreground">Veröffentlicht</Chip>
                    ) : null}
                    {task.liveGameCount > 0 ? (
                      <Chip tone="bg-primary/12 text-primary">Live-Event</Chip>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {task.description || task.slug || "Noch keine Beschreibung."}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <IconLayers className="h-3.5 w-3.5" />{" "}
                      {Array.isArray((task.content as { tiles?: unknown[] } | null)?.tiles)
                        ? ((task.content as { tiles: unknown[] }).tiles.length)
                        : 0}{" "}
                      Kacheln
                    </span>
                    <TaskGameUsageButton
                      taskId={task.id}
                      taskTitle={task.title}
                      gameCount={task.gameLinkCount}
                      publishedGameCount={task.publishedGameCount}
                      liveGameCount={task.liveGameCount}
                    />
                    {task.tags.slice(0, 3).map((tag) => (
                      <Chip key={tag}>{tag}</Chip>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/tasks/${task.id}`}
                    prefetch
                    onMouseEnter={() => prefetchTask(task.id)}
                    onFocus={() => prefetchTask(task.id)}
                    className="tap-lift rounded-2xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
                  >
                    Bearbeiten
                  </Link>
                  <StudioButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={<IconCopy size={16} />}
                    onClick={() => openDuplicateModal([task.id])}
                  >
                    Duplizieren
                  </StudioButton>
                  <StudioButton
                    type="button"
                    size="sm"
                    variant={task.gameLinkCount > 0 ? "outline" : "danger"}
                    icon={<IconTrash size={16} />}
                    onClick={() => openDeleteModal([task.id])}
                  >
                    {task.gameLinkCount > 0 ? "Verknüpft" : "Löschen"}
                  </StudioButton>
                </div>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold tabular-nums text-muted-foreground">
              {rangeStart}–{rangeEnd} von {total}
              {debouncedSearch.trim() || tagFilter ? " Treffern" : ""}
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

      <StudioBulkBar
        count={selectedIds.size}
        label={selectedIds.size === 1 ? "Aufgabe ausgewählt" : "Aufgaben ausgewählt"}
        pending={deletePending || duplicatePending}
        onClear={() => setSelectedIds(new Set())}
        onDuplicate={() => openDuplicateModal([...selectedIds])}
        onDelete={() => openDeleteModal([...selectedIds])}
      />

      <StudioDuplicateModal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        itemLabel={duplicateIds.length === 1 ? "Aufgabe" : "Aufgaben"}
        selectedCount={duplicateIds.length}
        pending={duplicatePending}
        onConfirm={confirmDuplicate}
      />

      <StudioDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Aufgaben löschen?"
        count={deleteIds.length}
        itemLabel={deleteIds.length === 1 ? "Aufgabe" : "Aufgaben"}
        pending={deletePending}
        confirmDisabled={hasDeleteBlockers}
        warnings={
          <>
            {deleteWarnings}
            {deleteError ? <StudioError message={deleteError} /> : null}
          </>
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
