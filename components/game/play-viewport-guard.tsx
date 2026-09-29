"use client";

import { useEffect } from "react";
import { playUiLang } from "@/lib/grid/play-ui";

/** Keep Safari from translating booked English chrome into German. */
export function PlayDocumentLang({ language }: { language?: string | null }) {
  useEffect(() => {
    const html = document.documentElement;
    const prevLang = html.lang;
    const prevTranslate = html.getAttribute("translate");
    html.lang = playUiLang(language);
    html.setAttribute("translate", "no");
    return () => {
      html.lang = prevLang;
      if (prevTranslate == null) html.removeAttribute("translate");
      else html.setAttribute("translate", prevTranslate);
    };
  }, [language]);
  return null;
}

function layoutHeightPx(): number {
  return Math.round(window.innerHeight);
}

function dialogOpen(): boolean {
  return Boolean(document.querySelector('[aria-modal="true"]'));
}

/** Drop leftover sheet scroll-locks. Never jump the page back to top. */
export function recoverPlayViewport() {
  if (typeof window === "undefined") return;
  if (dialogOpen()) return;

  const html = document.documentElement;
  const body = document.body;
  if (html.style.overflow === "hidden") html.style.overflow = "";
  if (body.style.overflow === "hidden") body.style.overflow = "";
  html.style.overscrollBehavior = "";
  body.style.overscrollBehavior = "";
  html.style.setProperty("--vv-height", `${layoutHeightPx()}px`);
}

/**
 * Keeps the play surface at device scale after lobby inputs (iOS focus-zoom)
 * and soft-blocks accidental browser Back from abandoning the session mid-flow.
 */
export function PlayViewportGuard() {
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();

    const vv = window.visualViewport;
    function settle() {
      document.documentElement.style.setProperty("--vv-height", `${layoutHeightPx()}px`);
    }
    settle();
    vv?.addEventListener("resize", settle);
    window.addEventListener("orientationchange", settle);

    return () => {
      vv?.removeEventListener("resize", settle);
      window.removeEventListener("orientationchange", settle);
    };
  }, []);

  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    window.history.replaceState({ gridPlay: true }, "", path);
  }, []);

  return null;
}
