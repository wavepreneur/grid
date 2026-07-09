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
import { GridButton, GridError, GridInput, GridLabel } from "@/components/grid/grid-shell";
import { StudioPanel } from "@/components/cms/admin-shell";
import { GpsWaypointPicker } from "@/components/cms/gps/gps-waypoint-picker";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
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
    labelDe: "Linear",
    labelEn: "Linear",
    hintDe: "Reihenfolge per Drag — jede Aufgabe schaltet die nächste frei",
    hintEn: "Drag order — each task unlocks the next",
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
    hintDe: "Alle Aufgaben von Anfang an sichtbar",
    hintEn: "All tasks visible from the start",
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
  const hint = language === "de" ? modeHint?.hintDe : modeHint?.hintEn;

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
        language === "de"
          ? `Ablauf gespeichert (${nextLinks.length} Tasks).`
          : `Flow saved (${nextLinks.length} tasks).`,
      );
      return true;
    },
    [gameId, language],
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
        language === "de"
          ? `Wegpunkt für „${link.task.title}" gespeichert (${pin.radius_meters} m).`
          : `Waypoint saved for “${link.task.title}” (${pin.radius_meters} m).`,
      );
      router.refresh();
    });
  }

  const missingGpsCount = gpsEnabled
    ? orderedLinks.filter((l) => !getLinkGps(l)).length
    : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <StudioPanel className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Spielablauf</h2>
            <p className="mt-1 text-sm text-[var(--grid-muted)]">
              {language === "de"
                ? "Tasks per Drag sortieren — Logik wird automatisch erzeugt."
                : "Drag tasks to reorder — logic is generated automatically."}
            </p>
          </div>
          <span className="text-xs text-[var(--grid-muted)]">{orderedLinks.length} Tasks</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={pending}
              onClick={() => applyMode(opt.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                mode === opt.id
                  ? "border-[var(--grid-accent)] bg-[var(--grid-accent-soft)] text-[var(--grid-accent)]"
                  : "border-[var(--grid-border)] text-[var(--grid-muted)] hover:border-white/20 hover:text-white"
              }`}
            >
              {language === "de" ? opt.labelDe : opt.labelEn}
            </button>
          ))}
        </div>

        {hint ? <p className="text-xs text-[var(--grid-muted)]">{hint}</p> : null}

        {gpsEnabled && orderedLinks.length > 0 ? (
          <p className="rounded-lg border border-[var(--grid-accent)]/20 bg-[var(--grid-accent-soft)]/40 px-3 py-2 text-xs text-[var(--grid-muted)]">
            {language === "de"
              ? "GPS-Spiel: Pro Task einen Wegpunkt setzen (Karte + Radius). Im Spiel sieht der Team Lead die Karte und die Aufgabe wird im Radius freigeschaltet."
              : "GPS game: set a waypoint per task (map + radius). In play, the team lead sees the map and the task unlocks within the radius."}
            {missingGpsCount > 0 ? (
              <span className="ml-1 text-amber-300">
                · {missingGpsCount}{" "}
                {language === "de" ? "ohne Wegpunkt" : "without waypoint"}
              </span>
            ) : null}
          </p>
        ) : null}

        {orderedLinks.length > 0 ? (
          <label className="flex flex-wrap items-center gap-3 text-sm text-white">
            <input
              type="checkbox"
              checked={endEnabled}
              disabled={pending}
              onChange={(e) => toggleEnd(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--grid-border)]"
            />
            <span>{language === "de" ? "Spiel endet nach" : "End game after"}</span>
            <select
              disabled={!endEnabled || pending}
              value={
                endTaskId ??
                orderedLinks[orderedLinks.length - 1]?.task_id ??
                ""
              }
              onChange={(e) => setEndTask(e.target.value)}
              className="grid-input rounded-lg px-3 py-1.5 text-sm"
            >
              {orderedLinks.map((link, index) => (
                <option key={link.id} value={link.task_id}>
                  {index + 1}. {link.task.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? <GridError message={error} /> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

        {orderedLinks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--grid-border)] p-8 text-center text-sm text-[var(--grid-muted)]">
            {language === "de"
              ? "Noch keine Tasks — wähle rechts aus der Bibliothek."
              : "No tasks yet — pick from the library on the right."}
          </div>
        ) : (
          <ol className="space-y-0">
            {orderedLinks.map((link, index) => (
              <li key={link.id}>
                {mode === "linear" && index > 0 ? (
                  <div className="flex items-center gap-2 py-1 pl-5 text-xs text-[var(--grid-muted)]">
                    <span className="text-[var(--grid-accent)]">↓</span>
                    {language === "de" ? "wird freigeschaltet" : "unlocks next"}
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
                      ? "border-[var(--grid-accent)]/60 opacity-50"
                      : dropIndex === index
                        ? "border-[var(--grid-accent)] bg-[var(--grid-accent-soft)]/30"
                        : "border-[var(--grid-border)] bg-black/20"
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
                      className="cursor-grab select-none px-1 text-lg text-[var(--grid-muted)] active:cursor-grabbing"
                      title={language === "de" ? "Ziehen zum Sortieren" : "Drag to reorder"}
                    >
                      ⠿
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--grid-accent-soft)] text-sm font-semibold text-[var(--grid-accent)]">
                      {index + 1}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/tasks/${link.task_id}?returnTo=${encodeURIComponent(`/admin/games/${gameId}`)}`}
                        className="font-medium text-white transition hover:text-[var(--grid-accent)]"
                      >
                        {link.task.title}
                      </Link>
                      {mode === "linear" && index === 0 ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                          Start
                        </span>
                      ) : null}
                      {endEnabled &&
                      (endTaskId ?? orderedLinks[orderedLinks.length - 1]?.task_id) ===
                        link.task_id ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                          Ende
                        </span>
                      ) : null}
                      {mode === "rogain" ? (
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-300">
                          1× global
                        </span>
                      ) : null}
                      {gpsEnabled ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                            getLinkGps(link)
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {getLinkGps(link) ? "GPS ✓" : "GPS fehlt"}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--grid-muted)]">{link.task.slug}</p>
                  </div>

                  <TaskTilePreview title={link.task.title} content={link.task.content} />

                  <Link
                    href={`/admin/tasks/${link.task_id}?returnTo=${encodeURIComponent(`/admin/games/${gameId}`)}`}
                    className="rounded-lg border border-[var(--grid-border)] px-3 py-2 text-xs text-[var(--grid-muted)] transition hover:border-[var(--grid-accent)]/40 hover:text-white"
                  >
                    {language === "de" ? "Bearbeiten" : "Edit"}
                  </Link>

                  {gpsEnabled ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        setExpandedGpsLinkId((id) => (id === link.id ? null : link.id))
                      }
                      className="rounded-lg border border-[var(--grid-border)] px-3 py-2 text-xs text-[var(--grid-muted)] transition hover:border-[var(--grid-accent)]/40 hover:text-white"
                    >
                      📍 {language === "de" ? "Wegpunkt" : "Waypoint"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    aria-label={language === "de" ? "Entfernen" : "Remove"}
                    disabled={pending}
                    onClick={() => handleRemove(link.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--grid-border)] text-sm text-[var(--grid-muted)] transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>

                {gpsEnabled && expandedGpsLinkId === link.id ? (
                  <div className="mb-3 rounded-xl border border-[var(--grid-border)] bg-black/30 p-4">
                    <GpsWaypointPicker
                      value={getLinkGps(link)}
                      defaultCenter={mapDefault}
                      disabled={pending}
                      onChange={(pin) =>
                        setGpsDrafts((prev) => ({ ...prev, [link.id]: pin }))
                      }
                    />
                    <div className="mt-4 flex gap-2">
                      <GridButton
                        type="button"
                        disabled={pending}
                        className="w-auto px-4 py-2 text-sm"
                        onClick={() => saveGps(link)}
                      >
                        {language === "de" ? "Wegpunkt speichern" : "Save waypoint"}
                      </GridButton>
                      {getLinkGps(link) ? (
                        <button
                          type="button"
                          disabled={pending}
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
                          className="rounded-xl border border-[var(--grid-border)] px-4 py-2 text-sm text-red-300"
                        >
                          {language === "de" ? "Entfernen" : "Remove"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}

      </StudioPanel>

      <StudioPanel className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div>
          <h2 className="text-lg font-semibold text-white">Bibliothek</h2>
          <p className="text-sm text-[var(--grid-muted)]">
            {language === "de" ? "Task hinzufügen" : "Add task"}
          </p>
        </div>
        <div>
          <GridLabel>{language === "de" ? "Suche" : "Search"}</GridLabel>
          <GridInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === "de" ? "Titel, Slug…" : "Title, slug…"}
          />
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {available.length === 0 ? (
            <p className="text-sm text-[var(--grid-muted)]">
              {language === "de" ? "Keine passenden Tasks." : "No matching tasks."}{" "}
              <Link href="/admin/tasks/new" className="text-[var(--grid-accent)] underline">
                {language === "de" ? "Neu erstellen" : "Create new"}
              </Link>
            </p>
          ) : (
            available.slice(0, 40).map((task) => (
              <button
                key={task.id}
                type="button"
                disabled={pending}
                onClick={() => handleAdd(task.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--grid-border)] p-3 text-left transition hover:border-[var(--grid-accent)]/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{task.title}</p>
                  <p className="truncate text-xs text-[var(--grid-muted)]">{task.slug}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--grid-accent)]">+</span>
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
