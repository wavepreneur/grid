"use client";

import { useEffect, useRef, useState } from "react";
import type { GeolocationSample } from "@/lib/grid/level-types";
import { distanceMeters } from "@/lib/grid/geofence";

type WalkedDistanceState = {
  sample: GeolocationSample | null;
  meters: number;
  /** Display meters eased toward `meters` for a smooth ring. */
  displayMeters: number;
  error: string | null;
  isLoading: boolean;
};

type Options = {
  minStepMeters?: number;
  maxStepMeters?: number;
  /** Persist progress across remounts / failed open attempts. */
  storageKey?: string | null;
};

function readStoredMeters(key: string | null | undefined): number {
  if (!key || typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(key);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeStoredMeters(key: string | null | undefined, meters: number) {
  if (!key || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, String(Math.max(0, meters)));
  } catch {
    /* ignore quota */
  }
}

/**
 * Accumulates walked distance from GPS while enabled.
 * Uses fine steps + display easing so the ring fills smoothly meter-by-meter.
 */
export function useWalkedDistance(
  enabled: boolean,
  options?: Options,
): WalkedDistanceState {
  const minStep = options?.minStepMeters ?? 0.6;
  const maxStep = options?.maxStepMeters ?? 35;
  const storageKey = options?.storageKey ?? null;

  const [sample, setSample] = useState<GeolocationSample | null>(null);
  const [meters, setMeters] = useState(() => readStoredMeters(storageKey));
  const [displayMeters, setDisplayMeters] = useState(() => readStoredMeters(storageKey));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const lastRef = useRef<GeolocationSample | null>(null);
  const metersRef = useRef(meters);
  metersRef.current = meters;

  // Restore when storage key changes (new level).
  useEffect(() => {
    const stored = readStoredMeters(storageKey);
    setMeters(stored);
    setDisplayMeters(stored);
    lastRef.current = null;
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError("GPS wird von diesem Gerät nicht unterstützt.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next: GeolocationSample = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setSample(next);
        setIsLoading(false);
        setError(null);

        const prev = lastRef.current;
        lastRef.current = next;
        if (!prev) return;

        const step = distanceMeters(prev, next);
        // Ignore GPS jitter and teleport jumps; accept ~1 m class steps.
        const accuracy = Math.max(prev.accuracy ?? 0, next.accuracy ?? 0);
        const effectiveMin = Math.max(minStep, Math.min(2.5, accuracy * 0.15));
        if (step < effectiveMin || step > maxStep) return;

        setMeters((m) => {
          const nextMeters = m + step;
          writeStoredMeters(storageKey, nextMeters);
          return nextMeters;
        });
      },
      (geoError) => {
        setError(geoError.message || "GPS-Zugriff verweigert.");
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 800,
        timeout: 20_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, minStep, maxStep, storageKey]);

  // Ease displayed meters toward real meters (~smooth ring).
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const tick = () => {
      setDisplayMeters((current) => {
        const target = metersRef.current;
        const delta = target - current;
        if (Math.abs(delta) < 0.05) return target;
        // Catch up quickly but without jumps of several meters.
        return current + delta * 0.22;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled]);

  return { sample, meters, displayMeters, error, isLoading };
}

export function clearWalkedDistanceStorage(storageKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}
