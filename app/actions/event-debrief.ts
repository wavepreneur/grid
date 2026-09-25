"use server";

import {
  loadEventDebriefByPortalToken,
  type EventDebriefSnapshot,
} from "@/lib/grid/event-debrief";
import type { ActionResult } from "@/lib/grid/types";

export async function getPortalEventDebrief(
  token: string,
): Promise<ActionResult<EventDebriefSnapshot>> {
  try {
    const snapshot = await loadEventDebriefByPortalToken(token);
    if (!snapshot) {
      return { success: false, error: "Event nicht gefunden." };
    }
    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Manöverkritik nicht geladen.",
    };
  }
}
