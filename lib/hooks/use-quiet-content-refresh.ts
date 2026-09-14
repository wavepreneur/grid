"use client";

import { useCallback, useEffect, type MutableRefObject } from "react";
import { getEventContent, getEventContentRevision } from "@/app/actions/content";
import { cacheEventContent } from "@/lib/grid/offline-content";
import type { ResolvedEventContent } from "@/lib/grid/level-types";

/**
 * Quiet content refresh — battery first.
 *
 * Never poll on an interval. The radio stays reserved for play sync.
 * Pull only when:
 * - the operator ping arrives on the existing team channel
 * - the screen wakes (visibility / pageshow / online)
 *
 * Full content is fetched only if the cheap revision number moved.
 */
export function useQuietContentRefresh(input: {
  inviteCode: string;
  enabled: boolean;
  revisionRef: MutableRefObject<number>;
  onUpdated: (content: ResolvedEventContent, revision: number) => void;
}) {
  const { inviteCode, enabled, revisionRef, onUpdated } = input;

  const pullIfNewer = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    const revisionResult = await getEventContentRevision(inviteCode);
    if (!revisionResult.success) return;
    if (revisionResult.data.contentRevision <= revisionRef.current) return;

    const contentResult = await getEventContent(inviteCode);
    if (!contentResult.success) return;

    const { contentRevision: nextRevision, eventId: _id, ...resolvedContent } =
      contentResult.data;
    cacheEventContent(inviteCode, resolvedContent);
    onUpdated(resolvedContent, nextRevision);
  }, [inviteCode, onUpdated, revisionRef]);

  useEffect(() => {
    if (!enabled) return;

    function onWake() {
      if (document.visibilityState === "hidden") return;
      void pullIfNewer();
    }

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("pageshow", onWake);
    window.addEventListener("online", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("pageshow", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [enabled, pullIfNewer]);

  return pullIfNewer;
}
