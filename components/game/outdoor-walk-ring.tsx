"use client";

import { useEffect, useMemo, useRef } from "react";
import { BigButton } from "@/components/game/city/ui";
import { hapticWalkProgress } from "@/lib/grid/haptics";
import { playPlaySfx } from "@/lib/grid/play-sfx";

type Props = {
  title: string;
  targetMeters: number;
  walkedMeters: number;
  disabled: boolean;
  isPending: boolean;
  onOpen: () => void;
  /**
   * Alpha lead override when GPS stalls — always available so teams never soft-lock.
   */
  onForceOpen?: () => void;
  showForceOpen?: boolean;
  gpsError?: string | null;
  /** Dev-only: add meters without walking. */
  onSimulateWalk?: () => void;
};

const RING_SIZE = 220;
const STROKE = 14;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function OutdoorWalkRing({
  title,
  targetMeters,
  walkedMeters,
  disabled,
  isPending,
  onOpen,
  onForceOpen,
  showForceOpen = false,
  gpsError = null,
  onSimulateWalk,
}: Props) {
  const progress = Math.min(1, walkedMeters / Math.max(1, targetMeters));
  const targetShown = Math.max(0, Math.round(targetMeters));
  const walkedShown = Math.min(targetShown, Math.max(0, Math.round(walkedMeters)));
  const remaining = Math.max(0, targetShown - walkedShown);
  const complete = walkedMeters >= targetMeters - 0.05;
  const arrivedRef = useRef(false);
  const lastPulseRef = useRef(0);
  const lastPingBucketRef = useRef(-1);

  useEffect(() => {
    if (complete) {
      if (!arrivedRef.current) {
        arrivedRef.current = true;
        playPlaySfx("arrive");
      }
      return;
    }
    arrivedRef.current = false;
    const now = Date.now();
    // Pulses get more frequent as the ring fills (every ~1.2s → ~0.55s)
    const interval = Math.round(1200 - progress * 650);
    if (progress > 0.02 && now - lastPulseRef.current > interval) {
      lastPulseRef.current = now;
      hapticWalkProgress(progress);
    }
    // Soft audio tick every ~20% of the walk (0, 20, 40, 60, 80 %)
    const bucket = Math.floor(progress * 5);
    if (bucket > 0 && bucket !== lastPingBucketRef.current && progress < 1) {
      lastPingBucketRef.current = bucket;
      playPlaySfx("ping");
    }
  }, [complete, progress, walkedMeters]);

  const dashOffset = useMemo(() => CIRC * (1 - progress), [progress]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-8">
      <p className="text-center text-sm text-[var(--cg-muted)]">Lauft frei — kein fester Punkt nötig</p>
      <h2 className="mt-2 max-w-sm text-center text-xl font-bold text-[var(--cg-fg)]">{title}</h2>

      <div className="relative mt-8">
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className={`-rotate-90 ${complete ? "cg-animate-success-pulse" : ""}`}
          aria-hidden
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--cg-secondary)"
            strokeWidth={STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={complete ? "var(--cg-success)" : "var(--cg-primary)"}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 0.2s linear, stroke 0.3s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {complete ? (
            <>
              <p className="text-3xl font-bold text-[var(--cg-success)]">Fertig</p>
              <p className="mt-1 text-sm text-[var(--cg-muted)]">{Math.round(targetMeters)} m</p>
            </>
          ) : (
            <>
              <p className="text-5xl font-bold tabular-nums leading-none text-[var(--cg-fg)]">
                {remaining}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--cg-muted)]">Meter übrig</p>
              <p className="mt-2 text-sm tabular-nums font-medium text-[var(--cg-fg)]">
                {walkedShown} m gelaufen
              </p>
            </>
          )}
        </div>
      </div>

      {!complete ? (
        <div className="mt-5 w-full max-w-[220px]">
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--cg-secondary)]">
            <div
              className="h-full rounded-full bg-[var(--cg-primary)] transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs tabular-nums text-[var(--cg-muted)]">
            {walkedShown} / {targetShown} m
          </p>
        </div>
      ) : null}

      <p className="mt-6 max-w-sm text-center text-sm text-[var(--cg-muted)]">
        {complete
          ? "Strecke geschafft — öffnet jetzt die Aufgabe."
          : "Der Ring füllt sich, während ihr lauft. Am Ziel vibriert das Gerät und es piept."}
      </p>

      {gpsError ? (
        <p className="mt-3 max-w-sm text-center text-sm text-[var(--cg-destructive)]">{gpsError}</p>
      ) : null}

      {complete ? (
        <div className="cg-animate-pop-in mt-6 w-full max-w-sm">
          <BigButton variant="accent" disabled={disabled || isPending} onClick={onOpen}>
            Aufgabe öffnen
          </BigButton>
        </div>
      ) : (
        <div className="mt-6 w-full max-w-sm space-y-3">
          {onSimulateWalk && process.env.NODE_ENV === "development" ? (
            <BigButton variant="outline" disabled={disabled || isPending} onClick={onSimulateWalk}>
              +25 m simulieren (Dev)
            </BigButton>
          ) : null}
          {showForceOpen && onForceOpen ? (
            <BigButton variant="outline" disabled={disabled || isPending} onClick={onForceOpen}>
              Aufgabe trotzdem öffnen
            </BigButton>
          ) : null}
          {showForceOpen ? (
            <p className="text-center text-xs text-[var(--cg-muted)]">
              Nur wenn GPS hängt oder die Strecke klar gelaufen ist — Alpha entscheidet fürs Team.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
