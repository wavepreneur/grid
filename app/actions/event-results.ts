"use server";

import { loadEventResultsByPortalToken, type EventResultsSnapshot } from "@/lib/grid/event-results";
import type { ActionResult } from "@/lib/grid/types";

export async function getPortalEventResults(
  token: string,
): Promise<ActionResult<EventResultsSnapshot>> {
  try {
    const snapshot = await loadEventResultsByPortalToken(token);
    if (!snapshot) {
      return { success: false, error: "Event-Cockpit nicht gefunden." };
    }
    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ergebnisse konnten nicht geladen werden.",
    };
  }
}
