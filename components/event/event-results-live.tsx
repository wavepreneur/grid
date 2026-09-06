"use client";

import { useEffect, useState } from "react";
import { getPortalEventResults } from "@/app/actions/event-results";
import { EventResultsBoard } from "@/components/event/event-results-board";
import type { EventResultsSnapshot } from "@/lib/grid/event-results";

type Props = {
  portalToken: string;
  initial: EventResultsSnapshot;
};

export function EventResultsLive({ portalToken, initial }: Props) {
  const [snapshot, setSnapshot] = useState(initial);

  useEffect(() => {
    const tick = () => {
      void getPortalEventResults(portalToken).then((result) => {
        if (result.success && result.data) setSnapshot(result.data);
      });
    };
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [portalToken]);

  return <EventResultsBoard snapshot={snapshot} />;
}
