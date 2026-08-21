"use client";

import { useEffect, useRef, useState } from "react";
import type { GeolocationSample } from "@/lib/grid/level-types";
import { distanceMeters } from "@/lib/grid/geofence";
import { useGeolocation } from "@/lib/hooks/use-geolocation";

type WalkedDistanceState = {
  sample: GeolocationSample | null;
  meters: number;
  error: string | null;
  isLoading: boolean;
};

/**
 * Accumulates walked distance from successive GPS samples while enabled.
 * Filters tiny jitter under `minStepMeters` and large GPS jumps over `maxStepMeters`.
 */
export function useWalkedDistance(
  enabled: boolean,
  options?: { minStepMeters?: number; maxStepMeters?: number },
): WalkedDistanceState {
  const minStep = options?.minStepMeters ?? 2.5;
  const maxStep = options?.maxStepMeters ?? 40;
  const { sample, error, isLoading } = useGeolocation(enabled);
  const [meters, setMeters] = useState(0);
  const lastRef = useRef<GeolocationSample | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMeters(0);
      lastRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !sample) return;
    const prev = lastRef.current;
    lastRef.current = sample;
    if (!prev) return;
    const step = distanceMeters(prev, sample);
    if (step < minStep || step > maxStep) return;
    setMeters((m) => m + step);
  }, [enabled, sample, minStep, maxStep]);

  return { sample, meters, error, isLoading };
}
