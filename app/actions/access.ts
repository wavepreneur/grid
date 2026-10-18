"use server";

import { lookupAccessCode, type ResolvedAccess } from "@/lib/tells/access";
import type { ActionResult } from "@/lib/tells/types";

export async function resolvePlayAccessCode(
  code: string,
): Promise<ActionResult<ResolvedAccess>> {
  const result = await lookupAccessCode(code);
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}
