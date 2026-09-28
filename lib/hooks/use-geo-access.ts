"use client";

import { useCallback, useEffect, useState } from "react";

export type GeoAccess = "checking" | "ok" | "prompt" | "denied" | "unsupported";

function readPermissionState(state: PermissionState): Exclude<GeoAccess, "checking" | "unsupported"> {
  if (state === "granted") return "ok";
  if (state === "denied") return "denied";
  return "prompt";
}

/**
 * Team-lead GPS gate. Detects a hard browser block (denied / missing API)
 * without waiting for the 15 s watch timeout.
 */
export function useGeoAccess(enabled: boolean): {
  access: GeoAccess;
  blocked: boolean;
  retry: () => void;
} {
  const [access, setAccess] = useState<GeoAccess>(enabled ? "checking" : "ok");

  const syncFromApi = useCallback(async () => {
    if (typeof navigator === "undefined") return "checking" as GeoAccess;
    if (!navigator.geolocation) return "unsupported";
    try {
      const status = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      return readPermissionState(status.state);
    } catch {
      return "prompt";
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setAccess("ok");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAccess("unsupported");
      return;
    }

    let cancelled = false;
    let permission: PermissionStatus | null = null;

    void (async () => {
      try {
        permission = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (cancelled) return;
        setAccess(readPermissionState(permission.state));
        permission.onchange = () => {
          setAccess(readPermissionState(permission!.state));
        };
      } catch {
        if (!cancelled) setAccess("prompt");
      }
    })();

    return () => {
      cancelled = true;
      if (permission) permission.onchange = null;
    };
  }, [enabled]);

  const retry = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAccess("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setAccess("ok"),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setAccess("denied");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8_000 },
    );
  }, []);

  useEffect(() => {
    if (!enabled || access !== "denied") return;

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void syncFromApi().then((next) => {
        if (next === "ok") window.location.reload();
        else setAccess(next);
      });
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [access, enabled, syncFromApi]);

  return {
    access,
    blocked: access === "denied" || access === "unsupported",
    retry,
  };
}
