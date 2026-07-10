"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateGames } from "@/app/actions/cms/games";
import { useInvalidateStudioGames } from "@/lib/hooks/use-studio-games";
import { StudioDuplicateModal } from "@/components/cms/shared/studio-duplicate-modal";
import { IconCopy } from "@/components/cms/studio-icons";
import { StudioButton } from "@/components/cms/studio-ui";

type Props = {
  gameId: string;
  gameName: string;
  listPath?: string;
  className?: string;
};

export function GameDuplicateButton({
  gameId,
  listPath = "/admin/games",
  className,
}: Props) {
  const router = useRouter();
  const invalidateGames = useInvalidateStudioGames();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDuplicate(count: number) {
    setPending(true);
    setError(null);
    try {
      const result = await duplicateGames([gameId], count);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const { createdIds } = result.data!;
      setOpen(false);

      if (createdIds.length === 1) {
        router.push(`/admin/games/${createdIds[0]}`);
      } else {
        router.push(listPath);
      }
      invalidateGames();
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
        itemLabel="Spiel"
        selectedCount={1}
        pending={pending}
        error={error}
        onConfirm={confirmDuplicate}
      />
    </>
  );
}
