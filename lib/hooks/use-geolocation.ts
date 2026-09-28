"use client";

import { useEffect, useState } from "react";
import type { GeolocationSample } from "@/lib/grid/level-types";

type GeolocationState = {
  sample: GeolocationSample | null;
  error: string | null;
  isLoading: boolean;
  /** Browser blocked location (not a GPS timeout). */
  denied: boolean;
};

export function useGeolocation(enabled: boolean): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    sample: null,
    error: null,
    isLoading: enabled,
    denied: false,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ sample: null, error: null, isLoading: false, denied: false });
      return;
    }

    if (!navigator.geolocation) {
      setState({
        sample: null,
        error: "GPS wird von diesem Gerät nicht unterstützt.",
        isLoading: false,
        denied: true,
      });
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null, denied: false }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          sample: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
          isLoading: false,
          denied: false,
        });
      },
      (error) => {
        setState({
          sample: null,
          error: error.message || "GPS-Zugriff verweigert.",
          isLoading: false,
          denied: error.code === error.PERMISSION_DENIED,
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
