"use server";

import {
  loadPortalSnapshot,
  savePortalOverrides,
  type PortalSaveInput,
  type PortalSnapshot,
} from "@/lib/grid/portal";
import type { ActionResult } from "@/lib/grid/types";

export async function getPortalSnapshot(
  token: string,
): Promise<ActionResult<PortalSnapshot>> {
  try {
    const snapshot = await loadPortalSnapshot(token);
    if (!snapshot) {
      return { success: false, error: "Event-Portal nicht gefunden." };
    }
    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Portal konnte nicht geladen werden.",
    };
  }
}

export async function savePortalSnapshot(
  token: string,
  input: PortalSaveInput,
): Promise<ActionResult<PortalSnapshot>> {
  try {
    const snapshot = await savePortalOverrides(token, input);
    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Änderungen konnten nicht gespeichert werden.",
    };
  }
}
