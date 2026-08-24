"use client";

import { useState } from "react";
import { GridButton } from "@/components/grid/grid-shell";
import { IconCopy } from "@/components/cms/studio-icons";

type CopyInviteLinkProps = {
  url: string;
  label?: string;
};

export function CopyInviteLink({
  url,
  label = "Link kopieren",
}: CopyInviteLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <GridButton type="button" variant="secondary" icon={<IconCopy size={16} />} onClick={handleCopy}>
      {copied ? "Kopiert!" : label}
    </GridButton>
  );
}

export function QrInviteImage({ url }: { url: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrUrl}
        alt="QR-Code zum Mitspielen"
        className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
        width={200}
        height={200}
      />
      <p className="max-w-xs text-center text-sm text-slate-500">
        Freunde scannen den Code — und sind sofort dabei.
      </p>
    </div>
  );
}
