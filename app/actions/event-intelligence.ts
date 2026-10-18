"use server";

import {
  loadEventIntelligenceByPortalToken,
  type EventIntelligenceSnapshot,
} from "@/lib/tells/event-intelligence";
import type { ActionResult } from "@/lib/tells/types";

export async function getPortalEventIntelligence(
  token: string,
): Promise<ActionResult<EventIntelligenceSnapshot>> {
  try {
    const snapshot = await loadEventIntelligenceByPortalToken(token);
    if (!snapshot) {
      return { success: false, error: "Data ist für dieses Event nicht freigeschaltet." };
    }
    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Data konnte nicht geladen werden.",
    };
  }
}
