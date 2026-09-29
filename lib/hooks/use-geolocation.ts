"use client";

import { useEffect, useRef, useState } from "react";
import type { GeolocationSample } from "@/lib/grid/level-types";
import { distanceMeters } from "@/lib/grid/geofence";
import {
  geoErrorKindFromCode,
  type GeoErrorKind,
} from "@/lib/grid/play-ui";

type GeolocationState = {
  sample: GeolocationSample | null;
  errorKind: GeoErrorKind | null;
  isLoading: boolean;
  /** Browser blocked location (not a GPS timeout). */
  denied: boolean;
};

const MIN_MOVE_METERS = 4;
const MIN_ACCURACY_DELTA_METERS = 20;

export function useGeolocation(enabled: boolean): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    sample: null,
    errorKind: null,
    isLoading: enabled,
    denied: false,
  });
  const lastSampleRef = useRef<GeolocationSample | null>(null);

  useEffect(() => {
    lastSampleRef.current = null;
    if (!enabled) {
      setState({ sample: null, errorKind: null, isLoading: false, denied: false });
      return;
    }

    if (!navigator.geolocation) {
      setState({
        sample: null,
        errorKind: "unsupported",
        isLoading: false,
        denied: true,
      });
      return;
    }

    setState((current) => ({ ...current, isLoading: true, errorKind: null, denied: false }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next: GeolocationSample = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        const prev = lastSampleRef.current;
        if (prev) {
          const moved = distanceMeters(prev, next);
          const accDelta = Math.abs((prev.accuracy ?? 0) - (next.accuracy ?? 0));
          if (moved < MIN_MOVE_METERS && accDelta < MIN_ACCURACY_DELTA_METERS) {
            return;
          }
        }
        lastSampleRef.current = next;
        setState({
          sample: next,
          errorKind: null,
          isLoading: false,
          denied: false,
        });
      },
      (error) => {
        const kind = geoErrorKindFromCode(error.code);
        lastSampleRef.current = null;
        setState({
          sample: null,
          errorKind: kind,
          isLoading: false,
          denied: kind === "denied" || kind === "unsupported",
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return state;
}
