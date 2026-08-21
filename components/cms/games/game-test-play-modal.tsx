"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getOrCreateStudioTestSession,
  regenerateStudioTestSession,
  type StudioTestSession,
} from "@/app/actions/cms/events";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { IconCopy, IconRefresh } from "@/components/cms/studio-icons";
import { StudioButton, StudioError } from "@/components/cms/studio-ui";

type Props = {
  open: boolean;
  onClose: () => void;
  gameId: string;
  gameName: string;
  publishedVersionNumber: number;
};

export function GameTestPlayModal({
  open,
  onClose,
  gameId,
  gameName,
  publishedVersionNumber,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [session, setSession] = useState<StudioTestSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function absoluteUrl(path: string) {
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCopied(false);
    setSession(null);
    startTransition(async () => {
      const result = await getOrCreateStudioTestSession(gameId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSession(result.data!);
    });
  }, [open, gameId]);

  function handleRegenerate() {
    if (
      !window.confirm(
        "Neuen Testlink erzeugen? Die aktuelle Testsession wird beendet — Fortschritt geht verloren.",
      )
    ) {
      return;
    }
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await regenerateStudioTestSession(gameId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSession(result.data!);
    });
  }

  async function handleCopy() {
    if (!session) return;
    const url = absoluteUrl(session.playPath);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren fehlgeschlagen — Link manuell markieren.");
    }
  }

  const playUrl = session ? absoluteUrl(session.playPath) : null;

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      title="Spiel testen"
      subtitle={`${gameName} · Version ${publishedVersionNumber} · bis ${session?.maxPlayers ?? 3} Spieler (Alpha, Beta, Gamma)`}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <StudioButton
            type="button"
            disabled={pending || !session}
            icon={<IconCopy size={16} />}
            onClick={() => void handleCopy()}
          >
            {copied ? "Kopiert" : "Link kopieren"}
          </StudioButton>
          <StudioButton
            type="button"
            variant="secondary"
            disabled={pending || !session}
            onClick={() => {
              if (playUrl) window.open(playUrl, "_blank", "noopener,noreferrer");
            }}
          >
            Öffnen
          </StudioButton>
          <StudioButton
            type="button"
            variant="ghost"
            disabled={pending}
            icon={<IconRefresh size={16} />}
            onClick={handleRegenerate}
          >
            {pending ? "…" : "Neu generieren"}
          </StudioButton>
          {session ? (
            <a
              href={absoluteUrl(session.cockpitPath)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold text-muted-foreground underline-offset-2 hover:underline"
            >
              Cockpit
            </a>
          ) : null}
        </div>
      }
    >
      {error ? (
        <div className="mb-4">
          <StudioError message={error} />
        </div>
      ) : null}

      <p className="text-sm leading-relaxed text-muted-foreground">
        Link auf jedem Gerät öffnen. Ohne „Neu generieren“ geht es dort weiter, wo du aufgehört hast.
        Neu generieren = frischer Neustart.
      </p>

      {playUrl ? (
        <div className="mt-4 rounded-2xl border border-border bg-secondary/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Testlink
          </p>
          <a
            href={playUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            {playUrl}
          </a>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {pending ? "Testlink wird vorbereitet…" : "Kein Testlink geladen."}
        </p>
      )}
    </StudioModal>
  );
}
