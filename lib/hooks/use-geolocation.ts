"use client";

import { useEffect, useState } from "react";
import type { GeolocationSample } from "@/lib/grid/level-types";
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

export function useGeolocation(enabled: boolean): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    sample: null,
    errorKind: null,
    isLoading: enabled,
    denied: false,
  });

  useEffect(() => {
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
        setState({
          sample: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          errorKind: null,
          isLoading: false,
          denied: false,
        });
      },
      (error) => {
        const kind = geoErrorKindFromCode(error.code);
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
