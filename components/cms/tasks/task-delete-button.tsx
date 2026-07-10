"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTasks,
  getTasksDeleteStatus,
  removeTasksFromLiveGames,
} from "@/app/actions/cms/delete";
import type { TaskDeleteStatus } from "@/lib/cms/delete-status";
import { TaskGameUsageList } from "@/components/cms/tasks/task-game-usage-modal";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { IconTrash } from "@/components/cms/studio-icons";
import { StudioButton, StudioError, StudioHint } from "@/components/cms/studio-ui";

type Props = {
  taskId: string;
  taskTitle: string;
  redirectTo?: string;
  className?: string;
};

export function TaskDeleteButton({
  taskId,
  taskTitle,
  redirectTo = "/admin/tasks",
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskDeleteStatus | null>(null);

  const hasLiveBlockers = (status?.liveGameLinks.length ?? 0) > 0;

  async function openModal() {
    setError(null);
    const result = await getTasksDeleteStatus([taskId]);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStatus(result.data![0] ?? null);
    setOpen(true);
  }

  async function removeFromLive() {
    setPending(true);
    setError(null);
    try {
      const result = await removeTasksFromLiveGames([taskId]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const refreshed = await getTasksDeleteStatus([taskId]);
      if (refreshed.success) setStatus(refreshed.data![0] ?? null);
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    setPending(true);
    setError(null);
    try {
      if (hasLiveBlockers) {
        setError("Entferne die Aufgabe zuerst aus laufenden Spielen.");
        return;
      }
      const result = await deleteTasks([taskId]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data!.failed.length > 0) {
        setError(result.data!.failed[0]?.error ?? "Löschen fehlgeschlagen.");
        return;
      }
      setOpen(false);
      router.push(redirectTo);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const warnings = useMemo(() => {
    if (!status) return null;
    return (
      <>
        {status.liveGameLinks.length > 0 ? (
          <StudioHint tone="warn">
            „{taskTitle}" ist in laufenden Spielen:{" "}
            {status.liveGameLinks.map((l) => l.gameName).join(", ")}
          </StudioHint>
        ) : null}
        {status.games.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Eingebunden in
            </p>
            <TaskGameUsageList games={status.games} />
          </div>
        ) : null}
        {error ? <StudioError message={error} /> : null}
      </>
    );
  }, [status, taskTitle, error]);

  return (
    <>
      <StudioButton
        type="button"
        variant="ghost"
        className={className}
        icon={<IconTrash size={16} />}
        onClick={openModal}
      >
        Aufgabe löschen
      </StudioButton>

      <StudioDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        title="Aufgabe löschen?"
        count={1}
        itemLabel="Aufgabe"
        pending={pending}
        warnings={warnings}
        extraActions={
          hasLiveBlockers ? (
            <StudioButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={removeFromLive}
            >
              Aus laufenden Spielen entfernen
            </StudioButton>
          ) : undefined
        }
        onConfirm={confirmDelete}
      />
    </>
  );
}
