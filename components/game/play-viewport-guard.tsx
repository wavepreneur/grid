"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

function layoutHeightPx(): number {
  return Math.round(window.innerHeight);
}

function inputFocused(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  const tag = active.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || active.isContentEditable;
}

function dialogOpen(): boolean {
  return Boolean(document.querySelector('[aria-modal="true"]'));
}

function viewportIsStuck(): boolean {
  if (inputFocused()) return false;
  const vv = window.visualViewport;
  if (vv) {
    if (vv.offsetTop > 40 || vv.offsetLeft > 40) return true;
    if (vv.scale > 1.05) return true;
  }
  const html = document.documentElement;
  if (html.style.overflow === "hidden" && !dialogOpen()) return true;
  return false;
}

/** Snap iOS visual-viewport drift and leftover sheet scroll-locks. */
export function recoverPlayViewport() {
  if (typeof window === "undefined") return;

  const html = document.documentElement;
  const body = document.body;
  if (!dialogOpen()) {
    if (html.style.overflow === "hidden") html.style.overflow = "";
    if (body.style.overflow === "hidden") body.style.overflow = "";
    html.style.overscrollBehavior = "";
    body.style.overscrollBehavior = "";
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement && !inputFocused()) active.blur();

  window.scrollTo(0, 0);
  html.scrollTop = 0;
  body.scrollTop = 0;
  const shell = document.querySelector(".cg-screen-shell");
  if (shell instanceof HTMLElement) shell.scrollTop = 0;

  html.style.setProperty("--vv-height", `${layoutHeightPx()}px`);
}

/**
 * Keeps the play surface at device scale after lobby inputs (iOS focus-zoom)
 * and recovers a stuck visual viewport so the menu stays reachable.
 */
export function PlayViewportGuard() {
  const [escapeOpen, setEscapeOpen] = useState(false);

  useEffect(() => {
    recoverPlayViewport();

    const vv = window.visualViewport;
    let timer = 0;

    let recovering = false;
    function settle() {
      if (inputFocused()) {
        document.documentElement.style.setProperty(
          "--vv-height",
          `${Math.round(vv?.height ?? window.innerHeight)}px`,
        );
        return;
      }
      document.documentElement.style.setProperty("--vv-height", `${layoutHeightPx()}px`);
      if (!recovering && viewportIsStuck()) {
        recovering = true;
        recoverPlayViewport();
        window.setTimeout(() => {
          recovering = false;
        }, 400);
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setEscapeOpen(viewportIsStuck());
      }, 280);
    }

    vv?.addEventListener("resize", settle);
    vv?.addEventListener("scroll", settle);
    window.addEventListener("orientationchange", settle);
    window.addEventListener("pageshow", settle);
    document.addEventListener("visibilitychange", settle);

    return () => {
      window.clearTimeout(timer);
      vv?.removeEventListener("resize", settle);
      vv?.removeEventListener("scroll", settle);
      window.removeEventListener("orientationchange", settle);
      window.removeEventListener("pageshow", settle);
      document.removeEventListener("visibilitychange", settle);
    };
  }, []);

  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    window.history.replaceState({ gridPlay: true }, "", path);
  }, []);

  if (!escapeOpen) return null;

  const german = navigator.language.toLowerCase().startsWith("de");

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-4"
      style={{
        top: Math.round((window.visualViewport?.offsetTop ?? 0) + 72),
      }}
    >
      <button
        type="button"
        className="pointer-events-auto tap-lift inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-lift)]"
        onClick={() => {
          recoverPlayViewport();
          window.dispatchEvent(new Event("grid:open-play-menu"));
          window.setTimeout(() => {
            if (viewportIsStuck()) window.location.reload();
            else setEscapeOpen(false);
          }, 80);
        }}
      >
        <RefreshCw className="h-4 w-4" strokeWidth={2.6} />
        {german ? "Bildschirm lösen" : "Unstick screen"}
      </button>
    </div>
  );
}
