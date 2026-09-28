"use client";

import { useState } from "react";
import { BigButton } from "@/components/game/city/ui";
import { WALLET_UNLOCK_COST, type WalletNote } from "@/lib/grid/wallet";
import { playUi } from "@/lib/grid/play-ui";

type Props = {
  notes: WalletNote[];
  score?: number;
  onPurchase?: (level: number) => void;
  purchasePending?: boolean;
  /** Game Over — locked hints stay visible but cannot be bought. */
  purchasesClosed?: boolean;
  language?: string | null;
};

export function TeamWalletList({
  notes,
  score = 0,
  onPurchase,
  purchasePending = false,
  purchasesClosed = false,
  language,
}: Props) {
  const t = playUi(language);
  const [confirmLevel, setConfirmLevel] = useState<number | null>(null);

  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-6">
        <p className="text-base leading-relaxed text-[var(--cg-muted)]">{t.walletUi.intro}</p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {notes.map((note) => {
        if (note.locked) {
          if (purchasesClosed) {
            return (
              <li
                key={note.id}
                className="rounded-2xl border-2 border-[var(--cg-accent)] bg-[var(--cg-accent)]/15 px-4 py-3.5 shadow-[var(--cg-shadow-soft)]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cg-accent-fg)]">
                  {t.walletUi.afterLevelSkipped(note.level)}
                </p>
                <p className="mt-1 text-base font-bold text-[var(--cg-fg)]">{note.title}</p>
                {note.body ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--cg-fg)]">
                    {note.body}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-semibold text-[var(--cg-accent-fg)]">
                  {t.walletUi.skippedSolution}
                </p>
              </li>
            );
          }
          const confirming = confirmLevel === note.level;
          const canAfford = score >= WALLET_UNLOCK_COST;
          const canBuy = Boolean(onPurchase);
          return (
            <li
              key={note.id}
              className="rounded-2xl bg-[var(--cg-bg)] px-4 py-3.5 shadow-[var(--cg-shadow-soft)]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cg-muted)]">
                {t.walletUi.afterLevel(note.level)}
              </p>
              <p className="mt-1 text-base font-bold text-[var(--cg-fg)]">{note.title}</p>
              {confirming && canBuy ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm leading-relaxed text-[var(--cg-fg)]">
                    {t.walletUi.buyQ(WALLET_UNLOCK_COST)}
                  </p>
                  {!canAfford ? (
                    <p className="text-sm font-semibold text-[var(--cg-destructive)]">
                      {t.walletUi.notEnough(score, WALLET_UNLOCK_COST)}
                    </p>
                  ) : null}
                  <BigButton
                    variant="accent"
                    disabled={purchasePending || !canAfford}
                    onClick={() => onPurchase?.(note.level)}
                  >
                    {purchasePending ? t.walletUi.buying : t.walletUi.buyYes}
                  </BigButton>
                  <BigButton
                    variant="ghost"
                    disabled={purchasePending}
                    onClick={() => setConfirmLevel(null)}
                  >
                    {t.hint.cancel}
                  </BigButton>
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <p className="text-sm leading-relaxed text-[var(--cg-muted)]">
                    {t.walletUi.canShow(WALLET_UNLOCK_COST)}
                  </p>
                  {canBuy ? (
                    <BigButton
                      variant="accent"
                      disabled={purchasePending}
                      onClick={() => setConfirmLevel(note.level)}
                    >
                      {t.walletUi.showFor(WALLET_UNLOCK_COST)}
                    </BigButton>
                  ) : null}
                </div>
              )}
            </li>
          );
        }

        return (
          <li
            key={note.id}
            className="rounded-2xl bg-[var(--cg-bg)] px-4 py-3.5 shadow-[var(--cg-shadow-soft)]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cg-muted)]">
              {t.walletUi.afterLevel(note.level)}
            </p>
            <p className="mt-1 text-base font-bold text-[var(--cg-fg)]">{note.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--cg-fg)]">
              {note.body}
            </p>
            {note.purchased_by ? (
              <p className="mt-2 text-xs font-semibold text-[var(--cg-muted)]">
                {t.walletUi.boughtBy(note.purchased_by)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
