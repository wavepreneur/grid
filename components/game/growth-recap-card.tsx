"use client";

import { useState } from "react";
import { BigButton } from "@/components/game/city/ui";
import {
  buildVoucherShareMessage,
  formatVoucherUntil,
  liveFamilyVoucherUntil,
  LIVE_FAMILY_VOUCHER,
  type GrowthOffer,
} from "@/lib/grid/growth-pack";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  offer: GrowthOffer;
  score?: number;
  language?: string | null;
};

export function GrowthRecapCard({ offer, score, language }: Props) {
  const t = playUi(language).growth;
  const [copied, setCopied] = useState<"code" | "share" | null>(null);
  const until = formatVoucherUntil(liveFamilyVoucherUntil(), language);

  const shareMessage = buildVoucherShareMessage({
    score,
    discountCode: offer.discountCode,
    shareUrl: offer.shareUrl,
    language,
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
        🎉 {t.familyHeadline}
      </p>
      <p className="mt-2 text-center text-sm leading-relaxed text-[var(--cg-muted)]">
        {t.familyBody}
      </p>

      {offer.discountCode ? (
        <div className="mt-4 rounded-2xl bg-[var(--cg-bg)] px-4 py-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--cg-muted)]">
            {t.familyBadge(LIVE_FAMILY_VOUCHER.percent, LIVE_FAMILY_VOUCHER.validDays)}
          </p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-[var(--cg-fg)]">
            {offer.discountCode}
          </p>
          <p className="mt-2 text-xs text-[var(--cg-muted)]">{t.familyNote(until)}</p>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <BigButton variant="accent" onClick={() => void onShare()}>
          {copied === "share" ? t.copiedText : `📲 ${t.familyCta}`}
        </BigButton>
        {offer.discountCode ? (
          <BigButton variant="ghost" onClick={() => void copyCode()}>
            {copied === "code" ? t.copiedCode : `🎫 ${t.useCode}`}
          </BigButton>
        ) : null}
      </div>
    </section>
  );
}
