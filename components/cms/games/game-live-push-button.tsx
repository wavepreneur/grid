"use client";

import { useEffect, useState, useTransition } from "react";
import { pushLiveStudioGame } from "@/app/actions/cms/games";
import { StudioButton } from "@/components/cms/studio-ui";
import { IconRefresh } from "@/components/cms/studio-icons";
import { useStudioCache } from "@/lib/platform/studio-cache";
import { formatLivePushAt, lastLivePushAtFromFlags } from "@/lib/cms/live-push";

type Props = {
  gameId: string;
  featureFlags: Record<string, unknown> | null | undefined;
};

export function GameLivePushButton({ gameId, featureFlags }: Props) {
  const cache = useStudioCache();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pushedAt, setPushedAt] = useState(() => lastLivePushAtFromFlags(featureFlags));
  const [eventCount, setEventCount] = useState<number | null>(null);

  useEffect(() => {
    setPushedAt(lastLivePushAtFromFlags(featureFlags));
  }, [featureFlags]);

  function onPush() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await pushLiveStudioGame(gameId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPushedAt(result.data.pushedAt);
      setEventCount(result.data.eventCount);
      cache.patchGame(gameId, {
        published_version_number: result.data.versionNumber,
        status: "published",
        feature_flags: result.data.featureFlags,
        updated_at: result.data.pushedAt,
      });
    });
  }

  return (
    <div>
      <StudioButton
        type="button"
        size="sm"
        variant="secondary"
        icon={<IconRefresh size={16} />}
        disabled={pending}
        title="Gespeicherte Spieländerungen an gebuchte und laufende Teams schicken — ohne dass Spieler etwas merken."
        onClick={onPush}
      >
        {pending ? "Aktualisiert…" : "Live-Teams aktualisieren"}
      </StudioButton>
      {pushedAt ? (
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          Aktualisiert: {formatLivePushAt(pushedAt)}
          {eventCount != null ? ` · ${eventCount} Event${eventCount === 1 ? "" : "s"}` : ""}
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          Nur auf Klick. Läuft im Hintergrund.
        </p>
      )}
      {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
