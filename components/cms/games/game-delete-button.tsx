"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGames,
  getGamesDeleteStatus,
  takeGamesOffline,
} from "@/app/actions/cms/delete";
import type { GameDeleteStatus } from "@/lib/cms/delete-status";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { IconTrash } from "@/components/cms/studio-icons";
import { StudioButton, StudioError, StudioHint } from "@/components/cms/studio-ui";
import { useStudioCache } from "@/lib/platform/studio-cache";

type Props = {
  gameId: string;
  gameName: string;
  redirectTo?: string;
  className?: string;
};

export function GameDeleteButton({
  gameId,
  gameName,
  redirectTo = "/admin/games",
  className,
}: Props) {
  const router = useRouter();
  const cache = useStudioCache();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GameDeleteStatus | null>(null);
  const [offlineConfirm, setOfflineConfirm] = useState(false);

  const needsOffline =
    (status?.liveEvents.length ?? 0) > 0 || (status?.activeTicketPools ?? 0) > 0;

  async function openModal() {
    setError(null);
    setOfflineConfirm(false);
    const result = await getGamesDeleteStatus([gameId]);
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
      if (needsOffline && !offlineConfirm) {
        setError("Bitte bestätige, dass Live-Events beendet werden sollen.");
        return;
      }
      if (needsOffline && offlineConfirm) {
        const offline = await takeGamesOffline([gameId]);
        if (!offline.success) {
          setError(offline.error);
          return;
        }
      }
      const result = await deleteGames([gameId]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data!.failed.length > 0) {
        setError(result.data!.failed[0]?.error ?? "Löschen fehlgeschlagen.");
        return;
      }
      setOpen(false);
      cache.invalidateGame(gameId);
      router.push(redirectTo);
    } finally {
      setPending(false);
    }
  }

  const warnings = useMemo(() => {
    if (!status) return null;
    return (
      <>
        {status.liveEvents.length > 0 ? (
          <StudioHint tone="warn">
            „{gameName}" läuft live ({status.liveEvents.map((e) => e.invite_code).join(", ")}).
          </StudioHint>
        ) : null}
        {status.activeTicketPools > 0 && status.liveEvents.length === 0 ? (
          <StudioHint tone="warn">Aktive Ticket-Pools werden beim Offline-Stellen pausiert.</StudioHint>
        ) : null}
        {status.ticketPoolCount > 0 &&
        status.activeTicketPools === 0 &&
        status.liveEvents.length === 0 ? (
          <StudioHint tone="info">
            {status.ticketPoolCount === 1
              ? "1 Ticket-Pool wird mit dem Spiel gelöscht."
              : `${status.ticketPoolCount} Ticket-Pools werden mit dem Spiel gelöscht.`}
          </StudioHint>
        ) : null}
        {error ? <StudioError message={error} /> : null}
      </>
    );
  }, [status, gameName, error]);

  return (
    <>
      <StudioButton
        type="button"
        variant="ghost"
        className={className}
        icon={<IconTrash size={16} />}
        onClick={openModal}
      >
        Spiel löschen
      </StudioButton>

      <StudioDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        title="Spiel löschen?"
        count={1}
        itemLabel="Spiel"
        pending={pending}
        warnings={warnings}
        offlineSwitch={
          needsOffline
            ? {
                checked: offlineConfirm,
                onChange: setOfflineConfirm,
                label: "Live-Events beenden und offline stellen, dann löschen",
              }
            : undefined
        }
        onConfirm={confirmDelete}
      />
    </>
  );
}
