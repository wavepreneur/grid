"use client";

import { eventLobbyPath, eventPlayPath } from "@/lib/grid/event-routes";
import { goReturnClipboardParts } from "@/lib/grid/codes";

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

export function stripResumeTokenFromUrl(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(PLAYER_RESUME_PARAM)) return;
  url.searchParams.delete(PLAYER_RESUME_PARAM);
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

export function buildManageTeamUrl(
  inviteCode: string,
  joinCode: string,
  resumeToken?: string,
): string {
  const base = eventLobbyPath(inviteCode, joinCode, { manage: true });
  if (!resumeToken) return base;
  return `${base}&${PLAYER_RESUME_PARAM}=${encodeURIComponent(resumeToken)}`;
}

/** Copy /go + team code so only the https URL is a link; labels stay plain text. */
export async function copyGoReturnSnippet(origin: string, joinCode: string): Promise<void> {
  const { plain, html } = goReturnClipboardParts(origin, joinCode);

  if (copyHtmlViaSelection(html)) return;

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": Promise.resolve(new Blob([plain], { type: "text/plain" })),
          "text/html": Promise.resolve(new Blob([html], { type: "text/html" })),
        }),
      ]);
      return;
    }
  } catch {
    /* fall through to plain text */
  }

  await navigator.clipboard.writeText(plain);
}

function copyHtmlViaSelection(html: string): boolean {
  const holder = document.createElement("div");
  holder.setAttribute("contenteditable", "true");
  holder.style.position = "fixed";
  holder.style.left = "-9999px";
  holder.style.top = "0";
  holder.innerHTML = html;
  document.body.appendChild(holder);

  const selection = window.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const range = document.createRange();
  range.selectNodeContents(holder);
  selection?.removeAllRanges();
  selection?.addRange(range);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  selection?.removeAllRanges();
  if (previous && selection) selection.addRange(previous);
  document.body.removeChild(holder);
  return copied;
}
