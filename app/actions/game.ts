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
import { isWithinGeofenceForPlay } from "@/lib/grid/geofence";
import {
  hasReachedDistanceMeters,
  resolveOutdoorUnlockMode,
  upsertOutdoorBonusMeters,
  upsertOutdoorLevelProgress,
  type OutdoorForceUnlock,
} from "@/lib/grid/outdoor-unlock";
import { isBonusForRole, findBonusTaskById, resolveBonusDefinitions, resolveBonusTask } from "@/lib/grid/bonus";
import {
  markBonusActive,
  markBonusDone,
  mergeBonusQueue,
  pickBonusToActivate,
  promoteArmedBonuses,
} from "@/lib/grid/bonus-queue";
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
    const forceUnlock = input.payload?.forceUnlock;
    if (forceUnlock && !archetype.canUnlockGps) {
      return {
        success: false,
        error: "Nur Alpha / GPS-Leiter kann den Standort manuell freigeben.",
      };
    }

    const validation = validateLevelSolution(levelDefinition, input.payload ?? {}, {
      isCaptain: player.is_captain,
      isNavigator: team.navigator_player_id === player.id,
      canUnlockGps: archetype.canUnlockGps,
      effectiveBeta: archetype.effectiveBeta,
      archetypeRole: archetype.archetypeRole,
      playerRole,
      gpsEnabled: content.capabilities.gps,
      forceUnlock,
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

    const bonusDefs = resolveBonusDefinitions(levelDefinition);
    const bonus = resolveBonusTask(levelDefinition);
    // Bonus only after a real solve — reveal-solution completes without bonus.
    const wantBonus =
      Boolean(bonusDefs.length > 0) && !input.payload?.revealSolution;

    const armedAt = new Date();
    const bonusQueue: NonNullable<TeamGameState["bonus_queue"]> = wantBonus
      ? bonusDefs.map((def) => {
          const when = def.when ?? { type: "immediate" as const };
          let readyAt: string | null = null;
          let status: "armed" | "ready" = "armed";

          if (when.type === "immediate") {
            status = "ready";
            readyAt = armedAt.toISOString();
          } else if (when.type === "delay_minutes" && when.minutes && when.minutes > 0) {
            readyAt = new Date(
              armedAt.getTime() + when.minutes * 60_000,
            ).toISOString();
          } else if (when.type === "interval_minutes" && when.minutes && when.minutes > 0) {
            // First fire after N minutes from solve, then re-arm on complete.
            readyAt = new Date(
              armedAt.getTime() + when.minutes * 60_000,
            ).toISOString();
          } else if (when.type === "game_minutes" && when.minutes && when.minutes > 0) {
            const startMs = team.started_at
              ? new Date(team.started_at).getTime()
              : armedAt.getTime();
            readyAt = new Date(startMs + when.minutes * 60_000).toISOString();
            if (readyAt <= armedAt.toISOString()) {
              status = "ready";
            }
          }

          return {
            bonus_id: def.id,
            from_level: currentLevel,
            for_role: def.for_role,
            for_team: Boolean(def.for_team),
            armed_at: armedAt.toISOString(),
            ready_at: readyAt,
            status,
            meters_required:
              when.type === "delay_meters" && when.meters ? when.meters : undefined,
            interval_minutes:
              when.type === "interval_minutes" && when.minutes
                ? when.minutes
                : undefined,
            task_snapshot: {
              for_role: def.for_role,
              for_team: Boolean(def.for_team),
              title: def.title,
              intro: def.intro,
              question: def.question,
              options: def.options,
              correct_option_id: def.correct_option_id,
              correct_option_ids: def.correct_option_ids,
              reward: def.reward,
            },
          };
        })
      : (gameState.bonus_queue ?? []);

    const readyNow = bonusQueue.filter((item) => {
      if (item.status === "ready" || item.status === "active") return true;
      if (item.status === "armed" && item.ready_at && item.ready_at <= armedAt.toISOString()) {
        return true;
      }
      return false;
    });

    const immediateTeam = readyNow.find((item) => item.for_team);
    const immediateSolo = readyNow.find((item) => !item.for_team);
    const teamBonus = Boolean(wantBonus && immediateTeam);
    const soloBonus = Boolean(wantBonus && !immediateTeam && immediateSolo && bonus);

    let nextPhase: PlayPhase | undefined;
    let pendingNext: number | null = null;
    let activeBonus: TeamGameState["active_bonus"] = null;
    let teamCurrentLevel = isFinished ? currentLevel : nextLevel;

    if (teamBonus && immediateTeam) {
      // Whole team stays on this slot in bonus phase after the Gelöst-modal.
      nextPhase = "bonus";
      pendingNext = isFinished ? null : nextLevel;
      teamCurrentLevel = currentLevel;
      immediateTeam.status = "active";
    } else if (soloBonus && immediateSolo && bonus) {
      // Team advances; assigned role gets an overlay via active_bonus.
      const nextSlot = getLevelDefinition(content, isFinished ? currentLevel : nextLevel);
      nextPhase = isFinished
        ? gameState.current_phase
        : nextSlot && usesPhasedPlay(content)
          ? initialPhaseForSurface(
              content.contentMode,
              buildPlaySlot(nextSlot, content.contentMode),
              nextSlot,
            )
          : "hub";
      activeBonus = {
        from_level: currentLevel,
        for_role: immediateSolo.for_role,
        for_team: false,
        started_at: armedAt.toISOString(),
        bonus_id: immediateSolo.bonus_id,
      };
      immediateSolo.status = "active";
      teamCurrentLevel = isFinished ? currentLevel : nextLevel;
    } else {
      // Keep phase on the solved slot under the modal; hub opens on Weiter.
      // Delayed bonuses stay in queue until ready_at / meters.
      nextPhase = isFinished ? gameState.current_phase : "level";
    }

    const armedMeterBonus = bonusQueue.some(
      (item) => typeof item.meters_required === "number" && item.meters_required > 0,
    );

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      total_levels: content.levels.length,
      score: gameState.score + pointsEarned,
      current_phase: nextPhase,
      pending_next_level: pendingNext,
      quiz_reveal: null,
      active_bonus: activeBonus,
      bonus_queue: mergeBonusQueue(gameState.bonus_queue, bonusQueue),
      bonus_notice: null,
      outdoor_progress: {
        level: isFinished ? currentLevel : nextLevel,
        walked_meters: 0,
        updated_at: armedAt.toISOString(),
        bonus_walked_meters: armedMeterBonus ? 0 : gameState.outdoor_progress?.bonus_walked_meters,
      },
      modal: buildLevelCompletedModal({
        level: currentLevel,
        solvedBy,
        pointsEarned,
        successTitle: levelDefinition.success_title,
        successInfo: input.payload?.revealSolution ? null : levelDefinition.success_info,
      }),
      levels: progressionLevels,
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        current_level: teamCurrentLevel,
        game_state: nextGameState,
        status: teamBonus || soloBonus || !isFinished ? "playing" : "finished",
        finished_at:
          !teamBonus && !soloBonus && isFinished ? new Date().toISOString() : null,
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
        force_unlock: forceUnlock ?? null,
      },
    });

    if (forceUnlock) {
      await writeAuditLog({
        organizationId: event.organization_id,
        eventId: event.id,
        teamId: team.id,
        playerId: player.id,
        action: "outdoor_force_unlock",
        payload: {
          level: currentLevel,
          mode: forceUnlock,
          path: "solve",
          geolocation: input.payload?.geolocation ?? null,
        },
      });
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

export async function purchaseHint(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  tileId: string;
}): Promise<
  ActionResult<{
    hintText: string;
    score: number;
    cost: number;
    unlockedBy: string;
    unlockedByPlayerId: string;
    unlockedAt: string;
  }>
> {
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

    const unlockedAt = new Date().toISOString();
    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      score: gameState.score - pointCost,
      purchased_tile_hints: {
        ...gameState.purchased_tile_hints,
        [levelKey]: {
          ...levelHints,
          [input.tileId]: {
            text: tile.hint.text,
            cost: pointCost,
            unlocked_by: player.display_name,
            unlocked_by_player_id: player.id,
            unlocked_at: unlockedAt,
          },
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
        unlocked_by: player.display_name,
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
        unlocked_by: player.display_name,
      },
    });

    return {
      success: true,
      data: {
        hintText: tile.hint.text,
        score: nextGameState.score,
        cost: pointCost,
        unlockedBy: player.display_name,
        unlockedByPlayerId: player.id,
        unlockedAt,
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
    const { event, team, player } = await assertPlayerSession(input);
    const gameState = parseTeamGameState(team.game_state);

    if (!gameState.modal || gameState.modal.id !== input.modalId) {
      const current = await getGameState(input);
      if (!current.success) {
        return current;
      }
      return current;
    }

    const content = await loadResolvedEventContent({
      eventId: event.id,
      organizationId: event.organization_id,
      cityId: event.city_id,
      contentConfig: event.content_config,
      routeOverride: event.route_override,
      studioGameVersionId: event.studio_game_version_id,
    });

    // After a normal solve, open hub for the next slot. Bonus stays on bonus after dismiss.
    // Solo-role bonus already advanced to hub with active_bonus — leave phase alone.
    // Also recover if queue already has an active team bonus but phase drifted.
    const activeTeamBonus = (gameState.bonus_queue ?? []).some(
      (item) => item.status === "active" && item.for_team,
    );
    let nextPhase = activeTeamBonus ? ("bonus" as const) : gameState.current_phase;
    if (
      !activeTeamBonus &&
      gameState.current_phase === "level" &&
      !gameState.active_bonus &&
      usesPhasedPlay(content)
    ) {
      const nextDef = getLevelDefinition(content, team.current_level || 1);
      if (nextDef) {
        nextPhase = initialPhaseForSurface(
          content.contentMode,
          buildPlaySlot(nextDef, content.contentMode),
          nextDef,
        );
      } else {
        nextPhase = "hub";
      }
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      modal: null,
      quiz_reveal: null,
      current_phase: nextPhase,
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
          startDef,
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
 * Advance Hub → Quiz (arrival: GPS near / station code / online start / walk meters).
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
  /** Outdoor distance unlock: meters walked on the tracking device. */
  walkedMeters?: number;
  /**
   * Alpha lead override when GPS/meters fail outdoors.
   * Audited — prevents support dead-ends without silent cheating.
   */
  forceUnlock?: OutdoorForceUnlock;
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

    const unlockMode = resolveOutdoorUnlockMode(levelDefinition);
    const nowIso = new Date().toISOString();
    let outdoorProgress = gameState.outdoor_progress ?? null;

    if (input.forceUnlock) {
      if (!archetype.canUnlockGps) {
        return {
          success: false,
          error: "Nur Alpha / GPS-Leiter kann den Standort manuell freigeben.",
        };
      }
      if (
        (input.forceUnlock === "geofence" && unlockMode !== "geofence") ||
        (input.forceUnlock === "distance" && unlockMode !== "distance")
      ) {
        return { success: false, error: "Dieser Override passt nicht zum aktuellen Unlock." };
      }
    }

    if (content.contentMode === "outdoor" && unlockMode === "geofence" && levelDefinition.location) {
      if (!input.forceUnlock) {
        if (!input.geolocation) {
          return { success: false, error: "GPS-Position erforderlich." };
        }
        if (!isWithinGeofenceForPlay(input.geolocation, levelDefinition.location)) {
          return {
            success: false,
            error: `Noch nicht am Wegpunkt (Radius: ${levelDefinition.location.radius_meters} m).`,
          };
        }
      }
    }

    if (content.contentMode === "outdoor" && unlockMode === "distance") {
      const required = levelDefinition.triggers?.after_meters ?? 0;
      if (typeof input.walkedMeters === "number" && input.walkedMeters >= 0) {
        outdoorProgress = upsertOutdoorLevelProgress({
          existing: outdoorProgress,
          level: currentLevel,
          reportedMeters: input.walkedMeters,
          playerId: player.id,
          nowIso,
        });
      }
      const walked =
        outdoorProgress && outdoorProgress.level === currentLevel
          ? outdoorProgress.walked_meters
          : 0;
      if (!input.forceUnlock && !hasReachedDistanceMeters(walked, required)) {
        return {
          success: false,
          error: `Noch nicht genug Meter gelaufen (${Math.round(walked)} / ${required} m).`,
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
      // Mission meters reset; bonus meter walk (Layer-3) must survive hub advance.
      outdoor_progress:
        unlockMode === "distance" || unlockMode === "geofence"
          ? {
              level: currentLevel,
              walked_meters: 0,
              updated_at: nowIso,
              bonus_walked_meters: outdoorProgress?.bonus_walked_meters,
            }
          : outdoorProgress,
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

    if (input.forceUnlock) {
      await writeAuditLog({
        organizationId: event.organization_id,
        eventId: event.id,
        teamId: team.id,
        playerId: player.id,
        action: "outdoor_force_unlock",
        payload: {
          level: currentLevel,
          mode: input.forceUnlock,
          walked_meters: outdoorProgress?.walked_meters ?? null,
          geolocation: input.geolocation ?? null,
        },
      });
    } else if (content.contentMode === "outdoor" && (unlockMode === "geofence" || unlockMode === "distance")) {
      await writeAuditLog({
        organizationId: event.organization_id,
        eventId: event.id,
        teamId: team.id,
        playerId: player.id,
        action: "outdoor_hub_arrive",
        payload: {
          level: currentLevel,
          mode: unlockMode,
          walked_meters:
            unlockMode === "distance" ? outdoorProgress?.walked_meters ?? null : null,
        },
      });
    }

    return { success: true, data: buildRealtimeState(updatedTeam, player) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Hub-Fortschritt fehlgeschlagen.",
    };
  }
}

/**
 * Alpha device reports walked meters so the team state stays the source of truth.
 * Non-trackers still see progress via realtime.
 */
export async function syncOutdoorWalkProgress(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  level: number;
  walkedMeters: number;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
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

    if (!archetype.canUnlockGps) {
      return { success: false, error: "Nur Alpha / GPS-Leiter trackt die Strecke." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const nowIso = new Date().toISOString();
    const outdoorProgress = upsertOutdoorLevelProgress({
      existing: gameState.outdoor_progress,
      level: input.level,
      reportedMeters: input.walkedMeters,
      playerId: player.id,
      nowIso,
    });

    const unchanged =
      gameState.outdoor_progress?.level === outdoorProgress.level &&
      Math.abs((gameState.outdoor_progress?.walked_meters ?? 0) - outdoorProgress.walked_meters) < 0.5;

    if (unchanged) {
      return { success: true, data: buildRealtimeState(team, player) };
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      outdoor_progress: outdoorProgress,
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({ game_state: nextGameState })
      .eq("id", team.id)
      .eq("status", "playing")
      .select(
        "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
      )
      .single();

    if (error || !updatedTeam) {
      return { success: false, error: error?.message ?? "Meter-Sync fehlgeschlagen." };
    }

    return { success: true, data: buildRealtimeState(updatedTeam, player) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Meter-Sync fehlgeschlagen.",
    };
  }
}

/** Submit arrival/station/online unlock quiz → shared reveal, then advance to level. */
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

    // Someone already answered — advance the whole team to the puzzle.
    if (gameState.quiz_reveal) {
      return advanceQuizToLevel({
        inviteCode: input.inviteCode,
        joinCode: input.joinCode,
        sessionId: input.sessionId,
      });
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
    const selectedIds =
      input.selectedOptionIds?.length
        ? input.selectedOptionIds
        : input.selectedOptionId
          ? [input.selectedOptionId]
          : [];
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
      current_phase: "quiz",
      quiz_reveal: {
        answered_by: player.display_name,
        answered_by_player_id: player.id,
        correct,
        selected_option_ids: selectedIds,
        points_earned: quizPoints,
        revealed_at: new Date().toISOString(),
      },
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

/** After shared quiz reveal — open the real task for the whole team. */
export async function advanceQuizToLevel(input: {
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
    if (gameState.current_phase !== "quiz") {
      const current = await getGameState(input);
      return current.success ? current : { success: false, error: "Kein Quiz aktiv." };
    }
    if (!gameState.quiz_reveal) {
      return { success: false, error: "Quiz noch nicht beantwortet." };
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      current_phase: "level",
      quiz_reveal: null,
    };

    return persistPhaseState({
      teamId: team.id,
      gameState: nextGameState,
      currentLevel: team.current_level || 1,
      player,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Weiter zur Aufgabe fehlgeschlagen.",
    };
  }
}

async function completeActiveBonus(input: {
  event: {
    id: string;
    organization_id: string;
    city_id: string | null;
    content_config: unknown;
    route_override: unknown;
    studio_game_version_id?: string | null;
  };
  team: {
    id: string;
    status: string;
    current_level: number | null;
    game_state: unknown;
    started_at: string | null;
  };
  player: {
    id: string;
    display_name: string;
    role: string | null;
    is_captain: boolean;
  };
  gameState: TeamGameState;
  selectedOptionId?: string;
  skip?: boolean;
}): Promise<ActionResult<TeamRealtimeState>> {
  const { event, team, player, gameState } = input;
  const playerRole = (player.role ?? "gamma") as PlayerRole;
  const normalizedRole =
    playerRole === "captain" || playerRole === "navigator"
      ? "alpha"
      : playerRole === "solver"
        ? "gamma"
        : playerRole === "alpha" || playerRole === "beta" || playerRole === "gamma"
          ? playerRole
          : "gamma";

  const fromQueue = (gameState.bonus_queue ?? []).find(
    (item) =>
      item.status === "active" &&
      (item.for_team || item.for_role === normalizedRole),
  );
  const active = fromQueue
    ? {
        from_level: fromQueue.from_level,
        for_role: fromQueue.for_role,
        for_team: fromQueue.for_team,
        started_at: fromQueue.armed_at,
        bonus_id: fromQueue.bonus_id,
      }
    : gameState.active_bonus;

  if (!active) {
    return { success: false, error: "Kein aktiver Bonus." };
  }

  const content = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });

  const levelDefinition = getLevelDefinition(content, active.from_level);
  const bonus =
    findBonusTaskById(levelDefinition, active.bonus_id) ??
    fromQueue?.task_snapshot ??
    null;
  if (!bonus) {
    const now = new Date();
    const cleared: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      active_bonus: null,
      bonus_queue: markBonusDone(
        gameState.bonus_queue ?? [],
        active.bonus_id ?? "",
        now,
      ),
    };
    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({ game_state: cleared })
      .eq("id", team.id)
      .select(
        "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
      )
      .single();
    if (error || !updatedTeam) {
      return { success: false, error: error?.message ?? "Bonus konnte nicht beendet werden." };
    }
    return { success: true, data: buildRealtimeState(updatedTeam, player) };
  }

  const playerRoleCheck = (player.role ?? "gamma") as PlayerRole;
  if (!isBonusForRole(bonus, playerRoleCheck)) {
    return { success: false, error: "Diese Bonusaufgabe ist für eine andere Rolle." };
  }

  let correct = false;
  let reward = 0;
  if (!input.skip) {
    if (!input.selectedOptionId) {
      return { success: false, error: "Bitte eine Antwort auswählen." };
    }
    const correctIds =
      bonus.correct_option_ids && bonus.correct_option_ids.length > 0
        ? bonus.correct_option_ids
        : [bonus.correct_option_id];
    correct = correctIds.includes(input.selectedOptionId);
    reward = correct ? bonus.reward : 0;
  }

  const allDone = Object.values(gameState.levels).every((entry) => entry.status === "completed");
  const noticeId = `bonus-${Date.now()}-${player.id.slice(0, 8)}`;
  const now = new Date();
  const doneId = active.bonus_id ?? `${active.from_level}`;
  let nextQueue = markBonusDone(gameState.bonus_queue ?? [], doneId, now);

  // Keep active_bonus if another role still has an active item.
  const stillActive = nextQueue.find((item) => item.status === "active");
  const nextActive = stillActive
    ? {
        from_level: stillActive.from_level,
        for_role: stillActive.for_role,
        for_team: stillActive.for_team,
        started_at: stillActive.armed_at,
        bonus_id: stillActive.bonus_id,
      }
    : null;

  const nextGameState: TeamGameState = {
    ...gameState,
    version: gameState.version + 1,
    score: gameState.score + reward,
    active_bonus: nextActive,
    bonus_queue: nextQueue,
    bonus_notice: {
      id: noticeId,
      by: player.display_name,
      correct,
      reward,
      created_at: now.toISOString(),
    },
  };

  const supabase = createAdminClient();
  const { data: updatedTeam, error } = await supabase
    .from("teams")
    .update({
      game_state: nextGameState,
      status: allDone ? "finished" : "playing",
      finished_at: allDone ? new Date().toISOString() : null,
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

/**
 * Promote armed bonuses (time/meters) and activate the next ready surprise.
 * Called on a client tick after phone wake / walk progress.
 */
export async function activateReadyBonuses(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  /** Meters walked since arm, keyed by bonus_id (for delay_meters). */
  walkedMetersByBonusId?: Record<string, number>;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const now = new Date();
    const nowIso = now.toISOString();

    let outdoorProgress = gameState.outdoor_progress ?? null;
    const clientMeters = input.walkedMetersByBonusId ?? {};
    const maxClientMeters = Math.max(0, ...Object.values(clientMeters), 0);

    if (maxClientMeters > 0) {
      outdoorProgress = upsertOutdoorBonusMeters({
        existing: outdoorProgress,
        reportedMeters: maxClientMeters,
        playerId: player.id,
        nowIso,
        level: team.current_level ?? outdoorProgress?.level,
      });
    }

    const serverBonusMeters = outdoorProgress?.bonus_walked_meters ?? 0;
    const mergedMetersByBonusId: Record<string, number> = { ...clientMeters };
    for (const item of gameState.bonus_queue ?? []) {
      if (item.meters_required && item.meters_required > 0) {
        const client = clientMeters[item.bonus_id] ?? 0;
        mergedMetersByBonusId[item.bonus_id] = Math.max(client, serverBonusMeters);
      }
    }

    let queue = promoteArmedBonuses(
      gameState.bonus_queue ?? [],
      nowIso,
      mergedMetersByBonusId,
    );

    // Also promote by ready_at even if status still armed
    queue = queue.map((item) => {
      if (
        item.status === "armed" &&
        item.ready_at &&
        item.ready_at <= nowIso &&
        !item.meters_required
      ) {
        return { ...item, status: "ready" as const };
      }
      return item;
    });

    const pick = pickBonusToActivate(queue);
    let activeBonus = gameState.active_bonus ?? null;
    let currentPhase = gameState.current_phase;
    let pendingNext = gameState.pending_next_level;
    let currentLevel = team.current_level ?? 1;

    if (!activeBonus) {
      const readySolos = queue.filter((item) => item.status === "ready" && !item.for_team);
      const readyTeam = queue.find((item) => item.status === "ready" && item.for_team);

      // Parallel role pack: activate every ready solo bonus at once.
      for (const item of readySolos) {
        queue = markBonusActive(queue, item.bonus_id);
      }
      if (readySolos[0]) {
        activeBonus = {
          from_level: readySolos[0].from_level,
          for_role: readySolos[0].for_role,
          for_team: false,
          started_at: nowIso,
          bonus_id: readySolos[0].bonus_id,
        };
      } else if (readyTeam) {
        queue = markBonusActive(queue, readyTeam.bonus_id);
        activeBonus = {
          from_level: readyTeam.from_level,
          for_role: readyTeam.for_role,
          for_team: true,
          started_at: nowIso,
          bonus_id: readyTeam.bonus_id,
        };
      } else if (pick) {
        queue = markBonusActive(queue, pick.bonus_id);
        activeBonus = {
          from_level: pick.from_level,
          for_role: pick.for_role,
          for_team: pick.for_team,
          started_at: nowIso,
          bonus_id: pick.bonus_id,
        };
      }

      void currentPhase;
      void pendingNext;
      void currentLevel;
    }

    const changed =
      JSON.stringify(queue) !== JSON.stringify(gameState.bonus_queue ?? []) ||
      JSON.stringify(activeBonus) !== JSON.stringify(gameState.active_bonus ?? null) ||
      JSON.stringify(outdoorProgress) !== JSON.stringify(gameState.outdoor_progress ?? null);

    if (!changed) {
      return {
        success: true,
        data: buildRealtimeState(team, player),
      };
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      bonus_queue: queue,
      active_bonus: activeBonus,
      outdoor_progress: outdoorProgress,
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        game_state: nextGameState,
      })
      .eq("id", team.id)
      .eq("status", "playing")
      .select(
        "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
      )
      .single();

    if (error || !updatedTeam) {
      return {
        success: false,
        error: error?.message ?? "Bonus-Queue konnte nicht aktualisiert werden.",
      };
    }

    return { success: true, data: buildRealtimeState(updatedTeam, player) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bonus-Activate fehlgeschlagen.",
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
  const activeQueued = (gameState.bonus_queue ?? []).find(
    (item) => item.status === "active" && item.from_level === bonusLevel,
  );
  const bonus =
    findBonusTaskById(levelDefinition, activeQueued?.bonus_id) ??
    activeQueued?.task_snapshot ??
    resolveBonusTask(levelDefinition);

  let reward = 0;
  let correct = false;
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
      correct = true;
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
          nextSlot,
        )
      : "hub";

  let levels = gameState.levels;
  if (!isFinished) {
    levels = activateLevelEntry(levels, String(nextLevel));
  }

  const noticeId = `bonus-${Date.now()}-${player.id.slice(0, 8)}`;
  const now = new Date();
  let queue = gameState.bonus_queue ?? [];
  const activeItem = queue.find(
    (item) => item.status === "active" && item.from_level === bonusLevel,
  );
  if (activeItem) {
    queue = markBonusDone(queue, activeItem.bonus_id, now);
  }

  const nextGameState: TeamGameState = {
    ...gameState,
    version: gameState.version + 1,
    score: gameState.score + reward,
    current_phase: isFinished ? gameState.current_phase : hubPhase,
    pending_next_level: null,
    active_bonus: null,
    bonus_queue: queue,
    bonus_notice: input.skip
      ? null
      : {
          id: noticeId,
          by: player.display_name,
          correct,
          reward,
          created_at: new Date().toISOString(),
        },
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

    // Overlay (role or team) while the rest of the team may already be on the hub.
    if (gameState.active_bonus) {
      return completeActiveBonus({
        event,
        team,
        player,
        gameState,
        selectedOptionId: input.selectedOptionId,
        skip: false,
      });
    }

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
    const activeQueued = (gameState.bonus_queue ?? []).find(
      (item) => item.status === "active" && item.from_level === bonusLevel,
    );
    const bonus =
      findBonusTaskById(levelDefinition, activeQueued?.bonus_id) ??
      activeQueued?.task_snapshot ??
      resolveBonusTask(levelDefinition);
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
            nextSlot,
          )
        : "hub";

    let levels = gameState.levels;
    if (!finished) {
      levels = activateLevelEntry(levels, String(nextLevel));
    }

    const noticeId = `bonus-${Date.now()}-${player.id.slice(0, 8)}`;
    const now = new Date();
    let queue = gameState.bonus_queue ?? [];
    const activeItem = queue.find(
      (item) => item.status === "active" && item.from_level === bonusLevel,
    );
    if (activeItem) {
      queue = markBonusDone(queue, activeItem.bonus_id, now);
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      score: gameState.score + reward,
      current_phase: finished ? gameState.current_phase : hubPhase,
      pending_next_level: null,
      active_bonus: null,
      bonus_queue: queue,
      bonus_notice: {
        id: noticeId,
        by: player.display_name,
        correct,
        reward,
        created_at: now.toISOString(),
      },
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
    const { event, team, player } = await assertPlayerSession(input);
    const gameState = parseTeamGameState(team.game_state);
    if (gameState.active_bonus) {
      return completeActiveBonus({
        event,
        team,
        player,
        gameState,
        skip: true,
      });
    }
    return await leaveBonusPhase({ ...input, skip: true });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bonus überspringen fehlgeschlagen.",
    };
  }
}
