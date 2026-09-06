"use client";

import { useEffect, useState } from "react";
import { getPortalEventResults } from "@/app/actions/event-results";
import { EventResultsBoard } from "@/components/event/event-results-board";
import type { EventResultsSnapshot } from "@/lib/grid/event-results";

type Props = {
  portalToken: string;
};

export function EventProgressPanel({ portalToken }: Props) {
  const [snapshot, setSnapshot] = useState<EventResultsSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getPortalEventResults(portalToken).then((result) => {
        if (!cancelled && result.success && result.data) setSnapshot(result.data);
      });
    };
    load();
    const id = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [portalToken]);

  if (!snapshot) {
    return <p className="text-sm text-slate-500">Fortschritt wird geladen…</p>;
  }

  return <EventResultsBoard snapshot={snapshot} />;
}
