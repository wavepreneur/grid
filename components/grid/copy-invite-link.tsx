"use client";

import { useState } from "react";
import { GridButton, GridError } from "@/components/grid/grid-shell";
import { IconCopy } from "@/components/cms/studio-icons";

type CopyInviteLinkProps = {
  url: string;
  label?: string;
};

export function CopyInviteLink({
  url,
  label = "Einladungslink kopieren",
}: CopyInviteLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs break-all text-slate-600">
        {url}
      </div>
      <GridButton type="button" icon={<IconCopy size={16} />} onClick={handleCopy}>
        {copied ? "Kopiert!" : label}
      </GridButton>
    </div>
  );
}

export function QrInviteImage({ url }: { url: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrUrl}
        alt="QR-Code für Teammate-Link"
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        width={220}
        height={220}
      />
      <p className="text-center text-xs text-slate-500">
        Mitspieler scannen diesen QR-Code, um der Lobby beizutreten.
      </p>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <GridError message={message} />;
}
