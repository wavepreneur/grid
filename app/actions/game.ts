"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/grid/audit-log";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import {
  buildLevelCompletedModal,
  createInitialGameState,
  parseTeamGameState,
  type TeamGameState,
  type TeamRealtimeState,
} from "@/lib/grid/game-state";
import {
  getLevelDefinition,
  validateLevelSolution,
} from "@/lib/grid/level-validation";
import { HINT_POINT_COST, EXITMANIA_TOTAL_LEVELS } from "@/lib/grid/level-types";
import type { PlayerRole, SolveLevelPayload } from "@/lib/grid/level-types";
import { assertPlayerSession } from "@/lib/grid/session-auth";
import type { ActionResult } from "@/lib/grid/types";

function buildRealtimeState(
  team: {
    id: string;
    status: string;
    current_level: number;
    game_state: unknown;
    started_at: string | null;
    lobby_auto_start_at: string | null;
    navigator_player_id?: string | null;
  },
  player: { id: string; is_captain: boolean },
): TeamRealtimeState {
  return {
    teamId: team.id,
    status: team.status,
    currentLevel: team.current_level,
    gameState: parseTeamGameState(team.game_state),
    startedAt: team.started_at,
    lobbyAutoStartAt: team.lobby_auto_start_at,
    isCaptain: player.is_captain,
    isNavigator: team.navigator_player_id === player.id,
  };
}

async function insertSyncEvent(input: {
  teamId: string;
  eventType: string;
  level?: number;
  actorPlayerId: string;
  payload?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  await supabase.from("team_sync_events").insert({
    team_id: input.teamId,
    event_type: input.eventType,
    level: input.level ?? null,
    actor_player_id: input.actorPlayerId,
    payload: input.payload ?? {},
  });
}

export async function getGameState(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { team, player } = await assertPlayerSession(input);
    const supabase = createAdminClient();

    await supabase
      .from("players")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", player.id);

    return {
      success: true,
      data: buildRealtimeState(team, player),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function solveCurrentLevel(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  payload?: SolveLevelPayload;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);

    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const currentLevel = team.current_level || 1;
    const levelKey = String(currentLevel);
    const levelState = gameState.levels[levelKey];

    if (!levelState || levelState.status !== "active") {
      return { success: false, error: "Dieses Level ist gerade nicht aktiv." };
    }

    if (gameState.modal) {
      return { success: false, error: "Bitte zuerst die Synchronisations-Meldung schließen." };
    }

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
    });
    const levelDefinition = getLevelDefinition(content, currentLevel);

    if (!levelDefinition) {
      return { success: false, error: "Level-Inhalt nicht gefunden." };
    }

    const playerRole = (player.role ?? "solver") as PlayerRole;
    const validation = validateLevelSolution(levelDefinition, input.payload ?? {}, {
      isCaptain: player.is_captain,
      isNavigator: team.navigator_player_id === player.id,
      playerRole,
    });

    if (!validation.ok) {
      await writeAuditLog({
        organizationId: event.organization_id,
        eventId: event.id,
        teamId: team.id,
        playerId: player.id,
        action: "level_attempt_failed",
        payload: {
          level: currentLevel,
          level_type: levelDefinition.type,
          error: validation.error,
        },
      });
      return { success: false, error: validation.error };
    }

    const solvedBy = Array.from(
      new Set([...(levelState.completed_by ?? []), player.display_name]),
    );

    const nextLevel = currentLevel + 1;
    const isFinished = nextLevel > content.levels.length;

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      total_levels: content.levels.length,
      modal: buildLevelCompletedModal({
        level: currentLevel,
        solvedBy,
      }),
      levels: {
        ...gameState.levels,
        [levelKey]: {
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: solvedBy,
        },
        ...(isFinished
          ? {}
          : {
              [String(nextLevel)]: {
                status: "active",
              },
            }),
      },
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        current_level: isFinished ? currentLevel : nextLevel,
        game_state: nextGameState,
        status: isFinished ? "finished" : "playing",
        finished_at: isFinished ? new Date().toISOString() : null,
      })
      .eq("id", team.id)
      .eq("status", "playing")
      .select(
        "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
      )
      .single();

    if (error || !updatedTeam) {
      return { success: false, error: error?.message ?? "Level-Update fehlgeschlagen." };
    }

    await insertSyncEvent({
      teamId: team.id,
      eventType: isFinished ? "game_finished" : "level_completed",
      level: currentLevel,
      actorPlayerId: player.id,
      payload: {
        solved_by: solvedBy,
        next_level: isFinished ? null : nextLevel,
        level_type: levelDefinition.type,
        score: nextGameState.score,
      },
    });

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      action: isFinished ? "game_finished" : "level_completed",
      payload: {
        level: currentLevel,
        level_type: levelDefinition.type,
        solved_by: solvedBy,
        score: nextGameState.score,
      },
    });

    return {
      success: true,
      data: buildRealtimeState(updatedTeam, player),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function purchaseHint(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  hintId: string;
}): Promise<ActionResult<{ hintText: string; score: number }>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);

    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const currentLevel = team.current_level || 1;

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
    });
    const levelDefinition = getLevelDefinition(content, currentLevel);

    if (!levelDefinition?.hints?.length) {
      return { success: false, error: "Für dieses Level gibt es keine Tipps." };
    }

    const hint = levelDefinition.hints.find((item) => item.id === input.hintId);
    if (!hint) {
      return { success: false, error: "Tipp nicht gefunden." };
    }

    const levelKey = String(currentLevel);
    const hintsUsed = gameState.hints_used[levelKey] ?? 0;
    if (hintsUsed >= 5) {
      return { success: false, error: "Maximal 5 Tipps pro Aufgabe." };
    }

    const pointCost = hint.point_cost || HINT_POINT_COST;
    if (gameState.score < pointCost) {
      return { success: false, error: "Nicht genug Punkte für diesen Tipp." };
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      score: gameState.score - pointCost,
      hints_used: {
        ...gameState.hints_used,
        [levelKey]: hintsUsed + 1,
      },
    };

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("teams")
      .update({ game_state: nextGameState })
      .eq("id", team.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await insertSyncEvent({
      teamId: team.id,
      eventType: "hint_purchased",
      level: currentLevel,
      actorPlayerId: player.id,
      payload: { hint_id: hint.id, point_cost: pointCost, score: nextGameState.score },
    });

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      action: "hint_purchased",
      payload: {
        level: currentLevel,
        hint_id: hint.id,
        point_cost: pointCost,
        score: nextGameState.score,
      },
    });

    return {
      success: true,
      data: { hintText: hint.text, score: nextGameState.score },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function dismissSyncModal(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  modalId: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { team, player } = await assertPlayerSession(input);
    const gameState = parseTeamGameState(team.game_state);

    if (!gameState.modal || gameState.modal.id !== input.modalId) {
      const current = await getGameState(input);
      if (!current.success) {
        return current;
      }
      return current;
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      modal: null,
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({ game_state: nextGameState })
      .eq("id", team.id)
      .select(
        "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
      )
      .single();

    if (error || !updatedTeam) {
      return { success: false, error: error?.message ?? "Modal konnte nicht geschlossen werden." };
    }

    return {
      success: true,
      data: buildRealtimeState(updatedTeam, player),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function initializeTeamGameState(
  teamId: string,
  actorPlayerId: string,
  eventId: string,
  organizationId: string,
  cityId: string | null,
  contentConfig: unknown,
  routeOverride: unknown,
) {
  const content = await loadResolvedEventContent({
    eventId,
    organizationId,
    cityId,
    contentConfig,
    routeOverride,
  });
  const totalLevels = content.levels.length || EXITMANIA_TOTAL_LEVELS;
  const initialState = createInitialGameState(totalLevels);

  const supabase = createAdminClient();
  await supabase
    .from("teams")
    .update({
      current_level: 1,
      game_state: initialState,
    })
    .eq("id", teamId);

  await insertSyncEvent({
    teamId,
    eventType: "game_started",
    level: 1,
    actorPlayerId,
    payload: {
      total_levels: totalLevels,
      template_slug: content.templateSlug,
      starting_score: initialState.score,
    },
  });
}
