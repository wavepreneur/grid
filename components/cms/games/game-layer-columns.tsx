"use client";

import { useState, type ReactNode } from "react";
import type { StudioLayer } from "@/lib/cms/layer-model";
import type { StudioGameTaskLink } from "@/lib/cms/types";
import { LAYER_DEFINITIONS } from "@/lib/cms/layer-model";
import {
  bonusTriggerLabel,
  parseBonusTrigger,
  parseLinkOverrides,
  roleLabelShort,
} from "@/lib/cms/game-link-config";
import { parseGpsOverride } from "@/lib/cms/gps-defaults";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import { IconEdit, IconGrip, IconPlus, IconTrash } from "@/components/cms/studio-icons";
import { StudioButton, StudioEmptyState } from "@/components/cms/studio-ui";

export const GRID_TASK_DRAG_TYPE = "application/x-grid-task-id";

export function readDraggedTaskId(dataTransfer: DataTransfer): string | null {
  const raw =
    dataTransfer.getData(GRID_TASK_DRAG_TYPE) || dataTransfer.getData("text/plain");
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("reorder:")) return null;
  return trimmed;
}

export function setDraggedTaskId(dataTransfer: DataTransfer, taskId: string) {
  dataTransfer.setData(GRID_TASK_DRAG_TYPE, taskId);
  dataTransfer.setData("text/plain", taskId);
  dataTransfer.effectAllowed = "copy";
}

type TaskDropZoneProps = {
  active: boolean;
  fallbackTaskId?: string | null;
  onDropTask: (taskId: string) => void;
  className?: string;
  children: ReactNode;
};

function TaskDropZone({ active, fallbackTaskId, onDropTask, className, children }: TaskDropZoneProps) {
  return (
    <div
      className={className}
      onDragEnter={(e) => {
        if (!active) return;
        e.preventDefault();
      }}
      onDragOver={(e) => {
        if (!active) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        if (!active) return;
        e.preventDefault();
        e.stopPropagation();
        const taskId = readDraggedTaskId(e.dataTransfer) || fallbackTaskId || null;
        if (taskId) onDropTask(taskId);
      }}
    >
      {children}
    </div>
  );
}

type ColumnProps = {
  layer: StudioLayer;
  links: StudioGameTaskLink[];
  allLinks: StudioGameTaskLink[];
  pending?: boolean;
  draggingTaskId: string | null;
  focused?: boolean;
  onFocus: () => void;
  onSelectLink: (link: StudioGameTaskLink) => void;
  onRemove: (linkId: string) => void;
  onDropTask: (taskId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  selectedLinkId?: string | null;
};

export function GameLayerColumn({
  layer,
  links,
  allLinks,
  pending,
  draggingTaskId,
  focused = false,
  onFocus,
  onSelectLink,
  onRemove,
  onDropTask,
  onReorder,
  selectedLinkId,
}: ColumnProps) {
  const def = LAYER_DEFINITIONS[layer];
  const taskTitleById = new Map(allLinks.map((l) => [l.task_id, l.task.title]));
  const canAddTask = Boolean(draggingTaskId);
  const isDropTarget = Boolean(draggingTaskId);
  const [reorderFrom, setReorderFrom] = useState<number | null>(null);
  const [reorderOver, setReorderOver] = useState<number | null>(null);
  const isReordering = reorderFrom !== null;

  function finishReorder(toIndex: number) {
    if (reorderFrom === null || !onReorder || reorderFrom === toIndex) return;
    onReorder(reorderFrom, toIndex);
  }

  return (
    <TaskDropZone
      active={canAddTask && !isReordering}
      onDropTask={onDropTask}
      className={`flex min-h-[420px] flex-col rounded-2xl border transition ${
        focused
          ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-400/60"
          : isDropTarget
            ? "border-teal-300 bg-teal-50/20"
            : "border-slate-200 bg-slate-50/50"
      }`}
    >
      <button
        type="button"
        onClick={onFocus}
        className={`border-b px-4 py-3 rounded-t-2xl text-left transition ${
          focused ? "border-teal-200 bg-teal-50/80" : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
      >
        <p className="text-sm font-semibold text-slate-900">{def.shortDe}</p>
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{def.descriptionDe}</p>
        <p className="mt-2 text-xs font-medium text-slate-400">
          {links.length} Aufgaben
          {focused ? " · Fokus für Bibliothek-Klick" : null}
          {isDropTarget ? " · Hier loslassen" : null}
        </p>
      </button>

      <div
        className="flex-1 space-y-2 p-3"
        onDragOver={(e) => {
          if (!isReordering || !onReorder) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          if (!isReordering || !onReorder) return;
          e.preventDefault();
          if (reorderOver !== null) finishReorder(reorderOver);
          setReorderFrom(null);
          setReorderOver(null);
        }}
      >
        {links.length === 0 ? (
          <TaskDropZone
            active={canAddTask}
            onDropTask={onDropTask}
            className={`flex h-full min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed p-4 transition ${
              canAddTask ? "border-teal-300 bg-teal-50/60" : "border-slate-200 bg-white/60"
            }`}
          >
            <p className="text-center text-xs text-slate-500">
              {canAddTask
                ? "Hier loslassen"
                : "Aufgabe aus der Bibliothek hierher ziehen"}
            </p>
          </TaskDropZone>
        ) : (
          links.map((link, index) => {
            const overrides = parseLinkOverrides(link.overrides);
            const gps = parseGpsOverride(overrides.location ?? overrides.gps);
            const trigger = parseBonusTrigger(overrides);
            const isDropTarget = isReordering && reorderOver === index && reorderFrom !== index;

            return (
              <div
                key={link.id}
                onDragEnter={() => {
                  if (isReordering) setReorderOver(index);
                }}
                onDragOver={(e) => {
                  if (isReordering && onReorder) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "move";
                    setReorderOver(index);
                    return;
                  }
                  if (canAddTask && !isReordering) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const taskId = readDraggedTaskId(e.dataTransfer);
                  if (taskId && !isReordering) {
                    onDropTask(taskId);
                    return;
                  }

                  if (isReordering && onReorder) {
                    finishReorder(index);
                    setReorderFrom(null);
                    setReorderOver(null);
                  }
                }}
                className={`rounded-xl border bg-white p-3 shadow-sm transition ${
                  isDropTarget
                    ? "border-teal-400 bg-teal-50 ring-2 ring-teal-300"
                    : selectedLinkId === link.id
                      ? "border-teal-400 ring-1 ring-teal-500/20"
                      : reorderFrom === index
                        ? "border-slate-300 opacity-50"
                        : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {onReorder && links.length > 1 ? (
                    <span
                      draggable={!pending && !draggingTaskId}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setReorderFrom(index);
                        setReorderOver(index);
                        e.dataTransfer.setData("text/plain", `reorder:${link.id}`);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setReorderFrom(null);
                        setReorderOver(null);
                      }}
                      className="cursor-grab pt-1 text-slate-400 active:cursor-grabbing"
                      title="Reihenfolge ändern"
                    >
                      <IconGrip size={16} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">
                      {index + 1}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{link.task.title}</p>
                    {layer === 1 ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {gps ? `GPS ✓ · ${gps.radius_meters} m` : "GPS fehlt — bearbeiten"}
                      </p>
                    ) : null}
                    {layer === 2 && index === 0 ? (
                      <p className="mt-0.5 text-[11px] font-medium text-emerald-600">Start</p>
                    ) : null}
                    {layer === 3 ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {roleLabelShort(overrides.role)} ·{" "}
                        {bonusTriggerLabel(trigger, taskTitleById)}
                      </p>
                    ) : null}
                  </div>
                  <TaskTilePreview title={link.task.title} content={link.task.content} compact />
                </div>
                <div className="mt-2 flex gap-1">
                  <StudioButton
                    type="button"
                    variant="secondary"
                    className="flex-1 px-2 py-1.5 text-[11px]"
                    icon={<IconEdit size={12} />}
                    onClick={() => onSelectLink(link)}
                  >
                    {layer === 1 ? "GPS" : layer === 3 ? "Bedingung" : "Details"}
                  </StudioButton>
                  <button
                    type="button"
                    aria-label="Entfernen"
                    disabled={pending}
                    onClick={() => onRemove(link.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-600"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </TaskDropZone>
  );
}

export function GameTaskLibrarySidebar({
  tasks,
  search,
  onSearchChange,
  pending,
  assignedIds,
  focusedLayerLabel,
  onAddTask,
  onDragTaskStart,
  onDragTaskEnd,
}: {
  tasks: Array<{ id: string; title: string; slug: string }>;
  search: string;
  onSearchChange: (q: string) => void;
  pending?: boolean;
  assignedIds: Set<string>;
  focusedLayerLabel: string;
  onAddTask: (taskId: string) => void;
  onDragTaskStart: (taskId: string) => void;
  onDragTaskEnd: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-8 xl:self-start">
      <p className="text-sm font-semibold text-slate-900">Aufgaben-Bibliothek</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Klick → <span className="font-medium text-teal-700">{focusedLayerLabel}</span> · Ziehen in
        beliebige Spalte
      </p>
      <input
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        placeholder="Suchen…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <StudioEmptyState
            title="Keine Aufgaben"
            description="Erstelle Aufgaben in der Bibliothek — sie gelten für alle Spiele."
          />
        ) : (
          tasks.map((task) => {
            const assigned = assignedIds.has(task.id);
            return (
              <div
                key={task.id}
                draggable={!pending && !assigned}
                onDragStart={(e) => {
                  if (assigned) {
                    e.preventDefault();
                    return;
                  }
                  setDraggedTaskId(e.dataTransfer, task.id);
                  onDragTaskStart(task.id);
                }}
                onDragEnd={onDragTaskEnd}
                onClick={() => {
                  if (assigned || pending) return;
                  onAddTask(task.id);
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition active:cursor-grabbing ${
                  assigned
                    ? "cursor-not-allowed border-slate-100 opacity-40"
                    : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40"
                }`}
              >
                <IconPlus size={14} className="shrink-0 text-teal-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                  <p className="truncate text-xs text-slate-500">{task.slug}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
