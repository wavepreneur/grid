"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  averageIndex,
  compositeTeamScore,
  computeTeamIndices,
  GRID_FIELD_BASELINE,
  type AuditAttemptRow,
  type TeamIndexScores,
} from "@/lib/grid/data-indices";
import { parseTeamGameState } from "@/lib/grid/game-state";
import type { ActionResult } from "@/lib/grid/types";

const FINISHED_TEAM_LIMIT = 40;
const ATTEMPT_ACTIONS = ["play_attempt_ok", "play_attempt_failed", "hint_purchased"] as const;

export type WorkforceTeamCard = {
  teamId: string;
  teamName: string;
  eventTitle: string;
  inviteCode: string;
  finishedAt: string | null;
  score: number;
  compositeScore: number | null;
  scores: TeamIndexScores;
};

export type EventBenchmark = {
  eventTitle: string;
  inviteCode: string;
  teamCount: number;
  indexes: {
    decisionSpeed: number | null;
    stressResilience: number | null;
    teamAgility: number | null;
  };
};

export type WorkforceDashboard = {
  orgAverage: {
    decisionSpeed: number | null;
    stressResilience: number | null;
    teamAgility: number | null;
  };
  fieldBaseline: typeof GRID_FIELD_BASELINE;
  teams: WorkforceTeamCard[];
  eventBenchmarks: EventBenchmark[];
};

export async function getWorkforceDashboard(): Promise<ActionResult<WorkforceDashboard>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, invite_code")
      .eq("organization_id", orgId);

    if (eventsError) throw new Error(eventsError.message);

    const eventRows = events ?? [];
    const eventById = new Map(eventRows.map((event) => [event.id, event]));
    const eventIds = eventRows.map((event) => event.id);

    if (eventIds.length === 0) {
      return {
        success: true,
        data: {
          orgAverage: { decisionSpeed: null, stressResilience: null, teamAgility: null },
          fieldBaseline: GRID_FIELD_BASELINE,
          teams: [],
          eventBenchmarks: [],
        },
      };
    }

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, event_id, game_state, updated_at")
      .in("event_id", eventIds)
      .eq("status", "finished")
      .order("updated_at", { ascending: false })
      .limit(FINISHED_TEAM_LIMIT);

    if (teamsError) throw new Error(teamsError.message);

    const teamRows = teams ?? [];
    const teamIds = teamRows.map((team) => team.id);

    const logsByTeam = new Map<string, AuditAttemptRow[]>();
    if (teamIds.length > 0) {
      const { data: logs, error: logsError } = await supabase
        .from("audit_logs")
        .select("action, team_id, player_id, created_at, payload")
        .in("team_id", teamIds)
        .in("action", [...ATTEMPT_ACTIONS])
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

    const cards: WorkforceTeamCard[] = teamRows.map((team) => {
      const event = eventById.get(team.event_id as string);
      const gameState = parseTeamGameState(team.game_state);
      const scores = computeTeamIndices(logsByTeam.get(team.id as string) ?? []);
      return {
        teamId: team.id as string,
        teamName: (team.name as string) || "Team",
        eventTitle: event?.title ?? "Event",
        inviteCode: event?.invite_code ?? "",
        finishedAt: (team.updated_at as string | null) ?? null,
        score: gameState.score ?? 0,
        compositeScore: compositeTeamScore(scores),
        scores,
      };
    });

    const byEvent = new Map<string, WorkforceTeamCard[]>();
    for (const card of cards) {
      const key = card.inviteCode || card.eventTitle;
      const list = byEvent.get(key) ?? [];
      list.push(card);
      byEvent.set(key, list);
    }

    const eventBenchmarks: EventBenchmark[] = [...byEvent.values()].map((group) => ({
      eventTitle: group[0]?.eventTitle ?? "Event",
      inviteCode: group[0]?.inviteCode ?? "",
      teamCount: group.length,
      indexes: {
        decisionSpeed: averageIndex(group.map((card) => card.scores.decisionSpeed)),
        stressResilience: averageIndex(group.map((card) => card.scores.stressResilience)),
        teamAgility: averageIndex(group.map((card) => card.scores.teamAgility)),
      },
    }));

    return {
      success: true,
      data: {
        orgAverage: {
          decisionSpeed: averageIndex(cards.map((card) => card.scores.decisionSpeed)),
          stressResilience: averageIndex(cards.map((card) => card.scores.stressResilience)),
          teamAgility: averageIndex(cards.map((card) => card.scores.teamAgility)),
        },
        fieldBaseline: GRID_FIELD_BASELINE,
        teams: cards,
        eventBenchmarks,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "GRID Data konnte nicht geladen werden.",
    };
  }
}
