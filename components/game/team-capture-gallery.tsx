"use client";

import { useEffect, useState } from "react";
import { listTeamEventCaptures } from "@/app/actions/captures";
import type { EventCaptureItem } from "@/lib/grid/event-captures";

type Props = {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
};

async function saveUrlToDevice(item: EventCaptureItem) {
  const response = await fetch(item.publicUrl);
  const blob = await response.blob();
  const ext = item.kind === "video" ? "mp4" : "jpg";
  const file = new File([blob], `grid-${item.kind}-${item.id}.${ext}`, {
    type: item.mimeType || blob.type,
  });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: file.name });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function TeamCaptureGallery({ inviteCode, joinCode, sessionId }: Props) {
  const [items, setItems] = useState<EventCaptureItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listTeamEventCaptures({ inviteCode, joinCode, sessionId }).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        setItems([]);
        return;
      }
      setItems(result.data.items);
    });
    return () => {
      cancelled = true;
    };
  }, [inviteCode, joinCode, sessionId]);

  if (items === null) {
    return (
      <div className="rounded-3xl bg-[var(--cg-card)] px-5 py-5 text-center shadow-[var(--cg-shadow-soft)]">
        <p className="text-sm text-[var(--cg-muted)]">Galerie wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-[var(--cg-card)] px-5 py-5 shadow-[var(--cg-shadow-soft)]">
      <p className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--cg-muted)]">
        Eure Galerie
      </p>
      <p className="mt-1 text-center text-sm text-[var(--cg-muted)]">
        Fotos und Videos dieses Teams — speichert sie aufs Handy, solange ihr wollt.
      </p>
      {error ? (
        <p className="mt-3 text-center text-sm text-[var(--cg-destructive)]">{error}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-center text-sm text-[var(--cg-muted)]">
          Noch keine Aufnahme. Sobald ihr sendet, liegt sie hier.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-2xl bg-[var(--cg-bg)]">
              {item.kind === "video" ? (
                <video
                  src={item.publicUrl}
                  controls
                  playsInline
                  className="aspect-[3/4] w-full bg-black object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.publicUrl}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
              )}
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <p className="text-xs font-semibold text-[var(--cg-muted)]">
                  {item.kind === "video" ? "Video" : "Foto"}
                  {item.levelNumber > 0 ? ` · Aufgabe ${item.levelNumber}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => void saveUrlToDevice(item)}
                  className="text-xs font-bold text-[var(--cg-primary)]"
                >
                  Speichern
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
