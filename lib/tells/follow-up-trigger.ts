/**
 * Follow-up **intent** (not dispatch).
 *
 * Studio writes `feature_flags.follow_up_trigger` on the game. Publish freezes it
 * into the version snapshot. The live loader copies it onto `EventContent.followUpTrigger`.
 *
 * Later dispatch (do not invent a second JSON shape):
 * 1. Source of arming = `teams.status === "finished"` + `teams.finished_at` (existing columns).
 *    Do not add an FSM step or a write in front of a correct solve.
 * 2. Due time = `followUpDueAt(finished_at, cadence_days)` — derived, not stored on the game.
 * 3. Provision = existing Pulse REST (`POST /api/v1/pulse/sessions`) with `program_slug`,
 *    `channel`, idempotent `booking_reference`. Slack/Teams bots live outside GRID.
 * 4. Billing / shop stay Exitmania or Tabbrain. GRID never checkouts.
 *
 * Stable key: `follow_up_trigger`. Do not rename; later workers will read snapshots.
 */

export const FOLLOW_UP_KINDS = ["none", "micro_pulse", "slack_program"] as const;
export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number];

export const FOLLOW_UP_CHANNELS = ["slack", "msteams", "web", "api"] as const;
export type FollowUpChannel = (typeof FOLLOW_UP_CHANNELS)[number];

export type FollowUpTrigger = {
  enabled: boolean;
  kind: FollowUpKind;
  channel: FollowUpChannel | null;
  cadence_days: number | null;
  program_slug: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

export const EMPTY_FOLLOW_UP_TRIGGER: FollowUpTrigger = {
  enabled: false,
  kind: "none",
  channel: null,
  cadence_days: null,
  program_slug: null,
  cta_label: null,
  cta_url: null,
};

function isFollowUpKind(value: unknown): value is FollowUpKind {
  return FOLLOW_UP_KINDS.includes(value as FollowUpKind);
}

function isFollowUpChannel(value: unknown): value is FollowUpChannel {
  return FOLLOW_UP_CHANNELS.includes(value as FollowUpChannel);
}

export function parseFollowUpTrigger(featureFlags: unknown): FollowUpTrigger {
  if (!featureFlags || typeof featureFlags !== "object") {
    return { ...EMPTY_FOLLOW_UP_TRIGGER };
  }
  const raw = (featureFlags as Record<string, unknown>).follow_up_trigger;
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_FOLLOW_UP_TRIGGER };
  }
  const flags = raw as Record<string, unknown>;
  const kind = isFollowUpKind(flags.kind) ? flags.kind : "none";
  const cadence =
    typeof flags.cadence_days === "number" && Number.isFinite(flags.cadence_days)
      ? Math.max(1, Math.round(flags.cadence_days))
      : null;
  const program =
    typeof flags.program_slug === "string" && flags.program_slug.trim()
      ? flags.program_slug.trim()
      : null;
  const label =
    typeof flags.cta_label === "string" && flags.cta_label.trim() ? flags.cta_label.trim() : null;

  return {
    enabled: flags.enabled === true && kind !== "none",
    kind,
    channel: isFollowUpChannel(flags.channel) ? flags.channel : null,
    cadence_days: cadence,
    program_slug: program,
    cta_label: label,
    cta_url:
      typeof flags.cta_url === "string" && flags.cta_url.trim() ? flags.cta_url.trim() : null,
  };
}

export function withFollowUpTrigger(
  featureFlags: Record<string, unknown> | null | undefined,
  trigger: FollowUpTrigger,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(featureFlags ?? {}) };
  if (!trigger.enabled || trigger.kind === "none") {
    delete next.follow_up_trigger;
    return next;
  }
  next.follow_up_trigger = {
    enabled: true,
    kind: trigger.kind,
    channel: trigger.channel,
    cadence_days: trigger.cadence_days,
    program_slug: trigger.program_slug,
    cta_label: trigger.cta_label,
    cta_url: trigger.cta_url,
  };
  return next;
}

/** When a later worker should provision Pulse — not stored, computed from finish + cadence. */
export function followUpDueAt(
  finishedAtIso: string | null | undefined,
  cadenceDays: number | null,
): string | null {
  if (cadenceDays === null || cadenceDays < 1) return null;
  if (!finishedAtIso) return null;
  const started = Date.parse(finishedAtIso);
  if (!Number.isFinite(started)) return null;
  return new Date(started + cadenceDays * 86_400_000).toISOString();
}
