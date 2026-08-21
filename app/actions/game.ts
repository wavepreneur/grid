"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/grid/audit-log";
import {
  computeAttemptDurations,
  logPlayAttempt,
} from "@/lib/grid/attempt-analytics";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import {
  buildLevelCompletedModal,
  createInitialGameState,
  parseTeamGameState,
  activateLevelEntry,
  type TeamGameState,
  type TeamRealtimeState,
} from "@/lib/grid/game-state";
import {
  createInitialGameStateFromCompiled,
  elapsedMinutesSince,
  resolveProgressionAfterSolve,
} from "@/lib/grid/logic-engine";
import { computeLevelReward } from "@/lib/grid/level-scoring";
import {
  getLevelDefinition,
  validateArrivalQuiz,
  validateLevelSolution,
  validateStationCode,
} from "@/lib/grid/level-validation";
import { HINT_POINT_COST, EXITMANIA_TOTAL_LEVELS } from "@/lib/grid/level-types";
import type { PlayerRole, SolveLevelPayload } from "@/lib/grid/level-types";
import { resolveArchetypeRoleFlags } from "@/lib/grid/archetype-roles";
import { resolveBlueprint } from "@/lib/grid/blueprints";
import { parseContentConfig } from "@/lib/grid/content-engine";
import { countActivePlayers } from "@/lib/grid/team-session";
import { assertPlayerSession } from "@/lib/grid/session-auth";
import type { ActionResult } from "@/lib/grid/types";
import { findLevelByStationCode } from "@/lib/grid/content-loader";
import {
  buildPlaySlot,
  initialPhaseForSurface,
  usesPhasedPlay,
} from "@/lib/grid/play-slots";
import type { PlayPhase } from "@/lib/grid/play-surface";
import { isWithinGeofence } from "@/lib/grid/geofence";
import { isBonusForRole, resolveBonusTask } from "@/lib/grid/bonus";
import { validateArrivalQuiz as validateBonusQuiz } from "@/lib/grid/level-validation";

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
      studioGameVersionId: event.studio_game_version_id,
    });
    const levelDefinition = getLevelDefinition(content, currentLevel);

    if (!levelDefinition) {
      return { success: false, error: "Level-Inhalt nicht gefunden." };
    }

    const playerRole = (player.role ?? "gamma") as PlayerRole;
    const activePlayerCount = await countActivePlayers(team.id);
    const blueprint = resolveBlueprint(parseContentConfig(event.content_config));
    const archetype = resolveArchetypeRoleFlags({
      playerId: player.id,
      playerRole,
      isCaptain: player.is_captain,
      team: {
        captainPlayerId: team.captain_player_id ?? null,
        navigatorPlayerId: team.navigator_player_id ?? null,
        betaPlayerId: team.beta_player_id ?? null,
      },
      activePlayerCount,
      gpsEnabled: blueprint.capabilities.gps,
    });
    const validation = validateLevelSolution(levelDefinition, input.payload ?? {}, {
      isCaptain: player.is_captain,
      isNavigator: team.navigator_player_id === player.id,
      canUnlockGps: archetype.canUnlockGps,
      effectiveBeta: archetype.effectiveBeta,
      archetypeRole: archetype.archetypeRole,
      playerRole,
      gpsEnabled: content.capabilities.gps,
    });

    if (!validation.ok) {
      const durations = computeAttemptDurations({
        levelStartedAt: levelState.started_at,
        teamStartedAt: team.started_at,
      });
      await logPlayAttempt({
        organizationId: event.organization_id,
        eventId: event.id,
        teamId: team.id,
        playerId: player.id,
        playerName: player.display_name,
        playerRole: player.role,
        level: currentLevel,
        phase: "level",
        correct: false,
        answer: input.payload?.answer ?? null,
        selectedOptionId: input.payload?.selectedOptionId ?? null,
        selectedOptionIds: input.payload?.selectedOptionIds ?? null,
        error: validation.error,
        durationMs: durations.durationMs,
        elapsedMissionMs: durations.elapsedMissionMs,
        contentMode: content.contentMode,
        levelTitle: levelDefinition.title ?? null,
      });
      // Legacy action name for existing consumers.
      await writeAuditLog({
        organizationId: event.organization_id,
        eventId: event.id,
        teamId: team.id,
        playerId: player.id,
        action: "level_attempt_failed",
        payload: {
          level: currentLevel,
          level_type: levelDefinition.type,
          level_title: levelDefinition.title ?? null,
          error: validation.error,
          player_name: player.display_name,
          player_role: player.role ?? null,
          answer: input.payload?.answer ?? null,
          selected_option_id: input.payload?.selectedOptionId ?? null,
          selected_option_ids: input.payload?.selectedOptionIds ?? null,
          duration_ms: durations.durationMs,
          elapsed_mission_ms: durations.elapsedMissionMs,
          content_mode: content.contentMode,
          at: new Date().toISOString(),
        },
      });
      return { success: false, error: validation.error };
    }

    const solvedBy = Array.from(
      new Set([...(levelState.completed_by ?? []), player.display_name]),
    );

    const compiledLogic = content.compiledLogic;
    const elapsedMinutes = elapsedMinutesSince(team.started_at);

    let nextLevel: number;
    let isFinished: boolean;
    let progressionLevels: TeamGameState["levels"];

    if (compiledLogic && compiledLogic.levels.length > 0) {
      const partialState: TeamGameState = {
        ...gameState,
        levels: {
          ...gameState.levels,
          [levelKey]: {
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_by: solvedBy,
          },
        },
      };

      const progression = resolveProgressionAfterSolve({
        gameState: partialState,
        compiled: compiledLogic,
        completedLevel: currentLevel,
        score: gameState.score,
        elapsedMinutes: elapsedMinutes ?? undefined,
      });

      progressionLevels = {
        ...progression.gameState.levels,
        [levelKey]: {
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: solvedBy,
        },
      };

      const unlockedNext = progression.nextCurrentLevel;
      if (
        unlockedNext !== currentLevel &&
        unlockedNext <= content.levels.length &&
        progressionLevels[String(unlockedNext)]?.status !== "completed"
      ) {
        progressionLevels = activateLevelEntry(progressionLevels, String(unlockedNext));
      }

      nextLevel = unlockedNext;
      isFinished =
        progression.endGame ||
        nextLevel > content.levels.length ||
        Object.values(progressionLevels).every((entry) => entry.status === "completed");
    } else {
      nextLevel = currentLevel + 1;
      isFinished = nextLevel > content.levels.length;
      progressionLevels = {
        ...gameState.levels,
        [levelKey]: {
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: solvedBy,
        },
      };
      if (!isFinished) {
        progressionLevels = activateLevelEntry(progressionLevels, String(nextLevel));
      }
    }

    const pointsEarned = input.payload?.revealSolution
      ? 0
      : computeLevelReward(levelDefinition.scoring, levelState.started_at);

    const bonus = resolveBonusTask(levelDefinition);
    const enterBonus = Boolean(usesPhasedPlay(content) && bonus);

    const nextSlot = getLevelDefinition(content, isFinished ? currentLevel : nextLevel);
    const hubPhase: PlayPhase | undefined =
      !isFinished && nextSlot && usesPhasedPlay(content)
        ? initialPhaseForSurface(
            content.contentMode,
            buildPlaySlot(nextSlot, content.contentMode),
          )
        : undefined;

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      total_levels: content.levels.length,
      score: gameState.score + pointsEarned,
      current_phase: enterBonus ? "bonus" : hubPhase ?? gameState.current_phase,
      pending_next_level: enterBonus ? (isFinished ? null : nextLevel) : null,
      modal: buildLevelCompletedModal({
            level: currentLevel,
            solvedBy,
            pointsEarned,
            successTitle: levelDefinition.success_title,
            // Skip / countdown expiry: no post-solve note
            successInfo: input.payload?.revealSolution
              ? null
              : levelDefinition.success_info,
          }),
      levels: progressionLevels,
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        current_level: enterBonus || isFinished ? currentLevel : nextLevel,
        game_state: nextGameState,
        status: enterBonus ? "playing" : isFinished ? "finished" : "playing",
        finished_at: enterBonus ? null : isFinished ? new Date().toISOString() : null,
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
        points_earned: pointsEarned,
        reveal_solution: Boolean(input.payload?.revealSolution),
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
        points_earned: pointsEarned,
        reveal_solution: Boolean(input.payload?.revealSolution),
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
  tileId: string;
}): Promise<ActionResult<{ hintText: string; score: number; cost: number }>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);

    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const currentLevel = team.current_level || 1;
    const levelKey = String(currentLevel);

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
      studioGameVersionId: event.studio_game_version_id,
    });
    const levelDefinition = getLevelDefinition(content, currentLevel);

    const tile = levelDefinition?.tiles?.find((item) => item.id === input.tileId);
    if (!tile?.hint) {
      return { success: false, error: "Für diese Kachel gibt es keinen Tipp." };
    }

    const levelHints = gameState.purchased_tile_hints[levelKey] ?? {};
    if (levelHints[input.tileId]) {
      return { success: false, error: "Dieser Tipp wurde bereits freigeschaltet." };
    }

    const pointCost = tile.hint.point_cost ?? HINT_POINT_COST;
    if (gameState.score < pointCost) {
      return {
        success: false,
        error: `Nicht genug Punkte (benötigt: ${pointCost}).`,
      };
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      score: gameState.score - pointCost,
      purchased_tile_hints: {
        ...gameState.purchased_tile_hints,
        [levelKey]: {
          ...levelHints,
          [input.tileId]: { text: tile.hint.text, cost: pointCost },
        },
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
      payload: {
        tile_id: tile.id,
        point_cost: pointCost,
        score: nextGameState.score,
      },
    });

    await writeAuditLog({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      action: "hint_purchased",
      payload: {
        level: currentLevel,
        tile_id: tile.id,
        point_cost: pointCost,
        score: nextGameState.score,
      },
    });

    return {
      success: true,
      data: { hintText: tile.hint.text, score: nextGameState.score, cost: pointCost },
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
  studioGameVersionId?: string | null,
) {
  const content = await loadResolvedEventContent({
    eventId,
    organizationId,
    cityId,
    contentConfig,
    routeOverride,
    studioGameVersionId,
  });
  const totalLevels = content.levels.length || EXITMANIA_TOTAL_LEVELS;
  const initialState =
    content.compiledLogic && content.compiledLogic.levels.length > 0
      ? createInitialGameStateFromCompiled(content.compiledLogic)
      : createInitialGameState(totalLevels);

  const firstActive = Object.entries(initialState.levels).find(
    ([, entry]) => entry.status === "active",
  );
  const startLevel = firstActive ? Number(firstActive[0]) : 1;
  const stampedState = activateLevelEntry(initialState.levels, String(startLevel));
  const startDef = getLevelDefinition(content, startLevel);
  const startPhase =
    usesPhasedPlay(content) && startDef
      ? initialPhaseForSurface(
          content.contentMode,
          buildPlaySlot(startDef, content.contentMode),
        )
      : undefined;
  const gameStateWithStart = {
    ...initialState,
    levels: stampedState,
    ...(startPhase ? { current_phase: startPhase } : {}),
  };

  const supabase = createAdminClient();
  await supabase
    .from("teams")
    .update({
      current_level: startLevel,
      game_state: gameStateWithStart,
    })
    .eq("id", teamId);

  await insertSyncEvent({
    teamId,
    eventType: "game_started",
    level: startLevel,
    actorPlayerId,
    payload: {
      total_levels: totalLevels,
      template_slug: content.templateSlug,
      starting_score: gameStateWithStart.score,
    },
  });
}

async function persistPhaseState(input: {
  teamId: string;
  gameState: TeamGameState;
  currentLevel: number;
  player: { id: string; is_captain: boolean };
}): Promise<ActionResult<TeamRealtimeState>> {
  const supabase = createAdminClient();
  const { data: updatedTeam, error } = await supabase
    .from("teams")
    .update({ game_state: input.gameState })
    .eq("id", input.teamId)
    .eq("status", "playing")
    .select(
      "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
    )
    .single();

  if (error || !updatedTeam) {
    return { success: false, error: error?.message ?? "Phasen-Update fehlgeschlagen." };
  }

  return { success: true, data: buildRealtimeState(updatedTeam, input.player) };
}

/**
 * Advance Hub → Quiz (arrival: GPS near / station code / online start).
 * Does not complete the level.
 */
export async function advanceFromHub(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  /** Outdoor: GPS sample for geofence. */
  geolocation?: SolveLevelPayload["geolocation"];
  /** Indoor: station code. */
  stationCode?: string;
  /** Jump to a specific level (indoor code match / online mission pick). */
  targetLevel?: number;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
      studioGameVersionId: event.studio_game_version_id,
    });

    if (!usesPhasedPlay(content)) {
      return { success: false, error: "Phasen-Flow ist für dieses Event nicht aktiv." };
    }

    let currentLevel = team.current_level || 1;
    if (input.targetLevel) {
      currentLevel = input.targetLevel;
    }

    if (input.stationCode) {
      const byCode = findLevelByStationCode(content.levels, input.stationCode);
      if (!byCode) {
        return { success: false, error: "Diesen Code gibt es hier nicht." };
      }
      const codeLevelState = gameState.levels[String(byCode.level)];
      if (codeLevelState?.status === "completed") {
        return { success: false, error: "Diese Station ist schon gelöst." };
      }
      currentLevel = byCode.level;
    }

    const levelDefinition = getLevelDefinition(content, currentLevel);
    if (!levelDefinition) {
      return { success: false, error: "Level-Inhalt nicht gefunden." };
    }

    const levelKey = String(currentLevel);
    const levelState = gameState.levels[levelKey];
    if (!levelState || levelState.status === "locked") {
      return { success: false, error: "Dieses Level ist noch gesperrt." };
    }
    if (levelState.status === "completed") {
      return { success: false, error: "Dieses Level ist schon gelöst." };
    }

    if (content.contentMode === "outdoor" && levelDefinition.location) {
      if (!input.geolocation) {
        return { success: false, error: "GPS-Position erforderlich." };
      }
      if (!isWithinGeofence(input.geolocation, levelDefinition.location)) {
        return {
          success: false,
          error: `Noch nicht am Wegpunkt (Radius: ${levelDefinition.location.radius_meters} m).`,
        };
      }
    }

    if (content.contentMode === "indoor") {
      if (input.stationCode) {
        const codeCheck = validateStationCode(levelDefinition, input.stationCode);
        if (!codeCheck.ok) return { success: false, error: codeCheck.error };
      } else if (!input.targetLevel) {
        return { success: false, error: "Stationscode oder Station wählen." };
      }
    }

    const slot = buildPlaySlot(levelDefinition, content.contentMode);
    const nextPhase: PlayPhase = slot.quiz ? "quiz" : "level";

    let levels = gameState.levels;
    if (currentLevel !== team.current_level) {
      levels = activateLevelEntry(levels, levelKey);
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      current_phase: nextPhase,
      levels,
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        current_level: currentLevel,
        game_state: nextGameState,
      })
      .eq("id", team.id)
      .eq("status", "playing")
      .select(
        "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
      )
      .single();

    if (error || !updatedTeam) {
      return { success: false, error: error?.message ?? "Hub-Update fehlgeschlagen." };
    }

    return { success: true, data: buildRealtimeState(updatedTeam, player) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Hub-Fortschritt fehlgeschlagen.",
    };
  }
}

/** Submit arrival/station/online unlock quiz → advance to level phase. */
export async function submitArrivalQuiz(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    if (gameState.current_phase && gameState.current_phase !== "quiz") {
      return { success: false, error: "Gerade ist kein Quiz aktiv." };
    }

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
      studioGameVersionId: event.studio_game_version_id,
    });

    const currentLevel = team.current_level || 1;
    const levelDefinition = getLevelDefinition(content, currentLevel);
    if (!levelDefinition) {
      return { success: false, error: "Level-Inhalt nicht gefunden." };
    }

    const slot = buildPlaySlot(levelDefinition, content.contentMode);
    if (!slot.quiz) {
      return { success: false, error: "Kein Freischalt-Quiz für dieses Level." };
    }

    const validation = validateArrivalQuiz(
      slot.quiz,
      input.selectedOptionId,
      input.selectedOptionIds,
    );
    const levelState = gameState.levels[String(currentLevel)];
    const durations = computeAttemptDurations({
      levelStartedAt: levelState?.started_at,
      teamStartedAt: team.started_at,
    });
    const attemptBase = {
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      playerName: player.display_name,
      playerRole: player.role,
      level: currentLevel,
      phase: "arrival_quiz" as const,
      selectedOptionId: input.selectedOptionId ?? null,
      selectedOptionIds: input.selectedOptionIds ?? null,
      durationMs: durations.durationMs,
      elapsedMissionMs: durations.elapsedMissionMs,
      contentMode: content.contentMode,
      levelTitle: levelDefinition.title ?? null,
    };

    const correct = validation.ok;
    await logPlayAttempt({
      ...attemptBase,
      correct,
      error: correct ? null : validation.error,
    });

    // Wrong answer still unlocks the mission — only correct answers earn opener points.
    const quizPoints = correct && slot.quiz.points ? Math.max(0, Math.round(slot.quiz.points)) : 0;

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      score: gameState.score + quizPoints,
      current_phase: "level",
    };

    return persistPhaseState({
      teamId: team.id,
      gameState: nextGameState,
      currentLevel,
      player,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Quiz fehlgeschlagen.",
    };
  }
}

async function leaveBonusPhase(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  selectedOptionId?: string;
  skip?: boolean;
}): Promise<ActionResult<TeamRealtimeState>> {
  const { event, team, player } = await assertPlayerSession(input);
  if (team.status !== "playing") {
    return { success: false, error: "Das Spiel läuft noch nicht." };
  }

  const gameState = parseTeamGameState(team.game_state);
  if (gameState.current_phase !== "bonus") {
    return { success: false, error: "Keine Bonusphase aktiv." };
  }

  const content = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });

  const bonusLevel = team.current_level || 1;
  const levelDefinition = getLevelDefinition(content, bonusLevel);
  const bonus = resolveBonusTask(levelDefinition);

  let reward = 0;
  if (!input.skip && bonus) {
    const playerRole = (player.role ?? "gamma") as PlayerRole;
    if (!isBonusForRole(bonus, playerRole)) {
      return { success: false, error: "Diese Bonusaufgabe ist für eine andere Rolle." };
    }
    const validation = validateBonusQuiz(
      {
        question: bonus.question,
        options: bonus.options,
        correct_option_id: bonus.correct_option_id,
      },
      input.selectedOptionId,
    );
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }
    if (input.selectedOptionId === bonus.correct_option_id) {
      reward = bonus.reward;
    }
  }

  const pending = gameState.pending_next_level;
  const isFinished =
    pending === null ||
    pending === undefined ||
    pending > content.levels.length ||
    Object.values(gameState.levels).every((entry) => entry.status === "completed");

  const nextLevel = isFinished ? bonusLevel : (pending ?? bonusLevel + 1);
  const nextSlot = getLevelDefinition(content, nextLevel);
  const hubPhase: PlayPhase =
    nextSlot && usesPhasedPlay(content)
      ? initialPhaseForSurface(
          content.contentMode,
          buildPlaySlot(nextSlot, content.contentMode),
        )
      : "hub";

  let levels = gameState.levels;
  if (!isFinished) {
    levels = activateLevelEntry(levels, String(nextLevel));
  }

  const nextGameState: TeamGameState = {
    ...gameState,
    version: gameState.version + 1,
    score: gameState.score + reward,
    current_phase: isFinished ? gameState.current_phase : hubPhase,
    pending_next_level: null,
    levels,
  };

  const supabase = createAdminClient();
  const { data: updatedTeam, error } = await supabase
    .from("teams")
    .update({
      current_level: nextLevel,
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
    return { success: false, error: error?.message ?? "Bonus-Update fehlgeschlagen." };
  }

  return { success: true, data: buildRealtimeState(updatedTeam, player) };
}

/** Submit Layer-3 bonus answer (assigned role only). Wrong answers still continue. */
export async function submitBonusAnswer(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  selectedOptionId: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    // Allow wrong answers to continue — validate only presence, award if correct
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    if (gameState.current_phase !== "bonus") {
      return { success: false, error: "Keine Bonusphase aktiv." };
    }

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
      studioGameVersionId: event.studio_game_version_id,
    });

    const bonusLevel = team.current_level || 1;
    const levelDefinition = getLevelDefinition(content, bonusLevel);
    const bonus = resolveBonusTask(levelDefinition);
    if (!bonus) {
      return leaveBonusPhase({ ...input, skip: true });
    }

    const playerRole = (player.role ?? "gamma") as PlayerRole;
    if (!isBonusForRole(bonus, playerRole)) {
      return { success: false, error: "Diese Bonusaufgabe ist für eine andere Rolle." };
    }

    if (!input.selectedOptionId) {
      return { success: false, error: "Bitte eine Antwort auswählen." };
    }

    const correctIds =
      bonus.correct_option_ids && bonus.correct_option_ids.length > 0
        ? bonus.correct_option_ids
        : [bonus.correct_option_id];
    const correct = correctIds.includes(input.selectedOptionId);
    const reward = correct ? bonus.reward : 0;
    const levelState = gameState.levels[String(bonusLevel)];
    const durations = computeAttemptDurations({
      levelStartedAt: levelState?.started_at,
      teamStartedAt: team.started_at,
    });
    await logPlayAttempt({
      organizationId: event.organization_id,
      eventId: event.id,
      teamId: team.id,
      playerId: player.id,
      playerName: player.display_name,
      playerRole: player.role,
      level: bonusLevel,
      phase: "bonus",
      correct,
      selectedOptionId: input.selectedOptionId,
      error: correct ? null : "falsche_antwort",
      durationMs: durations.durationMs,
      elapsedMissionMs: durations.elapsedMissionMs,
      contentMode: content.contentMode,
      levelTitle: levelDefinition?.title ?? null,
    });

    const pending = gameState.pending_next_level;
    const nextLevel =
      pending === null || pending === undefined ? bonusLevel + 1 : pending;
    const finished = nextLevel > content.levels.length;
    const nextSlot = getLevelDefinition(content, finished ? bonusLevel : nextLevel);
    const hubPhase: PlayPhase =
      !finished && nextSlot && usesPhasedPlay(content)
        ? initialPhaseForSurface(
            content.contentMode,
            buildPlaySlot(nextSlot, content.contentMode),
          )
        : "hub";

    let levels = gameState.levels;
    if (!finished) {
      levels = activateLevelEntry(levels, String(nextLevel));
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      score: gameState.score + reward,
      current_phase: finished ? gameState.current_phase : hubPhase,
      pending_next_level: null,
      levels,
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        current_level: finished ? bonusLevel : nextLevel,
        game_state: nextGameState,
        status: finished ? "finished" : "playing",
        finished_at: finished ? new Date().toISOString() : null,
      })
      .eq("id", team.id)
      .eq("status", "playing")
      .select(
        "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
      )
      .single();

    if (error || !updatedTeam) {
      return { success: false, error: error?.message ?? "Bonus-Update fehlgeschlagen." };
    }

    return { success: true, data: buildRealtimeState(updatedTeam, player) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bonus fehlgeschlagen.",
    };
  }
}

/** Skip bonus (non-assigned roles waiting, or empty bonus). Advances team to next hub. */
export async function skipBonusPhase(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    return await leaveBonusPhase({ ...input, skip: true });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bonus überspringen fehlgeschlagen.",
    };
  }
}
