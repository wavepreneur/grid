"use client";

import { useEffect, useState, useTransition } from "react";
import { submitGrowthRecap } from "@/app/actions/growth";
import { BigButton } from "@/components/game/city/ui";
import type { GrowthOffer } from "@/lib/grid/growth-pack";

type Props = {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  playerId: string;
  offer: GrowthOffer;
};

function storageKey(playerId: string): string {
  return `grid-growth-recap:${playerId}`;
}

export function GrowthRecapCard({ inviteCode, joinCode, sessionId, playerId, offer }: Props) {
  const [email, setEmail] = useState("");
  const [skipped, setSkipped] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(playerId));
      if (raw === "sent") setSent(true);
      if (raw === "skipped") setSkipped(true);
    } catch {
      /* private mode */
    }
  }, [playerId]);

  function remember(value: "sent" | "skipped") {
    try {
      window.localStorage.setItem(storageKey(playerId), value);
    } catch {
      /* ignore */
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitGrowthRecap({
        inviteCode,
        joinCode,
        sessionId,
        email,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSent(true);
      remember("sent");
    });
  }

  async function onShare() {
    if (!offer.shareUrl) return;
    const text = offer.shareLabel?.trim() || offer.headline;
    try {
      if (navigator.share) {
        await navigator.share({ title: offer.headline, text, url: offer.shareUrl });
        return;
      }
    } catch {
      /* user cancelled or share failed — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(offer.shareUrl);
    } catch {
      window.open(offer.shareUrl, "_blank", "noopener,noreferrer");
    }
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-[var(--cg-success)]/35 bg-[var(--cg-card)] px-5 py-5 text-center">
        <p className="text-sm font-semibold text-[var(--cg-fg)]">Unterwegs.</p>
        <p className="mt-2 text-sm text-[var(--cg-muted)]">
          Score und Fotos gehen an deine Mail. Einmal, kein Abo.
        </p>
      </div>
    );
  }

  if (skipped) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-[var(--cg-primary)]/30 bg-[var(--cg-card)] px-5 py-5">
      <p className="text-center text-lg font-bold text-[var(--cg-fg)]">{offer.headline}</p>
      {offer.body ? (
        <p className="mt-2 text-center text-sm text-[var(--cg-muted)]">{offer.body}</p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block">
          <span className="sr-only">E-Mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="du@mail.de"
            className="w-full rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3 text-base text-[var(--cg-fg)] outline-none placeholder:text-[var(--cg-muted)]"
          />
        </label>
        {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
        <BigButton type="submit" disabled={isPending}>
          {isPending ? "Senden…" : offer.ctaLabel}
        </BigButton>
      </form>
      {offer.shareUrl && offer.shareLabel ? (
        <button
          type="button"
          onClick={() => void onShare()}
          className="mt-3 w-full text-center text-sm font-semibold text-[var(--cg-primary)]"
        >
          {offer.shareLabel}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setSkipped(true);
          remember("skipped");
        }}
        className="mt-3 w-full text-center text-sm text-[var(--cg-muted)]"
      >
        {offer.skipLabel}
      </button>
    </div>
  );
}
