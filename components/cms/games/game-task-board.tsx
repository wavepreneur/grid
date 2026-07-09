"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addTaskToGame,
  removeTaskFromGame,
  reorderGameTasks,
} from "@/app/actions/cms/games";
import { GridButton, GridError, GridInput, GridLabel } from "@/components/grid/grid-shell";
import { StudioPanel } from "@/components/cms/admin-shell";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import type { StudioGameTaskLink, StudioTask } from "@/lib/cms/types";

type Props = {
  gameId: string;
  links: StudioGameTaskLink[];
  libraryTasks: StudioTask[];
};

export function GameTaskBoard({ gameId, links: initialLinks, libraryTasks }: Props) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function refresh() {
    router.refresh();
  }

  function handleAdd(taskId: string) {
    setError(null);
    startTransition(async () => {
      const result = await addTaskToGame(gameId, taskId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLinks((prev) => [...prev, result.data!]);
      refresh();
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
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      refresh();
    });
  }

  function moveLink(linkId: string, direction: -1 | 1) {
    const index = links.findIndex((l) => l.id === linkId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= links.length) return;

    const next = [...links];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setLinks(next);

    startTransition(async () => {
      await reorderGameTasks(
        gameId,
        next.map((l) => l.id),
      );
      refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <StudioPanel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Tasks im Game</h2>
            <p className="text-sm text-[var(--grid-muted)]">
              Reihenfolge = Startpunkt für Logik (Builder folgt in Phase 3)
            </p>
          </div>
          <span className="text-xs text-[var(--grid-muted)]">{links.length} Tasks</span>
        </div>

        {error ? <GridError message={error} /> : null}

        {links.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--grid-border)] p-8 text-center text-sm text-[var(--grid-muted)]">
            Noch keine Tasks — wähle rechts aus der Bibliothek.
          </div>
        ) : (
          <ol className="space-y-3">
            {links.map((link, index) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--grid-border)] bg-black/20 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--grid-accent-soft)] text-sm font-semibold text-[var(--grid-accent)]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{link.task.title}</p>
                  <p className="text-xs text-[var(--grid-muted)]">{link.task.slug}</p>
                </div>
                <TaskTilePreview title={link.task.title} content={link.task.content} />
                <div className="flex gap-1">
                  <IconButton
                    label="Nach oben"
                    disabled={pending || index === 0}
                    onClick={() => moveLink(link.id, -1)}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label="Nach unten"
                    disabled={pending || index === links.length - 1}
                    onClick={() => moveLink(link.id, 1)}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    label="Entfernen"
                    disabled={pending}
                    onClick={() => handleRemove(link.id)}
                  >
                    ✕
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
        )}
      </StudioPanel>

      <StudioPanel className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div>
          <h2 className="text-lg font-semibold text-white">Bibliothek</h2>
          <p className="text-sm text-[var(--grid-muted)]">Bestehende Tasks reinkopieren</p>
        </div>
        <div>
          <GridLabel>Suche</GridLabel>
          <GridInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titel, Slug…"
          />
        </div>
        <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {available.length === 0 ? (
            <p className="text-sm text-[var(--grid-muted)]">
              Keine passenden Tasks.{" "}
              <Link href="/admin/tasks/new" className="text-[var(--grid-accent)] underline">
                Neu erstellen
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
                <span className="shrink-0 text-xs text-[var(--grid-accent)]">+ Add</span>
              </button>
            ))
          )}
        </div>
      </StudioPanel>
    </div>
  );
}

function IconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--grid-border)] text-sm text-[var(--grid-muted)] transition hover:border-white/20 hover:text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}
