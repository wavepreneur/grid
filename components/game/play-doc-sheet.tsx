"use client";

import { ContentMediaSheet } from "@/components/game/city/content-media-sheet";

type Props = {
  open: boolean;
  title: string;
  url: string | null | undefined;
  emptyHint?: string;
  onClose: () => void;
};

/**
 * Full-viewport help doc (briefing / FAQ) — same chrome as content tiles.
 */
export function PlayDocSheet({
  open,
  title,
  url,
  emptyHint = "Für dieses Spiel ist noch kein Link hinterlegt.",
  onClose,
}: Props) {
  return (
    <ContentMediaSheet
      open={open}
      title={title}
      mediaType="iframe"
      mediaUrl={url?.trim() || null}
      onClose={onClose}
      emptyMessage={emptyHint}
    />
  );
}
