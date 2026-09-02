"use server";

import { lookupAccessCode, type ResolvedAccess } from "@/lib/grid/access";
import type { ActionResult } from "@/lib/grid/types";

export async function resolvePlayAccessCode(
  code: string,
): Promise<ActionResult<ResolvedAccess>> {
  const result = await lookupAccessCode(code);
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}
