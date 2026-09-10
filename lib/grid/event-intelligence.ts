import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeTeamIndices,
  type AuditAttemptRow,
  type TeamIndexScores,
} from "@/lib/grid/data-indices";
import { parseTeamGameState } from "@/lib/grid/game-state";
import { loadPortalEventByToken } from "@/lib/grid/portal";
import { modulesFromContentConfig } from "@/lib/grid/event-modules";

const ATTEMPT_ACTIONS = ["play_attempt_ok", "play_attempt_failed", "hint_purchased"] as const;
const DATA_ACTIONS = [...ATTEMPT_ACTIONS, "bonus_handed_off"] as const;

export type EventIntelligenceHandoff = {
  at: string;
  fromName: string;
  toName: string;
  bonusTitle: string | null;
  level: number;
};

export type EventIntelligenceTeam = {
  id: string;
  name: string;
  status: string;
  score: number;
  scores: TeamIndexScores;
  handoffs: EventIntelligenceHandoff[];
};

export type EventIntelligenceSnapshot = {
  title: string;
  teams: EventIntelligenceTeam[];
};

export async function loadEventIntelligenceByPortalToken(
  token: string,
): Promise<EventIntelligenceSnapshot | null> {
  const event = await loadPortalEventByToken(token);
  if (!event) return null;
  if (!modulesFromContentConfig(event.content_config).team_intelligence) return null;

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
      .in("action", [...DATA_ACTIONS])
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

  return {
    title: event.title,
    teams: teamRows.map((team) => {
      const gameState = parseTeamGameState(team.game_state);
      const logs = logsByTeam.get(team.id) ?? [];
      return {
        id: team.id,
        name: team.name,
        status: team.status,
        score: gameState.score ?? 0,
        scores: computeTeamIndices(logs),
        handoffs: logs
          .filter((row) => row.action === "bonus_handed_off")
          .map((row) => ({
            at: row.created_at,
            fromName:
              typeof row.payload.from_player_name === "string"
                ? row.payload.from_player_name
                : "Spieler",
            toName:
              typeof row.payload.to_player_name === "string"
                ? row.payload.to_player_name
                : "Spieler",
            bonusTitle:
              typeof row.payload.bonus_title === "string" ? row.payload.bonus_title : null,
            level:
              typeof row.payload.level === "number" && Number.isFinite(row.payload.level)
                ? row.payload.level
                : 0,
          })),
      };
    }),
  };
}
