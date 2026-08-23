"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import type { PurchasedTileHint } from "@/lib/grid/game-state";
import { playPlaySfx } from "@/lib/grid/play-sfx";

type Props = {
  purchasedHints: Record<string, PurchasedTileHint>;
  myPlayerId?: string | null;
};

type Toast = {
  id: string;
  unlockedBy: string;
  textPreview: string;
};

/**
 * When a teammate unlocks a tip, every device gets a short banner
 * so nobody misses the shared hint.
 */
export function HintUnlockToast({ purchasedHints, myPlayerId }: Props) {
  const seenRef = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const entries = Object.entries(purchasedHints);
    if (seenRef.current === null) {
      seenRef.current = new Set(entries.map(([id]) => id));
      return;
    }

    for (const [tileId, hint] of entries) {
      if (seenRef.current.has(tileId)) continue;
      seenRef.current.add(tileId);
      // Skip toast for the purchaser — they already see the tip in the sheet.
      if (hint.unlocked_by_player_id && myPlayerId && hint.unlocked_by_player_id === myPlayerId) {
        continue;
      }
      playPlaySfx("ping");
      setToast({
        id: tileId,
        unlockedBy: hint.unlocked_by?.trim() || "Teammitglied",
        textPreview: hint.text.trim().slice(0, 120),
      });
      break;
    }
  }, [purchasedHints, myPlayerId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[110] flex justify-center px-4">
      <div
        role="status"
        className="cg-animate-pop-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-[var(--cg-card)] px-4 py-3 shadow-[var(--cg-shadow-lift)] ring-1 ring-[var(--cg-success)]/35"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cg-success)] text-white">
          <Lightbulb className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cg-success)]">
            Tipp fürs Team
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--cg-fg)]">
            {toast.unlockedBy} hat einen Tipp freigeschaltet
          </p>
          {toast.textPreview ? (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--cg-muted)]">{toast.textPreview}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-bold text-[var(--cg-muted)]"
          onClick={() => setToast(null)}
        >
          OK
        </button>
      </div>
    </div>
  );
}
