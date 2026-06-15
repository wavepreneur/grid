"use client";

import { eventPlayPath } from "@/lib/grid/event-routes";

export const PLAYER_RESUME_PARAM = "resume";

export function readResumeTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(PLAYER_RESUME_PARAM);
}

export function syncResumeTokenInUrl(resumeToken: string): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set(PLAYER_RESUME_PARAM, resumeToken);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function buildPlayUrlWithResume(
  inviteCode: string,
  joinCode: string,
  resumeToken: string,
): string {
  const base = eventPlayPath(inviteCode, joinCode);
  return `${base}?${PLAYER_RESUME_PARAM}=${encodeURIComponent(resumeToken)}`;
}
