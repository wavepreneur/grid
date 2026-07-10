"use client";

import { useState, useTransition } from "react";
import { publishGame, revertGameToDraft } from "@/app/actions/cms/games";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { StudioButton, StudioHint } from "@/components/cms/studio-ui";
import { useStudioCache } from "@/lib/platform/studio-cache";
import type { StudioGameStatus } from "@/lib/cms/types";

type Props = {
  gameId: string;
  status: StudioGameStatus;
  publishedVersionNumber: number;
  liveEventCount?: number;
  compact?: boolean;
  onStatusChange?: (status: StudioGameStatus) => void;
};

export function GameStatusSwitch({
  gameId,
  status,
  publishedVersionNumber,
  liveEventCount = 0,
  compact = false,
  onStatusChange,
}: Props) {
  const cache = useStudioCache();
  const [pending, startTransition] = useTransition();
  const [confirmDraft, setConfirmDraft] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const isPublished = status === "published";

  function applyDraft() {
    startTransition(async () => {
      const result = await revertGameToDraft(gameId);
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      onStatusChange?.("draft");
      cache.patchGame(gameId, { status: "draft" });
      setConfirmDraft(false);
    });
  }

  function applyPublish() {
    startTransition(async () => {
      const result = await publishGame(gameId);
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      onStatusChange?.("published");
      cache.patchGame(gameId, {
        status: "published",
        published_version_number: result.data!.versionNumber,
      });
      setConfirmPublish(false);
    });
  }

  return (
    <>
      <div
        className={`inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 ${
          compact ? "text-[10px]" : "text-xs"
        }`}
        role="group"
        aria-label="Spielstatus"
      >
        <button
          type="button"
          disabled={pending || !isPublished}
          onClick={() => {
            if (isPublished) setConfirmDraft(true);
          }}
          className={`rounded-md px-2.5 py-1 font-semibold transition ${
            !isPublished
              ? "bg-white text-amber-800 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          } ${compact ? "px-2 py-0.5" : "px-3 py-1.5"} disabled:cursor-default`}
        >
          Entwurf
        </button>
        <button
          type="button"
          disabled={pending || isPublished}
          onClick={() => {
            if (!isPublished) setConfirmPublish(true);
          }}
          className={`rounded-md px-2.5 py-1 font-semibold transition ${
            isPublished
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          } ${compact ? "px-2 py-0.5" : "px-3 py-1.5"} disabled:cursor-default`}
        >
          Veröffentlicht
        </button>
      </div>

      <StudioModal
        open={confirmDraft}
        onClose={() => {
          if (!pending) setConfirmDraft(false);
        }}
        title="Auf Entwurf zurücksetzen?"
        subtitle={
          publishedVersionNumber > 0
            ? `Version ${publishedVersionNumber} bleibt gespeichert.`
            : undefined
        }
        footer={
          <div className="flex flex-wrap gap-2">
            <StudioButton type="button" disabled={pending} onClick={applyDraft}>
              {pending ? "Wird gesetzt…" : "Als Entwurf markieren"}
            </StudioButton>
            <StudioButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirmDraft(false)}
            >
              Abbrechen
            </StudioButton>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600">
          Das Spiel wechselt in den Bearbeitungsmodus. Du kannst den Entwurf weiter anpassen und
          später erneut veröffentlichen.
        </p>
        {liveEventCount > 0 ? (
          <div className="mt-4">
            <StudioHint tone="warn">
              {liveEventCount === 1
                ? "1 Live-Event läuft noch"
                : `${liveEventCount} Live-Events laufen noch`}{" "}
              — diese nutzen weiterhin die zuletzt veröffentlichte Version.
            </StudioHint>
          </div>
        ) : null}
      </StudioModal>

      <StudioModal
        open={confirmPublish}
        onClose={() => {
          if (!pending) setConfirmPublish(false);
        }}
        title="Veröffentlichen?"
        subtitle="Erstellt eine neue eingefrorene Version für Live-Events."
        footer={
          <div className="flex flex-wrap gap-2">
            <StudioButton type="button" disabled={pending} onClick={applyPublish}>
              {pending ? "Wird veröffentlicht…" : "Jetzt veröffentlichen"}
            </StudioButton>
            <StudioButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirmPublish(false)}
            >
              Abbrechen
            </StudioButton>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600">
          Der aktuelle Entwurf wird als Version {publishedVersionNumber + 1} gespeichert. Laufende
          Events bleiben auf älteren Versionen, bis du neue startest.
        </p>
      </StudioModal>
    </>
  );
}
