"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateTasks } from "@/app/actions/cms/tasks";
import { StudioDuplicateModal } from "@/components/cms/shared/studio-duplicate-modal";
import { IconCopy } from "@/components/cms/studio-icons";
import { StudioButton } from "@/components/cms/studio-ui";
import { useStudioCache } from "@/lib/platform/studio-cache";

type Props = {
  taskId: string;
  taskTitle: string;
  listPath?: string;
  className?: string;
};

export function TaskDuplicateButton({
  taskId,
  listPath = "/admin/tasks",
  className,
}: Props) {
  const router = useRouter();
  const cache = useStudioCache();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDuplicate(count: number) {
    setPending(true);
    setError(null);
    try {
      const result = await duplicateTasks([taskId], count);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const { createdIds } = result.data!;
      setOpen(false);

      if (createdIds.length === 1) {
        router.push(`/admin/tasks/${createdIds[0]}`);
      } else {
        router.push(listPath);
      }
      cache.invalidateTasks();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <StudioButton
        type="button"
        variant="ghost"
        className={className}
        disabled={pending}
        icon={<IconCopy size={16} />}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Duplizieren
      </StudioButton>

      <StudioDuplicateModal
        open={open}
        onClose={() => setOpen(false)}
        itemLabel="Aufgabe"
        selectedCount={1}
        pending={pending}
        error={error}
        onConfirm={confirmDuplicate}
      />
    </>
  );
}
