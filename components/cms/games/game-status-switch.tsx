"use client";

import { useTransition } from "react";
import { publishGame, revertGameToDraft } from "@/app/actions/cms/games";
import { IconInfo } from "@/components/cms/studio-icons";
import { useStudioCache } from "@/lib/platform/studio-cache";
import type { StudioGameStatus } from "@/lib/cms/types";

type Props = {
  gameId: string;
  status: StudioGameStatus;
  publishedVersionNumber: number;
  liveEventCount?: number;
  compact?: boolean;
  onStatusChange?: (
    status: StudioGameStatus,
    meta?: { publishedVersionNumber?: number },
  ) => void;
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

  const isPublished = status === "published";

  const infoText = isPublished
    ? [
        "Entwurf: Bearbeitungsmodus. Die zuletzt gespeicherte Version bleibt erhalten.",
        liveEventCount > 0
          ? liveEventCount === 1
            ? "1 Live-Event nutzt weiterhin die veröffentlichte Version."
            : `${liveEventCount} Live-Events nutzen weiterhin die veröffentlichte Version.`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    : `Veröffentlichen speichert den Entwurf als Version ${publishedVersionNumber + 1}. Laufende Events bleiben auf älteren Versionen, bis du neue startest.`;

  function applyDraft() {
    if (!isPublished || pending) return;
    startTransition(async () => {
      const result = await revertGameToDraft(gameId);
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      onStatusChange?.("draft");
      cache.patchGame(gameId, { status: "draft" });
    });
  }

  function applyPublish() {
    if (isPublished || pending) return;
    startTransition(async () => {
      const result = await publishGame(gameId);
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      onStatusChange?.("published", {
        publishedVersionNumber: result.data!.versionNumber,
      });
      cache.patchGame(gameId, {
        status: "published",
        published_version_number: result.data!.versionNumber,
      });
    });
  }

  return (
    <div className="inline-flex items-center gap-1.5">
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
          onClick={applyDraft}
          className={`rounded-md font-semibold transition ${
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
          onClick={applyPublish}
          className={`rounded-md font-semibold transition ${
            isPublished
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          } ${compact ? "px-2 py-0.5" : "px-3 py-1.5"} disabled:cursor-default`}
        >
          Veröffentlicht
        </button>
      </div>

      <span className="group relative inline-flex">
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label={infoText}
          title={infoText}
        >
          <IconInfo className="h-3.5 w-3.5" />
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs leading-5 text-slate-600 opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {infoText}
        </span>
      </span>
    </div>
  );
}
