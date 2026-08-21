"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTasks,
  getTasksDeleteStatus,
} from "@/app/actions/cms/delete";
import type { TaskDeleteStatus } from "@/lib/cms/delete-status";
import { TaskGameUsageList } from "@/components/cms/tasks/task-game-usage-modal";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { IconTrash } from "@/components/cms/studio-icons";
import { StudioButton, StudioError, StudioHint } from "@/components/cms/studio-ui";
import { useStudioCache } from "@/lib/platform/studio-cache";

type Props = {
  taskId: string;
  taskTitle: string;
  redirectTo?: string;
  className?: string;
};

export function TaskDeleteButton({
  taskId,
  taskTitle: _taskTitle,
  redirectTo = "/admin/tasks",
  className,
}: Props) {
  const router = useRouter();
  const cache = useStudioCache();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskDeleteStatus | null>(null);

  const isBlocked = Boolean(status && !status.canDelete);

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

  async function confirmDelete() {
    setPending(true);
    setError(null);
    try {
      if (isBlocked) {
        setError(status?.blockReason ?? "Aufgabe ist noch in Spielen eingebunden.");
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
      cache.invalidateTasks();
      router.push(redirectTo);
    } finally {
      setPending(false);
    }
  }

  const warnings = useMemo(() => {
    if (!status) return null;
    return (
      <>
        {status.blockReason ? <StudioHint tone="warn">{status.blockReason}</StudioHint> : null}
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
  }, [status, error]);

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
        confirmDisabled={isBlocked}
        warnings={warnings}
        onConfirm={confirmDelete}
      />
    </>
  );
}
