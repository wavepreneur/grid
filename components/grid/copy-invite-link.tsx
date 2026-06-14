"use client";

import { useState } from "react";
import { GridButton, GridError } from "@/components/grid/grid-shell";

type CopyInviteLinkProps = {
  url: string;
  label?: string;
};

export function CopyInviteLink({
  url,
  label = "Teammate-Link kopieren",
}: CopyInviteLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-[var(--grid-border)] bg-black/30 px-4 py-3 text-xs break-all text-[var(--grid-muted)]">
        {url}
      </div>
      <GridButton type="button" onClick={handleCopy}>
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
        className="rounded-xl border border-[var(--grid-border)] bg-white p-3"
        width={220}
        height={220}
      />
      <p className="text-center text-xs text-[var(--grid-muted)]">
        Mitspieler scannen diesen QR-Code, um der Lobby beizutreten.
      </p>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <GridError message={message} />;
}
