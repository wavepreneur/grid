"use client";

import { useEffect, useRef, useState } from "react";
import { playPlaySfx } from "@/lib/grid/play-sfx";

type Props = {
  remainingSeconds: number;
  isExpired: boolean;
  paused: boolean;
  onExpire: () => void;
};

/**
 * Shared mission clock: 60s banner on every device, click on the last 10s,
 * then expire. Uses the same startedAt + duration as the HUD.
 */
export function MissionTimeAlerts({
  remainingSeconds,
  isExpired,
  paused,
  onExpire,
}: Props) {
  const warned60Ref = useRef(false);
  const lastTickRef = useRef<number | null>(null);
  const expireSentRef = useRef(false);
  const [showMinute, setShowMinute] = useState(false);

  useEffect(() => {
    if (paused || remainingSeconds > 60) return;
    if (remainingSeconds <= 0) return;
    if (warned60Ref.current) return;
    warned60Ref.current = true;
    playPlaySfx("ping");
    setShowMinute(true);
    const hide = window.setTimeout(() => setShowMinute(false), 4500);
    return () => window.clearTimeout(hide);
  }, [paused, remainingSeconds]);

  useEffect(() => {
    if (paused || remainingSeconds <= 0 || remainingSeconds > 10) return;
    if (lastTickRef.current === remainingSeconds) return;
    lastTickRef.current = remainingSeconds;
    playPlaySfx("tick");
  }, [paused, remainingSeconds]);

  useEffect(() => {
    if (paused || !isExpired || expireSentRef.current) return;
    expireSentRef.current = true;
    onExpire();
  }, [isExpired, onExpire, paused]);

  if (!showMinute || paused || remainingSeconds <= 10) return null;

  return (
    <div
      role="status"
      className="city-game fixed inset-x-0 top-0 z-[200] bg-[var(--cg-bg)] cg-animate-slide-down"
    >
      <div className="mx-auto w-full max-w-md px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="rounded-2xl bg-[var(--cg-card)] px-4 py-3.5 text-center shadow-[var(--cg-shadow-lift)] ring-2 ring-[var(--cg-primary)]/35">
          <p className="text-sm font-bold text-[var(--cg-fg)]">Noch 1 Minute</p>
          <p className="mt-0.5 text-sm text-[var(--cg-muted)]">
            Die Zeit läuft ab — letzte Aufgaben, dann Game Over.
          </p>
        </div>
      </div>
    </div>
  );
}
