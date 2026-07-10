"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteTasks,
  getTasksDeleteStatus,
  removeTasksFromLiveGames,
} from "@/app/actions/cms/delete";
import { duplicateTasks } from "@/app/actions/cms/tasks";
import type { TaskDeleteStatus } from "@/lib/cms/delete-status";
import { StudioBadge, StudioPanel } from "@/components/cms/admin-shell";
import { TaskGameUsageButton, TaskGameUsageList } from "@/components/cms/tasks/task-game-usage-modal";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import { StudioBulkBar, StudioSelectCheckbox } from "@/components/cms/shared/studio-bulk-bar";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { StudioDuplicateModal } from "@/components/cms/shared/studio-duplicate-modal";
import {
  IconArrowRight,
  IconCopy,
  IconPuzzle,
  IconSearch,
  IconTrash,
} from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioEmptyState,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSelect,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import {
  useRefreshStudioTasksList,
  useStudioTasksList,
  useTasksUsageMeta,
  type TaskWithUsage,
} from "@/lib/hooks/use-studio-tasks";
import { queryKeys } from "@/lib/platform/query-keys";
import { prefetchStudioTask } from "@/lib/hooks/use-studio-task-detail";
import type { StudioTask } from "@/lib/cms/types";

type TaskSort = "updated" | "created" | "name" | "live";

const SORT_OPTIONS: Array<{ id: TaskSort; label: string }> = [
  { id: "updated", label: "Zuletzt bearbeitet" },
  { id: "created", label: "Zuletzt erstellt" },
  { id: "name", label: "Name (A–Z)" },
  { id: "live", label: "Live zuerst" },
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
        const diff = b.liveGameCount - a.liveGameCount;
        return diff !== 0
          ? diff
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
  initialTasks: StudioTask[];
};

export function TaskLibrary({ initialTasks }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshTasks = useRefreshStudioTasksList();
  const { data: rawTasks = initialTasks } = useStudioTasksList(initialTasks);
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
          gameLinkCount: usage?.totalGameCount ?? 0,
        };
      }),
    [rawTasks, usageByTask],
  );
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteStatuses, setDeleteStatuses] = useState<TaskDeleteStatus[]>([]);
  const [removeLivePending, setRemoveLivePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [sort, setSort] = useState<TaskSort>("updated");

  const tagFilter = searchParams.get("tag") ?? "";
  const liveFilter = searchParams.get("live") ?? "";

  const allTags = useMemo(
    () => [...new Set(tasks.flatMap((t) => t.tags ?? []))].sort(),
    [tasks],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (tagFilter && !task.tags.includes(tagFilter)) return false;
      if (liveFilter === "live" && task.liveGameCount === 0) return false;
      if (liveFilter === "offline" && task.liveGameCount > 0) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.slug.includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [tasks, search, tagFilter, liveFilter]);

  const sortedTasks = useMemo(() => sortTasks(filtered, sort), [filtered, sort]);

  const allSelected =
    sortedTasks.length > 0 && sortedTasks.every((t) => selectedIds.has(t.id));
  const someSelected =
    sortedTasks.some((t) => selectedIds.has(t.id)) && !allSelected;
  const hasLiveBlockers = deleteStatuses.some((s) => s.liveGameLinks.length > 0);

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
    setDeleteIds(ids);
    const result = await getTasksDeleteStatus(ids);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDeleteStatuses(result.data!);
    setDeleteOpen(true);
  }

  async function removeFromLiveGames() {
    setRemoveLivePending(true);
    setDeleteError(null);
    try {
      const blockedIds = deleteStatuses
        .filter((s) => s.liveGameLinks.length > 0)
        .map((s) => s.taskId);
      const result = await removeTasksFromLiveGames(blockedIds);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      const refreshed = await getTasksDeleteStatus(deleteIds);
      if (refreshed.success) setDeleteStatuses(refreshed.data!);
      setMessage("Aufgaben aus laufenden Spielen entfernt — du kannst jetzt löschen.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    } finally {
      setRemoveLivePending(false);
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
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list() });
      const previous = queryClient.getQueryData<StudioTask[]>(queryKeys.tasks.list());
      queryClient.setQueryData<StudioTask[]>(queryKeys.tasks.list(), (old) =>
        (old ?? []).filter((task) => !ids.includes(task.id)),
      );
      return { previous };
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
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.list(), context.previous);
      }
      setDeleteError(err instanceof Error ? err.message : "Löschen fehlgeschlagen.");
    },
  });

  async function confirmDelete() {
    if (hasLiveBlockers) {
      setDeleteError(
        "Entferne die Aufgabe(n) zuerst aus laufenden Spielen oder nutze den Button unten.",
      );
      return;
    }

    setDeleteError(null);
    deleteMutation.mutate(deleteIds);
  }

  const deletePending = deleteMutation.isPending || removeLivePending;
  const duplicatePending = duplicateMutation.isPending;

  function prefetchTask(taskId: string) {
    void prefetchStudioTask(queryClient, taskId);
  }

  const deleteWarnings = useMemo(() => {
    const live = deleteStatuses.filter((s) => s.liveGameLinks.length > 0);
    const allGames = deleteStatuses.flatMap((s) => s.games);
    const uniqueGames = [...new Map(allGames.map((g) => [g.gameId, g])).values()];

    return (
      <>
        {live.length > 0 ? (
          <StudioHint tone="warn">
            {live.length === 1
              ? "1 Aufgabe ist in einem laufenden Spiel."
              : `${live.length} Aufgaben sind in laufenden Spielen.`}{" "}
            Entferne sie im jeweiligen Spiel unter Spiellogik.
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
    <div className="space-y-6 pb-24">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <StudioPanel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <StudioLabel>Suche</StudioLabel>
            <div className="relative">
              <IconSearch
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <StudioInput
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titel, Slug oder Tag…"
              />
            </div>
          </div>
          <div>
            <StudioLabel>Tag</StudioLabel>
            <StudioSelect value={tagFilter} onChange={(e) => pushFilter("tag", e.target.value)}>
              <option value="">Alle</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </StudioSelect>
          </div>
          <div>
            <StudioLabel>Live-Status</StudioLabel>
            <StudioSelect value={liveFilter} onChange={(e) => pushFilter("live", e.target.value)}>
              <option value="">Alle</option>
              <option value="live">In Live-Spielen</option>
              <option value="offline">Nicht live</option>
            </StudioSelect>
          </div>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              router.push("/admin/tasks");
            }}
            className="mt-4 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Filter zurücksetzen
          </button>
        ) : null}
      </StudioPanel>

      {sortedTasks.length === 0 ? (
        <StudioEmptyState
          icon={<IconPuzzle size={32} />}
          title={tasks.length === 0 ? "Noch keine Aufgaben" : "Keine Treffer"}
          description={
            tasks.length === 0
              ? "Erstelle dein erstes Rätsel für die Bibliothek."
              : "Passe die Filter an oder setze sie zurück."
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
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
                  : `${sortedTasks.length} Aufgaben`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="task-sort" className="text-xs font-medium text-slate-500">
                Sortieren
              </label>
              <StudioSelect
                id="task-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as TaskSort)}
                className="w-auto min-w-[200px] py-2 text-sm"
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
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${
                  selectedIds.has(task.id)
                    ? "border-teal-300 bg-teal-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <StudioSelectCheckbox
                  checked={selectedIds.has(task.id)}
                  onChange={(checked) => toggleOne(task.id, checked)}
                  label={`${task.title} auswählen`}
                />

                <TaskTilePreview title={task.title} content={task.content} compact />

                <Link
                  href={`/admin/tasks/${task.id}`}
                  prefetch
                  onMouseEnter={() => prefetchTask(task.id)}
                  onFocus={() => prefetchTask(task.id)}
                  className="group min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-teal-700">
                      {task.title}
                    </h3>
                    <TaskGameUsageButton
                      taskId={task.id}
                      taskTitle={task.title}
                      gameCount={task.gameLinkCount}
                      liveGameCount={task.liveGameCount}
                    />
                    {task.tags.slice(0, 3).map((tag) => (
                      <StudioBadge key={tag}>{tag}</StudioBadge>
                    ))}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                    {task.description || task.slug}
                  </p>
                  {task.tags.length > 3 ? (
                    <p className="mt-1 text-[10px] text-slate-400">
                      +{task.tags.length - 3} weitere Tags
                    </p>
                  ) : null}
                </Link>

                <Link
                  href={`/admin/tasks/${task.id}`}
                  prefetch
                  onMouseEnter={() => prefetchTask(task.id)}
                  onFocus={() => prefetchTask(task.id)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  Bearbeiten
                  <IconArrowRight size={16} />
                </Link>

                <button
                  type="button"
                  aria-label={`${task.title} duplizieren`}
                  onClick={() => openDuplicateModal([task.id])}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                >
                  <IconCopy size={16} />
                </button>

                <button
                  type="button"
                  aria-label={`${task.title} löschen`}
                  onClick={() => openDeleteModal([task.id])}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
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
        warnings={
          <>
            {deleteWarnings}
            {deleteError ? <StudioError message={deleteError} /> : null}
          </>
        }
        extraActions={
          hasLiveBlockers ? (
            <StudioButton
              type="button"
              variant="secondary"
              disabled={deletePending}
              onClick={removeFromLiveGames}
            >
              Aus laufenden Spielen entfernen
            </StudioButton>
          ) : undefined
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
