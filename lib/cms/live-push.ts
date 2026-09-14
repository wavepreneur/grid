const PUSH_FLAG = "last_live_push_at";

export const PUSHABLE_EVENT_STATUSES = ["draft", "lobby", "active"] as const;

export function lastLivePushAtFromFlags(flags: unknown): string | null {
  if (!flags || typeof flags !== "object") return null;
  const value = (flags as Record<string, unknown>)[PUSH_FLAG];
  return typeof value === "string" && value.trim() ? value : null;
}

export function withLastLivePushAt(
  flags: Record<string, unknown> | null | undefined,
  iso: string,
): Record<string, unknown> {
  return { ...(flags ?? {}), [PUSH_FLAG]: iso };
}

export function formatLivePushAt(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  });
}
