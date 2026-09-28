"use client";

import { useState } from "react";
import { BigButton } from "@/components/game/city/ui";
import {
  buildVoucherShareMessage,
  familyVoucherBadge,
  type GrowthOffer,
} from "@/lib/grid/growth-pack";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  offer: GrowthOffer;
  score?: number;
  language?: string | null;
};

export function GrowthRecapCard({ offer, score, language }: Props) {
  const t = playUi(language);
  const [copied, setCopied] = useState<"code" | "share" | null>(null);

  const shareMessage = buildVoucherShareMessage({
    score,
    discountCode: offer.discountCode,
    shareUrl: offer.shareUrl,
  });

  async function copyCode() {
    if (!offer.discountCode) return;
    try {
      await navigator.clipboard.writeText(offer.discountCode);
      setCopied("code");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function onShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareMessage.title,
          text: shareMessage.text,
          url: shareMessage.url,
        });
        return;
      }
    } catch {
      /* cancelled — copy instead */
    }
    try {
      await navigator.clipboard.writeText(shareMessage.text);
      setCopied("share");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      window.open(shareMessage.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className="rounded-3xl border border-[var(--cg-accent)]/40 bg-[var(--cg-card)] px-5 py-5">
      <p className="text-center text-lg font-bold text-[var(--cg-fg)]">
        🎉 {offer.headline}
      </p>
      {offer.body ? (
        <p className="mt-2 text-center text-sm leading-relaxed text-[var(--cg-muted)]">
          {offer.body}
        </p>
      ) : null}

      {offer.discountCode ? (
        <div className="mt-4 rounded-2xl bg-[var(--cg-bg)] px-4 py-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--cg-muted)]">
            {familyVoucherBadge()}
          </p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-[var(--cg-fg)]">
            {offer.discountCode}
          </p>
          {offer.discountNote ? (
            <p className="mt-2 text-xs text-[var(--cg-muted)]">{offer.discountNote}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <BigButton variant="accent" onClick={() => void onShare()}>
          {copied === "share"
            ? t.growth.copiedText
            : `📲 ${offer.shareLabel?.trim() || t.growth.sendFriends}`}
        </BigButton>
        {offer.discountCode ? (
          <BigButton variant="ghost" onClick={() => void copyCode()}>
            {copied === "code" ? t.growth.copiedCode : `🎫 ${t.growth.useCode}`}
          </BigButton>
        ) : null}
      </div>
    </section>
  );
}
