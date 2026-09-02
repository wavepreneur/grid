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
  bonusSessionId,
  clearBonusSession,
  ensureBonusSession,
  patchBonusSession,
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
  missionFromLevel,
  usesPhasedPlay,
} from "@/lib/grid/play-slots";
import type { PlayPhase } from "@/lib/grid/play-surface";
import { isWithinGeofenceForPlay, withHealthRadiusBonus } from "@/lib/grid/geofence";
import {
  effectiveDistanceUnlockMeters,
  hasReachedDistanceMeters,
  resolveOutdoorUnlockMode,
  upsertOutdoorBonusMeters,
  upsertOutdoorLevelProgress,
  type OutdoorForceUnlock,
} from "@/lib/grid/outdoor-unlock";
import {
  canPresentBonus,
  formatBonusAttemptLabel,
  isBonusAnswerCorrect,
  resolveBonusDefinitions,
  resolveBonusForPlay,
} from "@/lib/grid/bonus";
import {
  markBonusActive,
  markBonusDone,
  mergeBonusQueue,
  pickBonusToActivate,
  promoteArmedBonuses,
} from "@/lib/grid/bonus-queue";

function buildRealtimeState(
  team: {
    id: string;
    status: string;
    current_level: number | null;
    game_state: unknown;
    started_at: string | null;
    lobby_auto_start_at?: string | null;
    navigator_player_id?: string | null;
  },
  player: { id: string; is_captain: boolean },
): TeamRealtimeState {
  return {
    teamId: team.id,
    status: team.status,
    currentLevel: team.current_level ?? 1,
    gameState: parseTeamGameState(team.game_state),
    startedAt: team.started_at,
    lobbyAutoStartAt: team.lobby_auto_start_at ?? null,
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

    const giveUpReveal =
      gameState.level_reveal && gameState.level_reveal.level === currentLevel
        ? gameState.level_reveal
        : null;
    if (giveUpReveal && !input.payload?.revealSolution) {
      return {
        success: false,
        error: "Die Lösung liegt schon offen. Die Team-Leitung geht weiter.",
      };
    }
    if (input.payload?.revealSolution && !(await playerCanPaceTeam(team.id, player))) {
      return { success: false, error: "Nur die Team-Leitung kann weitergehen." };
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

    const validation = validateLevelSolution(
      missionFromLevel(levelDefinition),
      input.payload ?? {},
      {
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

    const bonusDefsRaw = resolveBonusDefinitions(levelDefinition);
    // Dedupe by id — duplicate Studio bindings must not arm the same surprise twice.
    const seenBonusIds = new Set<string>();
    const bonusDefs = bonusDefsRaw.filter((def) => {
      if (seenBonusIds.has(def.id)) return false;
      seenBonusIds.add(def.id);
      return true;
    });
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
          } else if (
            when.type === "delay_minutes" &&
            typeof when.minutes === "number" &&
            when.minutes > 0
          ) {
            readyAt = new Date(
              armedAt.getTime() + when.minutes * 60_000,
            ).toISOString();
          } else if (
            when.type === "interval_minutes" &&
            typeof when.minutes === "number" &&
            when.minutes > 0
          ) {
            // First fire after N minutes from solve, then re-arm on complete.
            readyAt = new Date(
              armedAt.getTime() + when.minutes * 60_000,
            ).toISOString();
          } else if (
            when.type === "game_minutes" &&
            typeof when.minutes === "number" &&
            when.minutes > 0
          ) {
            const startMs = team.started_at
              ? new Date(team.started_at).getTime()
              : armedAt.getTime();
            readyAt = new Date(startMs + when.minutes * 60_000).toISOString();
            if (readyAt <= armedAt.toISOString()) {
              status = "ready";
            }
          } else if (
            when.type === "delay_meters" &&
            typeof when.meters === "number" &&
            when.meters > 0
          ) {
            // Stays armed until walk progress promotes it.
            readyAt = null;
          } else {
            // Unknown / empty delay params → treat as immediate so authored
            // bonuses never silently vanish.
            status = "ready";
            readyAt = armedAt.toISOString();
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
              description: def.description,
              hero_image_url: def.hero_image_url,
              question: def.question,
              options: def.options,
              correct_option_id: def.correct_option_id,
              correct_option_ids: def.correct_option_ids,
              reward: def.reward,
              answer_mode: def.answer_mode,
              answer: def.answer,
              number_fields: def.number_fields,
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
    // Do not require resolveBonusTask() — definitions + snapshot are enough.
    const soloBonus = Boolean(wantBonus && !immediateTeam && immediateSolo);

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
      activeBonus = {
        from_level: currentLevel,
        for_role: immediateTeam.for_role,
        for_team: true,
        started_at: armedAt.toISOString(),
        bonus_id: immediateTeam.bonus_id,
      };
    } else if (soloBonus && immediateSolo) {
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

    const mergedQueue = mergeBonusQueue(gameState.bonus_queue, bonusQueue);
    let bonusSessions = { ...(gameState.bonus_sessions ?? {}) };
    for (const item of mergedQueue) {
      if (item.status === "active") {
        bonusSessions = ensureBonusSession(bonusSessions, item.bonus_id);
      }
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      total_levels: content.levels.length,
      score: gameState.score + pointsEarned,
      current_phase: nextPhase,
      pending_next_level: pendingNext,
      quiz_reveal: null,
      level_reveal: null,
      active_bonus: activeBonus,
      bonus_queue: mergedQueue,
      bonus_sessions: bonusSessions,
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

/** Show the mission solution on every device without completing — team lead continues. */
export async function revealLevelSolution(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const currentLevel = team.current_level || 1;
    if (gameState.modal) {
      return { success: false, error: "Bitte zuerst die Synchronisations-Meldung schließen." };
    }
    if (gameState.level_reveal?.level === currentLevel) {
      return { success: true, data: buildRealtimeState(team, player) };
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
    if (!levelDefinition?.scoring?.allow_reveal_solution) {
      return { success: false, error: "Lösung anzeigen ist hier nicht erlaubt." };
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      level_reveal: {
        level: currentLevel,
        revealed_by: player.display_name,
        revealed_by_player_id: player.id,
        revealed_at: new Date().toISOString(),
      },
    };

    return persistPlayingGameState({
      teamId: team.id,
      player,
      gameState: nextGameState,
      expectedVersion: gameState.version,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lösung konnte nicht gezeigt werden.",
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

    if (!(await playerCanPaceTeam(team.id, player))) {
      return { success: false, error: "Nur die Team-Leitung kann weitergehen." };
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
    // Also recover if queue already has an active/ready team bonus but phase drifted.
    let queue = gameState.bonus_queue ?? [];
    const activeTeamBonus = queue.some(
      (item) => item.status === "active" && item.for_team,
    );
    const readyTeamBonus = queue.find(
      (item) => item.status === "ready" && item.for_team,
    );

    let nextPhase = activeTeamBonus || readyTeamBonus ? ("bonus" as const) : gameState.current_phase;
    let activeBonus = gameState.active_bonus ?? null;
    let pendingNext = gameState.pending_next_level ?? null;
    let teamCurrentLevel = team.current_level || 1;

    if (readyTeamBonus && !activeTeamBonus) {
      queue = markBonusActive(queue, readyTeamBonus.bonus_id);
      activeBonus = {
        from_level: readyTeamBonus.from_level,
        for_role: readyTeamBonus.for_role,
        for_team: true,
        started_at: new Date().toISOString(),
        bonus_id: readyTeamBonus.bonus_id,
      };
      nextPhase = "bonus";
      // Stay on the mission that armed this bonus until it is solved.
      teamCurrentLevel = readyTeamBonus.from_level;
      if (pendingNext == null) {
        const after = readyTeamBonus.from_level + 1;
        pendingNext = after <= content.levels.length ? after : null;
      }
    }

    if (
      !activeTeamBonus &&
      !readyTeamBonus &&
      gameState.current_phase === "level" &&
      !activeBonus &&
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

    let bonusSessions = { ...(gameState.bonus_sessions ?? {}) };
    for (const item of queue) {
      if (item.status === "active") {
        bonusSessions = ensureBonusSession(bonusSessions, item.bonus_id);
      }
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      modal: null,
      quiz_reveal: null,
      current_phase: nextPhase,
      active_bonus: activeBonus,
      pending_next_level: pendingNext,
      bonus_queue: queue,
      bonus_sessions: bonusSessions,
    };

    const supabase = createAdminClient();
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        current_level: teamCurrentLevel,
        game_state: nextGameState,
      })
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
  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from("teams")
    .select("game_state")
    .eq("id", teamId)
    .maybeSingle();
  if (
    current?.game_state &&
    parseTeamGameState(current.game_state).content_ready !== false
  ) {
    return;
  }

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
    content_ready: true,
    ...(startPhase ? { current_phase: startPhase } : {}),
  };

  await supabase
    .from("teams")
    .update({
      current_level: startLevel,
      game_state: gameStateWithStart,
    })
    .eq("id", teamId);

  await insertSyncEvent({
    teamId,
    eventType: "content_ready",
    actorPlayerId: actorPlayerId,
    payload: { current_level: startLevel },
  });
}

/**
 * Completes content compile if the team still has a lobby bootstrap stub.
 * Safe to call from every device; no-ops when already ready.
 */
export async function ensureTeamGameReady(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing" && team.status !== "finished") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    if (team.game_state && gameState.content_ready !== false) {
      return { success: true, data: buildRealtimeState(team, player) };
    }

    await initializeTeamGameState(
      team.id,
      player.id,
      event.id,
      event.organization_id,
      event.city_id,
      event.content_config,
      event.route_override,
      event.studio_game_version_id,
    );

    return getGameState(input);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

/**
 * Compile mission state while the team is still in the lobby.
 * Start then only flips status — no 10–30s stall after “Los”.
 */
export async function prepareTeamGame(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<{ ready: boolean }>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (
      team.status !== "lobby" &&
      team.status !== "setup" &&
      team.status !== "playing"
    ) {
      return { success: false, error: "Team ist nicht in der Lobby." };
    }

    if (team.game_state && parseTeamGameState(team.game_state).content_ready !== false) {
      return { success: true, data: { ready: true } };
    }

    await initializeTeamGameState(
      team.id,
      player.id,
      event.id,
      event.organization_id,
      event.city_id,
      event.content_config,
      event.route_override,
      event.studio_game_version_id,
    );

    return { success: true, data: { ready: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
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

function normalizePlayRole(
  role: string | null | undefined,
): "alpha" | "beta" | "gamma" {
  if (role === "captain" || role === "navigator" || role === "alpha") return "alpha";
  if (role === "beta") return "beta";
  return "gamma";
}

async function playerCanPaceTeam(
  teamId: string,
  player: { is_captain: boolean },
): Promise<boolean> {
  if (player.is_captain) return true;
  return (await countActivePlayers(teamId)) <= 1;
}

/** First-writer wins on bonus intro/reveal (JSON version must still match). */
async function persistPlayingGameState(input: {
  teamId: string;
  player: { id: string; is_captain: boolean };
  gameState: TeamGameState;
  expectedVersion: number;
  patch?: {
    current_level?: number;
    status?: string;
    finished_at?: string | null;
  };
}): Promise<ActionResult<TeamRealtimeState>> {
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { game_state: input.gameState };
  if (input.patch?.current_level != null) update.current_level = input.patch.current_level;
  if (input.patch?.status) update.status = input.patch.status;
  if (input.patch && "finished_at" in input.patch) {
    update.finished_at = input.patch.finished_at;
  }

  const { data, error } = await supabase
    .from("teams")
    .update(update)
    .eq("id", input.teamId)
    .eq("status", "playing")
    .filter("game_state->>version", "eq", String(input.expectedVersion))
    .select(
      "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
    )
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }
  if (data) {
    return { success: true, data: buildRealtimeState(data, input.player) };
  }

  const { data: latest } = await supabase
    .from("teams")
    .select(
      "id, status, current_level, game_state, started_at, lobby_auto_start_at, navigator_player_id",
    )
    .eq("id", input.teamId)
    .single();
  if (!latest) {
    return { success: false, error: "Team nicht gefunden." };
  }
  return { success: true, data: buildRealtimeState(latest, input.player) };
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
  /** Lead-device health radius bonus (capped). Same hub write as a normal arrive. */
  healthRadiusBonusMeters?: number;
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
          return {
            success: false,
            error:
              "Kein Standort empfangen. Oben im Browser auf „Zulassen“ tippen und die Seite einmal neu laden.",
          };
        }
        const healthTarget = withHealthRadiusBonus(
          levelDefinition.location,
          input.healthRadiusBonusMeters,
        );
        if (!isWithinGeofenceForPlay(input.geolocation, healthTarget)) {
          return {
            success: false,
            error: `Noch nicht am Wegpunkt (Radius: ${healthTarget.radius_meters} m).`,
          };
        }
      }
    }

    if (content.contentMode === "outdoor" && unlockMode === "distance") {
      const required = effectiveDistanceUnlockMeters(
        levelDefinition.triggers?.after_meters,
      );
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
      if (!input.stationCode?.trim()) {
        return {
          success: false,
          error: "Stationscode eingeben — der Code hängt an der Station im Raum.",
        };
      }
      const codeCheck = validateStationCode(levelDefinition, input.stationCode);
      if (!codeCheck.ok) return { success: false, error: codeCheck.error };
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
          health_radius_bonus_m: input.healthRadiusBonusMeters ?? 0,
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
    if (!(await playerCanPaceTeam(team.id, player))) {
      return { success: false, error: "Nur die Team-Leitung kann weitergehen." };
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

async function finishRevealedBonus(input: {
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
  bonusId?: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  const { event, team, player, gameState } = input;
  const sessions = gameState.bonus_sessions ?? {};
  const bonusId =
    input.bonusId ??
    Object.keys(sessions).find((id) => Boolean(sessions[id]?.reveal)) ??
    null;
  if (!bonusId) {
    return { success: false, error: "Bonus noch nicht beantwortet." };
  }
  const reveal = sessions[bonusId]?.reveal;
  if (!reveal) {
    // Lost the write race — another device already finished.
    if (!sessions[bonusId] && !(gameState.bonus_queue ?? []).some((item) => item.bonus_id === bonusId && item.status === "active")) {
      return { success: true, data: buildRealtimeState(team, player) };
    }
    return { success: false, error: "Bonus noch nicht beantwortet." };
  }

  const fromQueue = (gameState.bonus_queue ?? []).find((item) => item.bonus_id === bonusId);
  if (fromQueue && fromQueue.status !== "active") {
    return { success: true, data: buildRealtimeState(team, player) };
  }

  const overlay =
    gameState.active_bonus && bonusSessionId(gameState.active_bonus) === bonusId
      ? gameState.active_bonus
      : null;
  const active = fromQueue
    ? {
        from_level: fromQueue.from_level,
        for_role: fromQueue.for_role,
        for_team: fromQueue.for_team,
        started_at: fromQueue.armed_at,
        bonus_id: fromQueue.bonus_id,
      }
    : overlay;

  if (!active) {
    return { success: true, data: buildRealtimeState(team, player) };
  }

  const content = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });

  const allDoneLevels = Object.values(gameState.levels).every(
    (entry) => entry.status === "completed",
  );
  const now = new Date();
  let nextQueue = markBonusDone(gameState.bonus_queue ?? [], bonusId, now);
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

  const wasTeamPhase =
    Boolean(active.for_team) || gameState.current_phase === "bonus";
  let nextPhase = gameState.current_phase;
  let pendingNext = gameState.pending_next_level ?? null;
  let nextLevel = team.current_level || active.from_level;
  let levels = gameState.levels;
  let finished = false;

  if (wasTeamPhase && !nextActive) {
    const pending = gameState.pending_next_level;
    finished =
      pending === null ||
      pending === undefined ||
      pending > content.levels.length ||
      allDoneLevels;
    nextLevel = finished ? active.from_level : (pending ?? active.from_level + 1);
    const nextSlot = getLevelDefinition(content, nextLevel);
    nextPhase = finished
      ? gameState.current_phase
      : nextSlot && usesPhasedPlay(content)
        ? initialPhaseForSurface(
            content.contentMode,
            buildPlaySlot(nextSlot, content.contentMode),
            nextSlot,
          )
        : "hub";
    pendingNext = null;
    if (!finished) {
      levels = activateLevelEntry(levels, String(nextLevel));
    }
  }

  const nextGameState: TeamGameState = {
    ...gameState,
    version: gameState.version + 1,
    current_phase: nextPhase,
    pending_next_level: pendingNext,
    active_bonus: nextActive,
    bonus_queue: nextQueue,
    bonus_sessions: clearBonusSession(gameState.bonus_sessions, bonusId),
    bonus_notice: active.for_team
      ? null
      : {
          id: `bonus-${now.getTime()}-${reveal.answered_by_player_id.slice(0, 8)}`,
          by: reveal.answered_by,
          correct: reveal.correct,
          reward: reveal.reward,
          created_at: now.toISOString(),
          bonus_id: bonusId,
        },
    levels,
  };

  return persistPlayingGameState({
    teamId: team.id,
    player,
    gameState: nextGameState,
    expectedVersion: gameState.version,
    patch: {
      current_level: wasTeamPhase && !nextActive ? nextLevel : team.current_level ?? undefined,
      status: finished || allDoneLevels ? "finished" : "playing",
      finished_at: finished || allDoneLevels ? now.toISOString() : null,
    },
  });
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
  const claimUnassigned = (await countActivePlayers(team.id)) <= 1;

  const fromQueue = (gameState.bonus_queue ?? []).find(
    (item) =>
      item.status === "active" &&
      (item.for_team ||
        item.for_role === normalizedRole ||
        claimUnassigned),
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
  const bonus = resolveBonusForPlay(
    levelDefinition,
    active.bonus_id,
    fromQueue?.task_snapshot,
  );
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
  if (!canPresentBonus(bonus, playerRoleCheck, { claimUnassigned })) {
    return { success: false, error: "Diese Bonusaufgabe ist für eine andere Rolle." };
  }

  let correct = false;
  let reward = 0;
  if (!input.skip) {
    if (!input.selectedOptionId) {
      return { success: false, error: "Bitte eine Antwort auswählen." };
    }
    correct = isBonusAnswerCorrect(bonus, input.selectedOptionId);
    reward = correct ? bonus.reward : 0;
  }

  const bonusId = bonusSessionId(active);
  const existingReveal = gameState.bonus_sessions?.[bonusId]?.reveal ?? null;
  if (!input.skip) {
    if (existingReveal) {
      return { success: true, data: buildRealtimeState(team, player) };
    }

    const levelState = gameState.levels[String(active.from_level)];
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
      level: active.from_level,
      phase: "bonus",
      correct,
      selectedOptionId: input.selectedOptionId ?? null,
      error: correct ? null : "falsche_antwort",
      durationMs: durations.durationMs,
      elapsedMissionMs: durations.elapsedMissionMs,
      contentMode: content.contentMode,
      levelTitle: levelDefinition?.title ?? null,
    });

    const nowIso = new Date().toISOString();
    const nextRevealState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      score: gameState.score + reward,
      bonus_sessions: patchBonusSession(gameState.bonus_sessions, bonusId, {
        intro_done: true,
        solver_name: player.display_name,
        solver_player_id: player.id,
        reveal: {
          bonus_id: bonusId,
          answered_by: player.display_name,
          answered_by_player_id: player.id,
          correct,
          reward,
          selected_option_id: input.selectedOptionId ?? "",
          attempt_label: formatBonusAttemptLabel(bonus, input.selectedOptionId ?? ""),
          revealed_at: nowIso,
        },
      }),
    };

    return persistPlayingGameState({
      teamId: team.id,
      player,
      gameState: nextRevealState,
      expectedVersion: gameState.version,
    });
  }

  if (existingReveal) {
    return finishRevealedBonus({
      event,
      team,
      player,
      gameState,
      bonusId,
    });
  }

  const allDoneLevels = Object.values(gameState.levels).every(
    (entry) => entry.status === "completed",
  );
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

  // Team bonus locks current_phase to "bonus" — must advance after solve,
  // otherwise PlayPhaseFlow falls back to resolveBonusTask and shows it again.
  const wasTeamPhase =
    Boolean(active.for_team) || gameState.current_phase === "bonus";
  let nextPhase = gameState.current_phase;
  let pendingNext = gameState.pending_next_level ?? null;
  let nextLevel = team.current_level || active.from_level;
  let levels = gameState.levels;
  let finished = false;

  if (wasTeamPhase && !nextActive) {
    const pending = gameState.pending_next_level;
    finished =
      pending === null ||
      pending === undefined ||
      pending > content.levels.length ||
      allDoneLevels;
    nextLevel = finished ? active.from_level : (pending ?? active.from_level + 1);
    const nextSlot = getLevelDefinition(content, nextLevel);
    nextPhase = finished
      ? gameState.current_phase
      : nextSlot && usesPhasedPlay(content)
        ? initialPhaseForSurface(
            content.contentMode,
            buildPlaySlot(nextSlot, content.contentMode),
            nextSlot,
          )
        : "hub";
    pendingNext = null;
    if (!finished) {
      levels = activateLevelEntry(levels, String(nextLevel));
    }
  }

  const nextGameState: TeamGameState = {
    ...gameState,
    version: gameState.version + 1,
    score: gameState.score + reward,
    current_phase: nextPhase,
    pending_next_level: pendingNext,
    active_bonus: nextActive,
    bonus_queue: nextQueue,
    bonus_sessions: clearBonusSession(gameState.bonus_sessions, bonusId),
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
      current_level: wasTeamPhase && !nextActive ? nextLevel : team.current_level,
      game_state: nextGameState,
      status: finished || allDoneLevels ? "finished" : "playing",
      finished_at: finished || allDoneLevels ? new Date().toISOString() : null,
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

    let bonusSessions = { ...(gameState.bonus_sessions ?? {}) };
    for (const item of queue) {
      if (item.status === "active") {
        bonusSessions = ensureBonusSession(bonusSessions, item.bonus_id);
      }
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      bonus_queue: queue,
      active_bonus: activeBonus,
      bonus_sessions: bonusSessions,
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

  const bonusLevel = team.current_level || 1;
  const activeQueued = (gameState.bonus_queue ?? []).find(
    (item) => item.status === "active" && item.from_level === bonusLevel,
  );
  const bonusId =
    activeQueued?.bonus_id ??
    (gameState.active_bonus ? bonusSessionId(gameState.active_bonus) : `legacy-${bonusLevel}`);
  const existingReveal = gameState.bonus_sessions?.[bonusId]?.reveal ?? null;

  if (!input.skip) {
    return completeActiveBonus({
      event,
      team,
      player,
      gameState,
      selectedOptionId: input.selectedOptionId,
      skip: false,
    });
  }

  if (existingReveal) {
    return finishRevealedBonus({
      event,
      team,
      player,
      gameState,
      bonusId,
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
    current_phase: isFinished ? gameState.current_phase : hubPhase,
    pending_next_level: null,
    active_bonus: null,
    bonus_queue: queue,
    bonus_sessions: activeItem
      ? clearBonusSession(gameState.bonus_sessions, activeItem.bonus_id)
      : gameState.bonus_sessions,
    bonus_notice: null,
    levels,
  };

  return persistPlayingGameState({
    teamId: team.id,
    player,
    gameState: nextGameState,
    expectedVersion: gameState.version,
    patch: {
      current_level: nextLevel,
      status: isFinished ? "finished" : "playing",
      finished_at: isFinished ? now.toISOString() : null,
    },
  });
}

/** Submit Layer-3 bonus answer. First submit wins; result stays on every device until continue. */
export async function submitBonusAnswer(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  selectedOptionId: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const hasLiveBonus =
      Boolean(gameState.active_bonus) ||
      gameState.current_phase === "bonus" ||
      (gameState.bonus_queue ?? []).some((item) => item.status === "active");
    if (!hasLiveBonus) {
      return { success: false, error: "Keine Bonusphase aktiv." };
    }

    return completeActiveBonus({
      event,
      team,
      player,
      gameState,
      selectedOptionId: input.selectedOptionId,
      skip: false,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bonus fehlgeschlagen.",
    };
  }
}

/** One player taps start — the bonus task appears on every assigned device. */
export async function beginBonusPresentation(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  bonusId?: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }

    const gameState = parseTeamGameState(team.game_state);
    const claimUnassigned = (await countActivePlayers(team.id)) <= 1;
    const normalizedRole = normalizePlayRole(player.role);
    const fromQueue = (gameState.bonus_queue ?? []).find((item) => {
      if (item.status !== "active") return false;
      if (input.bonusId) return item.bonus_id === input.bonusId;
      return (
        item.for_team || item.for_role === normalizedRole || claimUnassigned
      );
    });
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

    const bonusId = fromQueue?.bonus_id ?? bonusSessionId(active);
    const existing = gameState.bonus_sessions?.[bonusId];
    if (existing?.intro_done || existing?.reveal) {
      return { success: true, data: buildRealtimeState(team, player) };
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
    const bonus = resolveBonusForPlay(
      levelDefinition,
      bonusId,
      fromQueue?.task_snapshot,
    );
    if (bonus && !canPresentBonus(bonus, player.role as PlayerRole, { claimUnassigned })) {
      return { success: false, error: "Diese Bonusaufgabe ist für eine andere Rolle." };
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      bonus_sessions: patchBonusSession(gameState.bonus_sessions, bonusId, {
        intro_done: true,
        solver_name: player.display_name,
        solver_player_id: player.id,
      }),
    };

    return persistPlayingGameState({
      teamId: team.id,
      player,
      gameState: nextGameState,
      expectedVersion: gameState.version,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bonus-Start fehlgeschlagen.",
    };
  }
}

/** After the shared reveal, advance the team (idempotent). */
export async function advanceBonusAfterReveal(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  bonusId?: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    if (team.status !== "playing") {
      return { success: false, error: "Das Spiel läuft noch nicht." };
    }
    const gameState = parseTeamGameState(team.game_state);
    const bonusId =
      input.bonusId ??
      Object.keys(gameState.bonus_sessions ?? {}).find(
        (id) => Boolean(gameState.bonus_sessions?.[id]?.reveal),
      ) ??
      null;
    const queued = bonusId
      ? (gameState.bonus_queue ?? []).find((item) => item.bonus_id === bonusId)
      : null;
    const isTeamBonus =
      Boolean(queued?.for_team) ||
      Boolean(gameState.active_bonus?.for_team) ||
      gameState.current_phase === "bonus";
    if (isTeamBonus && !(await playerCanPaceTeam(team.id, player))) {
      return { success: false, error: "Nur die Team-Leitung kann weitergehen." };
    }
    return finishRevealedBonus({
      event,
      team,
      player,
      gameState,
      bonusId: input.bonusId,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bonus konnte nicht beendet werden.",
    };
  }
}

/** Skip bonus (empty bonus). Revealed bonuses finish instead of skipping. */
export async function skipBonusPhase(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { event, team, player } = await assertPlayerSession(input);
    const gameState = parseTeamGameState(team.game_state);
    const revealedId = Object.keys(gameState.bonus_sessions ?? {}).find(
      (id) => Boolean(gameState.bonus_sessions?.[id]?.reveal),
    );
    if (revealedId) {
      return finishRevealedBonus({
        event,
        team,
        player,
        gameState,
        bonusId: revealedId,
      });
    }
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

/** Clear the ephemeral bonus toast so it does not reappear after phase changes. */
export async function dismissBonusNotice(input: {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
  noticeId?: string;
}): Promise<ActionResult<TeamRealtimeState>> {
  try {
    const { team, player } = await assertPlayerSession(input);
    const gameState = parseTeamGameState(team.game_state);
    if (!gameState.bonus_notice) {
      return { success: true, data: buildRealtimeState(team, player) };
    }
    if (input.noticeId && gameState.bonus_notice.id !== input.noticeId) {
      return { success: true, data: buildRealtimeState(team, player) };
    }

    const nextGameState: TeamGameState = {
      ...gameState,
      version: gameState.version + 1,
      bonus_notice: null,
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
      return {
        success: false,
        error: error?.message ?? "Hinweis konnte nicht geschlossen werden.",
      };
    }

    return { success: true, data: buildRealtimeState(updatedTeam, player) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Hinweis konnte nicht geschlossen werden.",
    };
  }
}
