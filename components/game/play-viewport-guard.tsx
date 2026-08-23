"use client";

import { useEffect } from "react";

/**
 * Keeps the play surface at device scale after lobby inputs (iOS focus-zoom)
 * and soft-blocks accidental browser Back from abandoning the session mid-flow.
 */
export function PlayViewportGuard() {
  useEffect(() => {
    // Drop focus so Safari does not keep a zoomed visual viewport.
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();

    // Nudge layout after orientation / URL-bar chrome changes.
    const vv = window.visualViewport;
    function settle() {
      document.documentElement.style.setProperty(
        "--vv-height",
        `${Math.round(vv?.height ?? window.innerHeight)}px`,
      );
    }
    settle();
    vv?.addEventListener("resize", settle);
    vv?.addEventListener("scroll", settle);
    window.addEventListener("orientationchange", settle);

    return () => {
      vv?.removeEventListener("resize", settle);
      vv?.removeEventListener("scroll", settle);
      window.removeEventListener("orientationchange", settle);
    };
  }, []);

  useEffect(() => {
    // Replace current history entry marker so Back tends to leave the event cleanly
    // instead of bouncing through intermediate lobby/captain steps after start.
    const path = window.location.pathname + window.location.search;
    window.history.replaceState({ gridPlay: true }, "", path);
  }, []);

  return null;
}
