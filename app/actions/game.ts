"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildLevelCompletedModal,
  createInitialGameState,
  parseTeamGameState,
  PHASE2_DEMO_LEVELS,
  type TeamGameState,
  type TeamRealtimeState,
} from "@/lib/grid/game-state";
import { assertPlayerSession } from "@/lib/grid/session-auth";
import type { ActionResult } from "@/lib/grid/types";

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

    const gameState = parseTeamGameState(team.game_state);

    return {
      success: true,
      data: {
        teamId: team.id,
        status: team.status,
        currentLevel: team.current_level,
        gameState,
        startedAt: team.started_at,
        lobbyAutoStartAt: team.lobby_auto_start_at,
      },
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
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { team, player } = await assertPlayerSession(input);

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

    const solvedBy = Array.from(
      new Set([...(levelState.completed_by ?? []), player.display_name]),
    );

    const nextLevel = currentLevel + 1;
    const isFinished = nextLevel > gameState.total_levels;

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
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
      .select("id, status, current_level, game_state, started_at, lobby_auto_start_at")
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
      },
    });

    return {
      success: true,
      data: {
        teamId: updatedTeam.id,
        status: updatedTeam.status,
        currentLevel: updatedTeam.current_level,
        gameState: parseTeamGameState(updatedTeam.game_state),
        startedAt: updatedTeam.started_at,
        lobbyAutoStartAt: updatedTeam.lobby_auto_start_at,
      },
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
    const { team } = await assertPlayerSession(input);
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
      .select("id, status, current_level, game_state, started_at, lobby_auto_start_at")
      .single();

    if (error || !updatedTeam) {
      return { success: false, error: error?.message ?? "Modal konnte nicht geschlossen werden." };
    }

    return {
      success: true,
      data: {
        teamId: updatedTeam.id,
        status: updatedTeam.status,
        currentLevel: updatedTeam.current_level,
        gameState: parseTeamGameState(updatedTeam.game_state),
        startedAt: updatedTeam.started_at,
        lobbyAutoStartAt: updatedTeam.lobby_auto_start_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function initializeTeamGameState(teamId: string, actorPlayerId: string) {
  const supabase = createAdminClient();
  const initialState = createInitialGameState(PHASE2_DEMO_LEVELS);

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
    payload: { total_levels: PHASE2_DEMO_LEVELS },
  });
}
