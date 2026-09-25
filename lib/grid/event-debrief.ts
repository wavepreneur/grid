import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeTeamIndices,
  deriveReportSignals,
  deriveStrengthBlindspot,
  type AuditAttemptRow,
  type ReportSignal,
  type TeamIndexScores,
} from "@/lib/grid/data-indices";
import { levelPlayOutcome, parseTeamGameState } from "@/lib/grid/game-state";
import { loadPortalEventByToken } from "@/lib/grid/portal";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";

const DEBRIEF_ACTIONS = [
  "play_attempt_ok",
  "play_attempt_failed",
  "play_attempt_revealed",
  "hint_purchased",
  "wallet_purchased",
  "bonus_handed_off",
  "outdoor_force_unlock",
  "level_completed",
  "game_finished",
] as const;

export type DebriefLevelOutcome = "solved" | "revealed" | "open";

export type DebriefFail = {
  at: string;
  by: string;
  role: string | null;
  answer: string | null;
};

export type DebriefHint = {
  at: string;
  by: string;
  cost: number | null;
};

export type DebriefHandoff = {
  at: string;
  fromName: string;
  toName: string;
  bonusTitle: string | null;
  level: number;
};

export type DebriefLevel = {
  level: number;
  title: string;
  outcome: DebriefLevelOutcome;
  durationMs: number | null;
  solvedBy: string[];
  gpsSkippedBy: string | null;
  fails: DebriefFail[];
  hints: DebriefHint[];
};

export type EventDebriefTeam = {
  id: string;
  name: string;
  status: string;
  score: number;
  scores: TeamIndexScores;
  signals: ReportSignal[];
  strength: string;
  blindspot: string;
  facts: string[];
  levels: DebriefLevel[];
  handoffs: DebriefHandoff[];
};

export type EventDebriefSnapshot = {
  title: string;
  teams: EventDebriefTeam[];
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function clipAnswer(value: string | null): string | null {
  if (!value) return null;
  return value.length > 80 ? `${value.slice(0, 79)}…` : value;
}

function durationFromEntry(
  startedAt?: string,
  completedAt?: string,
): number | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

function buildFacts(input: {
  scores: TeamIndexScores;
  reveals: number;
  gpsSkips: number;
  handoffs: number;
}): string[] {
  const facts: string[] = [];
  if (input.scores.attemptsFailed > 0) {
    facts.push(
      `${input.scores.attemptsFailed} falsche Eingabe${input.scores.attemptsFailed === 1 ? "" : "n"}`,
    );
  }
  if (input.scores.hints > 0) {
    facts.push(`${input.scores.hints} Tipp${input.scores.hints === 1 ? "" : "s"} gekauft`);
  }
  if (input.reveals > 0) {
    facts.push(`${input.reveals}× direkt gelöst (0 Punkte)`);
  }
  if (input.gpsSkips > 0) {
    facts.push(`${input.gpsSkips}× GPS übersprungen`);
  }
  if (input.handoffs > 0) {
    facts.push(`${input.handoffs} Aufgabe${input.handoffs === 1 ? "" : "n"} an eine andere Rolle`);
  }
  if (input.scores.medianSolveMs !== null) {
    facts.push(`Median ${Math.round(input.scores.medianSolveMs / 1000)} s bis zur Lösung`);
  }
  return facts;
}

export async function loadEventDebriefByPortalToken(
  token: string,
): Promise<EventDebriefSnapshot | null> {
  const event = await loadPortalEventByToken(token);
  if (!event) return null;

  const content = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });

  const supabase = createAdminClient();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, status, game_state")
    .eq("event_id", event.id)
    .neq("status", "disbanded")
    .order("join_code", { ascending: true });

  if (error) throw new Error(error.message);

  const teamRows = teams ?? [];
  const teamIds = teamRows.map((team) => team.id);
  const logsByTeam = new Map<string, AuditAttemptRow[]>();

  if (teamIds.length > 0) {
    const { data: logs, error: logsError } = await supabase
      .from("audit_logs")
      .select("action, team_id, player_id, created_at, payload")
      .in("team_id", teamIds)
      .in("action", [...DEBRIEF_ACTIONS])
      .order("created_at", { ascending: true });

    if (logsError) throw new Error(logsError.message);

    for (const row of logs ?? []) {
      const teamId = row.team_id as string | null;
      if (!teamId) continue;
      const list = logsByTeam.get(teamId) ?? [];
      list.push({
        action: row.action as string,
        team_id: teamId,
        player_id: (row.player_id as string | null) ?? null,
        created_at: row.created_at as string,
        payload:
          row.payload && typeof row.payload === "object"
            ? (row.payload as Record<string, unknown>)
            : {},
      });
      logsByTeam.set(teamId, list);
    }
  }

  const teamsOut: EventDebriefTeam[] = teamRows.map((team) => {
    const gameState = parseTeamGameState(team.game_state);
    const logs = logsByTeam.get(team.id) ?? [];
    const indexRows = logs.filter((row) =>
      row.action === "play_attempt_ok" ||
      row.action === "play_attempt_failed" ||
      row.action === "hint_purchased",
    );
    const scores = computeTeamIndices(indexRows);
    const critique = deriveStrengthBlindspot(scores);

    const levels: DebriefLevel[] = content.levels.map((level) => {
      const entry = gameState.levels[String(level.level)];
      const outcome = levelPlayOutcome(entry);
      const levelLogs = logs.filter((row) => asNumber(row.payload.level) === level.level);

      const durationFromLog = levelLogs
        .filter(
          (row) =>
            row.action === "play_attempt_ok" ||
            row.action === "play_attempt_revealed" ||
            row.action === "level_completed" ||
            row.action === "game_finished",
        )
        .map((row) => asNumber(row.payload.duration_ms))
        .find((ms): ms is number => ms !== null && ms > 0);

      const gpsSkip = levelLogs.find((row) => row.action === "outdoor_force_unlock");

      return {
        level: level.level,
        title: level.title,
        outcome,
        durationMs: durationFromLog ?? durationFromEntry(entry?.started_at, entry?.completed_at),
        solvedBy: entry?.completed_by?.filter(Boolean) ?? [],
        gpsSkippedBy: gpsSkip
          ? asString(gpsSkip.payload.player_name) ?? "Team"
          : null,
        fails: levelLogs
          .filter((row) => row.action === "play_attempt_failed")
          .map((row) => ({
            at: row.created_at,
            by: asString(row.payload.player_name) ?? "Spieler",
            role: asString(row.payload.player_role),
            answer: clipAnswer(asString(row.payload.answer)),
          })),
        hints: levelLogs
          .filter((row) => row.action === "hint_purchased" || row.action === "wallet_purchased")
          .map((row) => ({
            at: row.created_at,
            by:
              asString(row.payload.unlocked_by) ??
              asString(row.payload.purchased_by) ??
              asString(row.payload.player_name) ??
              "Spieler",
            cost: asNumber(row.payload.point_cost),
          })),
      };
    });

    const handoffs: DebriefHandoff[] = logs
      .filter((row) => row.action === "bonus_handed_off")
      .map((row) => ({
        at: row.created_at,
        fromName: asString(row.payload.from_player_name) ?? "Spieler",
        toName: asString(row.payload.to_player_name) ?? "Spieler",
        bonusTitle: asString(row.payload.bonus_title),
        level: asNumber(row.payload.level) ?? 0,
      }));

    const reveals = levels.filter((item) => item.outcome === "revealed").length;
    const gpsSkips = levels.filter((item) => item.gpsSkippedBy).length;

    return {
      id: team.id,
      name: team.name,
      status: team.status,
      score: gameState.score ?? 0,
      scores,
      signals: deriveReportSignals(scores),
      strength: critique.strength,
      blindspot: critique.blindspot,
      facts: buildFacts({
        scores,
        reveals,
        gpsSkips,
        handoffs: handoffs.length,
      }),
      levels,
      handoffs,
    };
  });

  teamsOut.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name, "de");
  });

  return {
    title: event.title,
    teams: teamsOut,
  };
}
