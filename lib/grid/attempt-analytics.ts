/**
 * Consistent attempt logging for team-dynamics analytics.
 * Logs what was entered, by whom, when, phase, and correctness.
 */

import { writeAuditLog } from "@/lib/grid/audit-log";

export type AttemptPhase = "arrival_quiz" | "level" | "bonus";

export type AttemptAnalyticsInput = {
  organizationId: string;
  eventId: string;
  teamId: string;
  playerId: string;
  playerName: string;
  playerRole?: string | null;
  level: number;
  phase: AttemptPhase;
  correct: boolean;
  /** Free-text answer if any. */
  answer?: string | null;
  selectedOptionId?: string | null;
  selectedOptionIds?: string[] | null;
  error?: string | null;
  /** ms since level started (or team started as fallback). */
  durationMs?: number | null;
  /** ms since team mission start. */
  elapsedMissionMs?: number | null;
  contentMode?: string | null;
  levelTitle?: string | null;
};

function durationFromIso(startedAt: string | null | undefined): number | null {
  if (!startedAt) return null;
  const t = new Date(startedAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Date.now() - t);
}

export function computeAttemptDurations(input: {
  levelStartedAt?: string | null;
  teamStartedAt?: string | null;
}): { durationMs: number | null; elapsedMissionMs: number | null } {
  return {
    durationMs: durationFromIso(input.levelStartedAt) ?? durationFromIso(input.teamStartedAt),
    elapsedMissionMs: durationFromIso(input.teamStartedAt),
  };
}

export async function logPlayAttempt(input: AttemptAnalyticsInput): Promise<void> {
  const action = input.correct ? "play_attempt_ok" : "play_attempt_failed";

  await writeAuditLog({
    organizationId: input.organizationId,
    eventId: input.eventId,
    teamId: input.teamId,
    playerId: input.playerId,
    action,
    payload: {
      phase: input.phase,
      level: input.level,
      level_title: input.levelTitle ?? null,
      correct: input.correct,
      player_name: input.playerName,
      player_role: input.playerRole ?? null,
      answer: input.answer ?? null,
      selected_option_id: input.selectedOptionId ?? null,
      selected_option_ids: input.selectedOptionIds ?? null,
      error: input.error ?? null,
      duration_ms: input.durationMs ?? null,
      elapsed_mission_ms: input.elapsedMissionMs ?? null,
      content_mode: input.contentMode ?? null,
      at: new Date().toISOString(),
    },
  });
}
