"use client";

import { useEffect, useMemo, useRef } from "react";
import { BigButton } from "@/components/game/city/ui";
import { hapticArrive, hapticWalkProgress } from "@/lib/grid/haptics";
import { playPlaySfx } from "@/lib/grid/play-sfx";

type Props = {
  title: string;
  targetMeters: number;
  walkedMeters: number;
  disabled: boolean;
  isPending: boolean;
  onOpen: () => void;
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
  onSimulateWalk,
}: Props) {
  const progress = Math.min(1, walkedMeters / Math.max(1, targetMeters));
  const remaining = Math.max(0, Math.ceil(targetMeters - walkedMeters));
  const complete = progress >= 1;
  const arrivedRef = useRef(false);
  const lastPulseRef = useRef(0);

  useEffect(() => {
    if (complete) {
      if (!arrivedRef.current) {
        arrivedRef.current = true;
        playPlaySfx("arrive");
        hapticArrive();
      }
      return;
    }
    arrivedRef.current = false;
    const now = Date.now();
    // Soft haptic while walking — interval shortens slightly as the ring fills
    const interval = Math.round(1400 - progress * 500);
    if (progress > 0.03 && now - lastPulseRef.current > interval) {
      lastPulseRef.current = now;
      hapticWalkProgress(progress);
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
            style={{ transition: "stroke-dashoffset 0.35s ease-out" }}
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
              <p className="text-3xl font-bold tabular-nums text-[var(--cg-fg)]">{remaining}</p>
              <p className="mt-1 text-sm text-[var(--cg-muted)]">Meter übrig</p>
              <p className="mt-2 text-xs tabular-nums text-[var(--cg-muted)]">
                {Math.round(walkedMeters)} / {Math.round(targetMeters)} m
              </p>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 max-w-sm text-center text-sm text-[var(--cg-muted)]">
        {complete
          ? "Strecke geschafft — öffnet jetzt die Aufgabe."
          : "Der Ring füllt sich, während ihr lauft. Am Ziel vibriert das Gerät und es piept."}
      </p>

      {complete ? (
        <div className="cg-animate-pop-in mt-6 w-full max-w-sm">
          <BigButton variant="accent" disabled={disabled || isPending} onClick={onOpen}>
            Aufgabe öffnen
          </BigButton>
        </div>
      ) : onSimulateWalk && process.env.NODE_ENV === "development" ? (
        <div className="mt-6 w-full max-w-sm">
          <BigButton variant="outline" disabled={disabled || isPending} onClick={onSimulateWalk}>
            +25 m simulieren (Dev)
          </BigButton>
        </div>
      ) : null}
    </div>
  );
}
