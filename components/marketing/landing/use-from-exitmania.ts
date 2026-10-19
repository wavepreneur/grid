"use client";

import { useSyncExternalStore } from "react";

const KEY = "tells:from";
const EXITMANIA = "exitmania";

function readSource(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("from");
  try {
    if (fromUrl === EXITMANIA) {
      window.sessionStorage.setItem(KEY, fromUrl);
      return fromUrl;
    }
    return window.sessionStorage.getItem(KEY);
  } catch {
    return fromUrl;
  }
}

const subscribe = () => () => {};

/** True when the visitor came from Exitmania (?from=exitmania), kept for the browser session. */
export function useFromExitmania(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readSource() === EXITMANIA,
    () => false,
  );
}

export function landingSource(fromExitmania: boolean): "exitmania" | "tells.team" {
  return fromExitmania ? EXITMANIA : "tells.team";
}
