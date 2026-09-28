"use client";

import { useEffect, useState } from "react";
import { listTeamEventCaptures } from "@/app/actions/captures";
import type { EventCaptureItem } from "@/lib/grid/event-captures";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  language?: string | null;
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

export function TeamCaptureGallery({ inviteCode, joinCode, sessionId, language }: Props) {
  const t = playUi(language);
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

  const hint =
    items === null
      ? t.gallery.loading
      : items.length === 0
        ? t.gallery.empty
        : items.length === 1
          ? t.gallery.one
          : t.gallery.many(items.length);

  return (
    <details className="group overflow-hidden rounded-3xl bg-[var(--cg-card)] shadow-[var(--cg-shadow-soft)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--cg-muted)]">
            {t.gallery.title}
          </p>
          <p className="mt-0.5 text-sm text-[var(--cg-muted)]">{hint}</p>
        </div>
        <span
          aria-hidden
          className="text-lg leading-none text-[var(--cg-muted)] transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="px-5 pb-5">
        <p className="text-sm text-[var(--cg-muted)]">
          {t.gallery.body}
        </p>
        {error ? (
          <p className="mt-3 text-sm text-[var(--cg-destructive)]">{error}</p>
        ) : items === null ? (
          <p className="mt-3 text-sm text-[var(--cg-muted)]">{t.gallery.loadingBody}</p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--cg-muted)]">
            {t.gallery.emptyBody}
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
                    {item.kind === "video" ? t.gallery.video : t.gallery.photo}
                    {item.levelNumber > 0 ? t.gallery.taskN(item.levelNumber) : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => void saveUrlToDevice(item)}
                    className="text-xs font-bold text-[var(--cg-primary)]"
                  >
                    {t.gallery.save}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
