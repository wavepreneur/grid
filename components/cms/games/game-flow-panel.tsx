"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addTaskToGame,
  removeTaskFromGame,
  reorderGameTasks,
  updateGameTaskLocation,
} from "@/app/actions/cms/games";
import { updateGameLogicRules } from "@/app/actions/cms/logic";
import {
  buildFlowRules,
  detectLogicFlowMode,
  findEndGameTaskId,
  parseLogicRules,
  type LogicFlowMode,
} from "@/lib/cms/logic-rules";
import { defaultMapCenter, parseGpsOverride, type GpsPin } from "@/lib/cms/gps-defaults";
import { StudioPanel } from "@/components/cms/admin-shell";
import { GpsWaypointPicker } from "@/components/cms/gps/gps-waypoint-picker";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import {
  IconChevronDown,
  IconEdit,
  IconGrip,
  IconInfo,
  IconMapPin,
  IconPlus,
  IconPuzzle,
  IconSave,
  IconSearch,
  IconTrash,
} from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioChip,
  StudioEmptyState,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import type { StudioGameTaskLink, StudioTask } from "@/lib/cms/types";

type Props = {
  gameId: string;
  language: "de" | "en";
  gpsEnabled: boolean;
  citySlug?: string | null;
  initialLinks: StudioGameTaskLink[];
  initialRules: unknown[];
  libraryTasks: StudioTask[];
};

const MODE_OPTIONS: Array<{
  id: LogicFlowMode;
  labelDe: string;
  labelEn: string;
  hintDe: string;
  hintEn: string;
}> = [
  {
    id: "linear",
    labelDe: "Der Reihe nach",
    labelEn: "Linear",
    hintDe: "Aufgaben nacheinander — per Drag & Drop sortieren",
    hintEn: "Tasks one after another — drag to reorder",
  },
  {
    id: "rogain",
    labelDe: "Rogain",
    labelEn: "Rogain",
    hintDe: "Alle sichtbar — gelöste Aufgabe verschwindet für alle Teams",
    hintEn: "All visible — solved tasks disappear for every team",
  },
  {
    id: "open",
    labelDe: "Alle offen",
    labelEn: "All open",
    hintDe: "Alle Aufgaben von Anfang an frei wählbar",
    hintEn: "All tasks available from the start",
  },
];

export function GameFlowPanel({
  gameId,
  language,
  gpsEnabled,
  citySlug,
  initialLinks,
  initialRules,
  libraryTasks,
}: Props) {
  const router = useRouter();
  const parsedInitialRules = useMemo(() => parseLogicRules(initialRules), [initialRules]);

  const [links, setLinks] = useState(() => sortLinksByOrder(initialLinks));
  const [mode, setMode] = useState<LogicFlowMode>(() => {
    const detected = detectLogicFlowMode(parsedInitialRules, initialLinks);
    return detected === "custom" ? "linear" : detected;
  });
  const [endTaskId, setEndTaskId] = useState<string | null>(() =>
    findEndGameTaskId(parsedInitialRules),
  );
  const [endEnabled, setEndEnabled] = useState(() => !!findEndGameTaskId(parsedInitialRules));
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [expandedGpsLinkId, setExpandedGpsLinkId] = useState<string | null>(null);
  const [gpsDrafts, setGpsDrafts] = useState<Record<string, GpsPin>>({});

  const mapDefault = useMemo(() => defaultMapCenter(citySlug), [citySlug]);
  const de = language === "de";

  useEffect(() => {
    setLinks(sortLinksByOrder(initialLinks));
  }, [initialLinks]);

  const orderedLinks = links;
  const assignedIds = useMemo(() => new Set(links.map((l) => l.task_id)), [links]);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return libraryTasks.filter((task) => {
      if (assignedIds.has(task.id)) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.slug.includes(q) ||
        task.description.toLowerCase().includes(q)
      );
    });
  }, [libraryTasks, assignedIds, search]);

  const modeHint = MODE_OPTIONS.find((m) => m.id === mode);
  const hint = de ? modeHint?.hintDe : modeHint?.hintEn;

  const saveFlow = useCallback(
    async (
      nextLinks: StudioGameTaskLink[],
      nextMode: LogicFlowMode,
      endId: string | null,
      withEnd: boolean,
    ) => {
      const resolvedEnd =
        withEnd && nextLinks.length > 0
          ? endId ?? nextLinks[nextLinks.length - 1].task_id
          : null;
      const rules = buildFlowRules(nextMode, nextLinks, { endTaskId: resolvedEnd });
      const logicResult = await updateGameLogicRules(gameId, rules);
      if (!logicResult.success) {
        setError(logicResult.error);
        return false;
      }
      setMessage(
        de
          ? `${nextLinks.length} Aufgaben gespeichert.`
          : `Flow saved (${nextLinks.length} tasks).`,
      );
      return true;
    },
    [gameId, de],
  );

  function runFlowUpdate(
    nextLinks: StudioGameTaskLink[],
    nextMode: LogicFlowMode,
    endId: string | null,
    withEnd: boolean,
  ) {
    setError(null);
    startTransition(async () => {
      const ok = await saveFlow(nextLinks, nextMode, endId, withEnd);
      if (ok) router.refresh();
    });
  }

  function applyMode(nextMode: LogicFlowMode) {
    setMode(nextMode);
    runFlowUpdate(links, nextMode, endTaskId, endEnabled);
  }

  function toggleEnd(enabled: boolean) {
    setEndEnabled(enabled);
    runFlowUpdate(links, mode, endTaskId, enabled);
  }

  function setEndTask(taskId: string) {
    setEndTaskId(taskId);
    runFlowUpdate(links, mode, taskId, endEnabled);
  }

  function handleAdd(taskId: string) {
    setError(null);
    startTransition(async () => {
      const result = await addTaskToGame(gameId, taskId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const next = [...links, result.data!];
      setLinks(next);
      const ok = await saveFlow(next, mode, endTaskId, endEnabled);
      if (ok) router.refresh();
    });
  }

  function handleRemove(linkId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeTaskFromGame(linkId, gameId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const next = links.filter((l) => l.id !== linkId);
      setLinks(next);
      const ok = await saveFlow(next, mode, endTaskId, endEnabled);
      if (ok) router.refresh();
    });
  }

  function commitReorder(next: StudioGameTaskLink[]) {
    const nextWithOrder = withSortOrder(next);
    setLinks(nextWithOrder);
    setError(null);
    startTransition(async () => {
      const orderResult = await reorderGameTasks(
        gameId,
        nextWithOrder.map((l) => l.id),
      );
      if (!orderResult.success) {
        setError(orderResult.error);
        setLinks(sortLinksByOrder(initialLinks));
        return;
      }
      const ok = await saveFlow(nextWithOrder, mode, endTaskId, endEnabled);
      if (ok) router.refresh();
    });
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const next = [...orderedLinks];
    const [item] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, item);
    setDragIndex(null);
    setDropIndex(null);
    commitReorder(next);
  }

  function getLinkGps(link: StudioGameTaskLink): GpsPin | null {
    return parseGpsOverride(link.overrides?.location ?? link.overrides?.gps);
  }

  function getGpsDraft(link: StudioGameTaskLink): GpsPin {
    return gpsDrafts[link.id] ?? getLinkGps(link) ?? mapDefault;
  }

  function saveGps(link: StudioGameTaskLink) {
    const pin = getGpsDraft(link);
    setError(null);
    startTransition(async () => {
      const result = await updateGameTaskLocation(gameId, link.id, pin);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLinks((prev) => prev.map((l) => (l.id === link.id ? result.data! : l)));
      setMessage(
        de
          ? `Wegpunkt für „${link.task.title}" gespeichert (${pin.radius_meters} m).`
          : `Waypoint saved for “${link.task.title}” (${pin.radius_meters} m).`,
      );
      router.refresh();
    });
  }

  const missingGpsCount = gpsEnabled
    ? orderedLinks.filter((l) => !getLinkGps(l)).length
    : 0;

  const returnTo = encodeURIComponent(`/admin/games/${gameId}`);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <StudioPanel>
        <StudioSectionTitle
          title={de ? "Spielablauf" : "Game flow"}
          description={
            de
              ? "Aufgaben hinzufügen, sortieren und Ablauf wählen — wird automatisch gespeichert."
              : "Add tasks, reorder and pick flow — saves automatically."
          }
          action={
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {orderedLinks.length} {de ? "Aufgaben" : "tasks"}
            </span>
          }
        />

        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-500">
            {de ? "Ablauf-Modus" : "Flow mode"}
          </p>
          <div className="flex flex-wrap gap-2">
            {MODE_OPTIONS.map((opt) => (
              <StudioChip
                key={opt.id}
                active={mode === opt.id}
                disabled={pending}
                onClick={() => applyMode(opt.id)}
              >
                {de ? opt.labelDe : opt.labelEn}
              </StudioChip>
            ))}
          </div>
        </div>

        {hint ? (
          <StudioHint icon={<IconInfo size={16} />} tone="info">
            {hint}
          </StudioHint>
        ) : null}

        {gpsEnabled && orderedLinks.length > 0 ? (
          <div className="mt-4">
            <StudioHint
              icon={<IconMapPin size={16} />}
              tone={missingGpsCount > 0 ? "warn" : "info"}
            >
              {de
                ? "GPS-Spiel: Setze für jede Aufgabe einen Wegpunkt auf der Karte."
                : "GPS game: set a map waypoint for each task."}
              {missingGpsCount > 0 ? (
                <span className="font-medium">
                  {" "}
                  · {missingGpsCount} {de ? "ohne Wegpunkt" : "missing"}
                </span>
              ) : null}
            </StudioHint>
          </div>
        ) : null}

        {orderedLinks.length > 0 ? (
          <label className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={endEnabled}
              disabled={pending}
              onChange={(e) => toggleEnd(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>{de ? "Spiel endet nach" : "End game after"}</span>
            <select
              disabled={!endEnabled || pending}
              value={endTaskId ?? orderedLinks[orderedLinks.length - 1]?.task_id ?? ""}
              onChange={(e) => setEndTask(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              {orderedLinks.map((link, index) => (
                <option key={link.id} value={link.task_id}>
                  {index + 1}. {link.task.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? <div className="mt-4"><StudioError message={error} /></div> : null}
        {message ? <div className="mt-4"><StudioSuccess message={message} /></div> : null}

        <div className="mt-6">
          {orderedLinks.length === 0 ? (
            <StudioEmptyState
              icon={<IconPuzzle size={28} />}
              title={de ? "Noch keine Aufgaben" : "No tasks yet"}
              description={
                de
                  ? "Wähle rechts aus der Bibliothek eine Aufgabe aus."
                  : "Pick a task from the library on the right."
              }
            />
          ) : (
            <ol className="space-y-0">
              {orderedLinks.map((link, index) => (
                <li key={link.id}>
                  {mode === "linear" && index > 0 ? (
                    <div className="flex items-center gap-2 py-1.5 pl-8 text-xs text-slate-400">
                      <IconChevronDown size={14} />
                      {de ? "wird freigeschaltet" : "unlocks next"}
                    </div>
                  ) : null}
                  <div
                    onDragOver={(e) => {
                      if (mode !== "linear") return;
                      e.preventDefault();
                      setDropIndex(index);
                    }}
                    onDragLeave={() => setDropIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(index);
                    }}
                    className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 transition ${
                      dragIndex === index
                        ? "border-teal-300 bg-teal-50/50 opacity-60"
                        : dropIndex === index
                          ? "border-teal-400 bg-teal-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {mode === "linear" ? (
                      <span
                        draggable={!pending}
                        onDragStart={(e) => {
                          setDragIndex(index);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDropIndex(null);
                        }}
                        className="cursor-grab select-none text-slate-400 active:cursor-grabbing"
                        title={de ? "Ziehen zum Sortieren" : "Drag to reorder"}
                      >
                        <IconGrip size={18} />
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                        {index + 1}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/tasks/${link.task_id}?returnTo=${returnTo}`}
                          className="font-medium text-slate-900 transition hover:text-teal-700"
                        >
                          {link.task.title}
                        </Link>
                        {mode === "linear" && index === 0 ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Start
                          </span>
                        ) : null}
                        {endEnabled &&
                        (endTaskId ?? orderedLinks[orderedLinks.length - 1]?.task_id) ===
                          link.task_id ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Ende
                          </span>
                        ) : null}
                        {gpsEnabled ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              getLinkGps(link)
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {getLinkGps(link) ? "GPS ✓" : "GPS fehlt"}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">{link.task.slug}</p>
                    </div>

                    <TaskTilePreview title={link.task.title} content={link.task.content} />

                    <Link
                      href={`/admin/tasks/${link.task_id}?returnTo=${returnTo}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                    >
                      <IconEdit size={14} />
                      {de ? "Bearbeiten" : "Edit"}
                    </Link>

                    {gpsEnabled ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setExpandedGpsLinkId((id) => (id === link.id ? null : link.id))
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <IconMapPin size={14} />
                        {de ? "Wegpunkt" : "Waypoint"}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      aria-label={de ? "Entfernen" : "Remove"}
                      disabled={pending}
                      onClick={() => handleRemove(link.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>

                  {gpsEnabled && expandedGpsLinkId === link.id ? (
                    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <GpsWaypointPicker
                        value={getLinkGps(link)}
                        defaultCenter={mapDefault}
                        disabled={pending}
                        onChange={(pin) =>
                          setGpsDrafts((prev) => ({ ...prev, [link.id]: pin }))
                        }
                      />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <StudioButton
                          type="button"
                          disabled={pending}
                          className="px-4 py-2 text-sm"
                          icon={<IconSave size={14} />}
                          onClick={() => saveGps(link)}
                        >
                          {de ? "Wegpunkt speichern" : "Save waypoint"}
                        </StudioButton>
                        {getLinkGps(link) ? (
                          <StudioButton
                            type="button"
                            variant="danger"
                            disabled={pending}
                            className="px-4 py-2 text-sm"
                            onClick={() => {
                              startTransition(async () => {
                                const result = await updateGameTaskLocation(gameId, link.id, null);
                                if (!result.success) {
                                  setError(result.error);
                                  return;
                                }
                                setLinks((prev) =>
                                  prev.map((l) => (l.id === link.id ? result.data! : l)),
                                );
                                setGpsDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[link.id];
                                  return next;
                                });
                                router.refresh();
                              });
                            }}
                          >
                            {de ? "Entfernen" : "Remove"}
                          </StudioButton>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </StudioPanel>

      <StudioPanel className="xl:sticky xl:top-8 xl:self-start">
        <StudioSectionTitle
          icon={<IconPuzzle size={18} />}
          title={de ? "Aufgaben-Bibliothek" : "Task library"}
          description={de ? "Klicken zum Hinzufügen" : "Click to add"}
        />
        <div className="relative mb-4">
          <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <StudioInput
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={de ? "Suchen…" : "Search…"}
          />
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {available.length === 0 ? (
            <p className="text-sm text-slate-500">
              {de ? "Keine passenden Aufgaben." : "No matching tasks."}{" "}
              <Link href="/admin/tasks/new" className="font-medium text-teal-600 hover:text-teal-700">
                {de ? "Neu erstellen" : "Create new"}
              </Link>
            </p>
          ) : (
            available.slice(0, 40).map((task) => (
              <button
                key={task.id}
                type="button"
                disabled={pending}
                onClick={() => handleAdd(task.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/50 disabled:opacity-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-teal-100 group-hover:text-teal-700">
                  <IconPlus size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                  <p className="truncate text-xs text-slate-500">{task.slug}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </StudioPanel>
    </div>
  );
}

function sortLinksByOrder(links: StudioGameTaskLink[]): StudioGameTaskLink[] {
  return [...links].sort((a, b) => a.sort_order - b.sort_order);
}

function withSortOrder(links: StudioGameTaskLink[]): StudioGameTaskLink[] {
  return links.map((link, index) => ({ ...link, sort_order: index }));
}
