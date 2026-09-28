"use client";

import { useState } from "react";
import { GridButton } from "@/components/grid/grid-shell";
import { IconCopy } from "@/components/cms/studio-icons";
import { playUi } from "@/lib/grid/play-ui";

type CopyInviteLinkProps = {
  url: string;
  label?: string;
  language?: string | null;
};

export function CopyInviteLink({
  url,
  label,
  language,
}: CopyInviteLinkProps) {
  const [copied, setCopied] = useState(false);
  const t = playUi(language);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <GridButton type="button" variant="secondary" icon={<IconCopy size={16} />} onClick={handleCopy}>
      {copied ? t.copied : (label ?? t.lobby.copyInvite)}
    </GridButton>
  );
}

export function QrInviteImage({
  url,
  language,
}: {
  url: string;
  language?: string | null;
}) {
  const t = playUi(language);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrUrl}
        alt={t.lobby.qrAlt}
        className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
        width={200}
        height={200}
      />
      <p className="max-w-xs text-center text-sm text-slate-500">
        {t.lobby.qrHint}
      </p>
    </div>
  );
}
