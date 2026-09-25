"use client";

import { useEffect, useState, useTransition } from "react";
import { getStudioRecapLinks, submitGrowthRecap } from "@/app/actions/growth";
import { BigButton } from "@/components/game/city/ui";
import type { GrowthOffer } from "@/lib/grid/growth-pack";

type RecapStats = {
  teamName: string;
  score: number;
  completed: number;
  total: number;
  players: string[];
};

type Props = {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  playerId: string;
  offer: GrowthOffer;
  isLead?: boolean;
  stats?: RecapStats;
};

function storageKey(playerId: string): string {
  return `grid-growth-recap:${playerId}`;
}

export function GrowthRecapCard({
  inviteCode,
  joinCode,
  sessionId,
  playerId,
  offer,
  isLead = false,
  stats,
}: Props) {
  const [email, setEmail] = useState("");
  const [skipped, setSkipped] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resultsUrl, setResultsUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(playerId));
      if (raw === "sent") setSent(true);
      if (raw === "skipped") setSkipped(true);
    } catch {
      /* private mode */
    }
  }, [playerId]);

  useEffect(() => {
    if (!offer.studioPreview || !isLead) return;
    let cancelled = false;
    void getStudioRecapLinks({ inviteCode, joinCode, sessionId }).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setLinkError(true);
        return;
      }
      setResultsUrl(result.data.resultsUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [offer.studioPreview, isLead, inviteCode, joinCode, sessionId]);

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

  async function copyCode() {
    if (!offer.discountCode) return;
    try {
      await navigator.clipboard.writeText(offer.discountCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
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

  if (skipped) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[var(--cg-accent)]/40 bg-[var(--cg-card)] px-5 py-5">
        <p className="text-center text-lg font-bold text-[var(--cg-fg)]">{offer.headline}</p>
        {offer.body ? (
          <p className="mt-2 text-center text-sm text-[var(--cg-muted)]">{offer.body}</p>
        ) : null}
        {offer.discountCode ? (
          <div className="mt-4 rounded-2xl bg-[var(--cg-bg)] px-4 py-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cg-muted)]">
              20 % · einmal einlösbar
            </p>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-[var(--cg-fg)]">
              {offer.discountCode}
            </p>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="mt-2 text-sm font-semibold text-[var(--cg-primary)]"
            >
              {copied ? "Kopiert" : "Code kopieren"}
            </button>
            {offer.discountNote ? (
              <p className="mt-2 text-xs text-[var(--cg-muted)]">{offer.discountNote}</p>
            ) : null}
          </div>
        ) : null}
        {offer.shareUrl && offer.shareLabel ? (
          <button
            type="button"
            onClick={() => void onShare()}
            className="mt-3 w-full text-center text-sm font-semibold text-[var(--cg-primary)]"
          >
            {offer.shareLabel}
          </button>
        ) : null}
      </div>

      {isLead ? (
        <div className="rounded-3xl border border-[var(--cg-primary)]/30 bg-[var(--cg-card)] px-5 py-5">
          <p className="text-center text-lg font-bold text-[var(--cg-fg)]">
            Auswertung für HR
          </p>
          <p className="mt-2 text-center text-sm text-[var(--cg-muted)]">
            Als Team Lead bekommst du die Zahlen zum Vorlegen — zusätzlich zu deinem 20 %-Code.
          </p>
          {stats ? (
            <dl className="mt-4 space-y-2 rounded-2xl bg-[var(--cg-bg)] px-4 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--cg-muted)]">Team</dt>
                <dd className="font-bold text-[var(--cg-fg)]">{stats.teamName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--cg-muted)]">Punkte</dt>
                <dd className="font-extrabold tabular-nums text-[var(--cg-fg)]">{stats.score}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--cg-muted)]">Aufgaben</dt>
                <dd className="font-bold text-[var(--cg-fg)]">
                  {stats.completed} / {stats.total}
                </dd>
              </div>
              {stats.players.length > 0 ? (
                <div>
                  <dt className="text-[var(--cg-muted)]">Spieler</dt>
                  <dd className="mt-1 font-semibold text-[var(--cg-fg)]">
                    {stats.players.join(" · ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {offer.studioPreview ? (
            <div className="mt-4 space-y-3">
              <p className="text-center text-xs text-[var(--cg-muted)]">
                Studio-Test: keine Mail. Dieser Link stünde in der HR-Mail.
              </p>
              {resultsUrl ? (
                <>
                  <BigButton
                    variant="accent"
                    onClick={() => {
                      window.open(resultsUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Auswertung öffnen
                  </BigButton>
                  <p className="break-all text-center text-xs text-[var(--cg-muted)]">{resultsUrl}</p>
                </>
              ) : (
                <p className="text-center text-sm text-[var(--cg-muted)]">
                  {linkError ? "Link gerade nicht verfügbar." : "Link wird geladen…"}
                </p>
              )}
            </div>
          ) : sent ? (
            <p className="mt-4 text-center text-sm font-semibold text-[var(--cg-success)]">
              Unterwegs. Score und Fotos gehen an deine Mail. Einmal, kein Abo.
            </p>
          ) : (
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
                  placeholder="hr@firma.de"
                  className="w-full rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-bg)] px-4 py-3 text-base text-[var(--cg-fg)] outline-none placeholder:text-[var(--cg-muted)]"
                />
              </label>
              {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
              <BigButton type="submit" disabled={isPending}>
                {isPending ? "Senden…" : offer.ctaLabel}
              </BigButton>
            </form>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setSkipped(true);
          remember("skipped");
        }}
        className="w-full text-center text-sm text-[var(--cg-muted)]"
      >
        {offer.skipLabel}
      </button>
    </div>
  );
}
