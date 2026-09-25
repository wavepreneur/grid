"use server";

import {
  loadEventResultsByPortalToken,
  loadEventResultsForEvent,
  type EventResultsSnapshot,
} from "@/lib/grid/event-results";
import { assertPlayerSession, getEventByInviteCode } from "@/lib/grid/session-auth";
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

export async function getEventLiveRanking(
  inviteCode: string,
): Promise<ActionResult<EventResultsSnapshot>> {
  try {
    const event = await getEventByInviteCode(inviteCode);
    if (!event) {
      return { success: false, error: "Event nicht gefunden." };
    }
    const snapshot = await loadEventResultsForEvent(event);
    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ranking nicht geladen.",
    };
  }
}

export async function listPlayEventRanking(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<EventResultsSnapshot>> {
  try {
    const { event } = await assertPlayerSession(input);
    const snapshot = await loadEventResultsForEvent(event);
    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ranking nicht geladen.",
    };
  }
}
