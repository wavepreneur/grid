"use client";

import { ContentMediaSheet } from "@/components/game/city/content-media-sheet";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  open: boolean;
  title: string;
  url: string | null | undefined;
  emptyHint?: string;
  language?: string | null;
  onClose: () => void;
};

/**
 * Full-viewport help doc (briefing / FAQ) — same chrome as content tiles.
 */
export function PlayDocSheet({
  open,
  title,
  url,
  emptyHint,
  language,
  onClose,
}: Props) {
  const t = playUi(language);
  return (
    <ContentMediaSheet
      open={open}
      title={title}
      mediaType="iframe"
      mediaUrl={url?.trim() || null}
      onClose={onClose}
      emptyMessage={emptyHint ?? t.media.noUrl}
      language={language}
    />
  );
}
