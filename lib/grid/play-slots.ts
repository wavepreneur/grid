/**
 * Derive Hub → Quiz → Level → Bonus slots from flat LevelDefinition[].
 * @see docs/GRID_LAYER_MODEL.md § Player-Phasen
 */

import type { ContentMode } from "@/lib/cms/layer-model";
import type {
  ArrivalQuiz,
  LevelDefinition,
  PlaySlot,
  QuizOption,
} from "@/lib/grid/level-types";
import type { PlayPhase, PlaySurface } from "@/lib/grid/play-surface";
import { SURFACE_PRESENTATION } from "@/lib/grid/play-surface";
import { resolveBonusTask } from "@/lib/grid/bonus";

function asArrivalQuiz(level: LevelDefinition): ArrivalQuiz | undefined {
  if (level.arrival_quiz?.question && level.arrival_quiz.options?.length) {
    return level.arrival_quiz;
  }

  // Legacy: MC options + separate text answer/tiles → options are the unlock quiz
  const hasMission =
    Boolean(level.answer?.trim()) || Boolean(level.tiles && level.tiles.length > 0);
  if (
    hasMission &&
    level.options?.length &&
    level.correct_option_id &&
    (level.type === "quiz" || level.type === "gps" || level.type === "station" || level.type === "digital")
  ) {
    return {
      question: level.question ?? level.description,
      options: level.options,
      correct_option_id: level.correct_option_id,
    };
  }

  return undefined;
}

/** Mission payload for the level phase (tiles + free-text answer). */
export function missionFromLevel(level: LevelDefinition): LevelDefinition {
  const quiz = asArrivalQuiz(level);
  if (!quiz) return level;

  // Strip MC unlock fields from the mission phase when they double as arrival quiz
  if (level.arrival_quiz) return level;

  return {
    ...level,
    type: level.answer || level.tiles?.length ? "digital" : level.type,
    options: undefined,
    correct_option_id: undefined,
    correct_option_ids: undefined,
    question: level.question,
  };
}

export function resolveContentMode(input: {
  contentMode?: ContentMode | null;
  blueprintSlug?: "exitmania" | "tabbrain";
  gpsCapable?: boolean;
}): ContentMode {
  if (input.contentMode === "outdoor" || input.contentMode === "indoor" || input.contentMode === "online") {
    return input.contentMode;
  }
  if (input.blueprintSlug === "tabbrain" || input.gpsCapable === false) {
    return "online";
  }
  return "outdoor";
}

export function buildPlaySlot(
  level: LevelDefinition,
  surface: PlaySurface,
  phase: PlayPhase = "hub",
): PlaySlot {
  return {
    index: level.level,
    title: level.title,
    phase,
    hub: {
      surface,
      waypointName: level.title,
      location: level.location,
      station: level.station,
      teaser: level.teaser,
      roleSplit: level.role_split,
    },
    quiz: asArrivalQuiz(level),
    mission: missionFromLevel(level),
    bonusRole: resolveBonusTask(level)?.for_role ?? level.role_required ?? null,
  };
}

export function buildPlaySlots(
  levels: LevelDefinition[],
  surface: PlaySurface,
  currentPhase: PlayPhase = "hub",
  activeIndex?: number,
): PlaySlot[] {
  return levels.map((level) =>
    buildPlaySlot(
      level,
      surface,
      activeIndex === level.level ? currentPhase : "hub",
    ),
  );
}

export function hubMeta(surface: PlaySurface) {
  return SURFACE_PRESENTATION[surface];
}

export function quizOptionsForUi(quiz: ArrivalQuiz): QuizOption[] {
  return quiz.options;
}

/** Outdoor arrival gate: GPS pin, walk meters, or wait minutes. */
export function levelNeedsOutdoorArrivalHub(
  level: Pick<LevelDefinition, "location" | "triggers">,
): boolean {
  return Boolean(
    level.location ||
      (level.triggers?.type === "distance" &&
        typeof level.triggers.after_meters === "number" &&
        level.triggers.after_meters > 0) ||
      (level.triggers?.type === "time" &&
        typeof level.triggers.after_minutes === "number" &&
        level.triggers.after_minutes > 0),
  );
}

/**
 * Whether phased Hub→Quiz→Level→Bonus UI should run (vs. legacy single screen).
 * Outdoor always uses phased play — including „sofort“ missions without GPS —
 * so Layer-3 bonuses and arrival quizzes still work.
 */
export function usesPhasedPlay(input: {
  contentMode?: ContentMode;
  levels: LevelDefinition[];
}): boolean {
  if (input.contentMode === "indoor" || input.contentMode === "online") return true;
  if (input.contentMode === "outdoor") return true;
  if (input.levels.some((l) => l.station || l.arrival_quiz)) return true;
  if (
    input.levels.some(
      (l) =>
        Boolean(l.bonus) ||
        (l.bonuses?.length ?? 0) > 0 ||
        levelNeedsOutdoorArrivalHub(l),
    )
  ) {
    return true;
  }
  return false;
}

/**
 * First phase after opening a slot.
 * Outdoor without GPS/meter/time skips the map hub (Sofort-Freischaltung).
 */
export function initialPhaseForSurface(
  surface: PlaySurface,
  slot: PlaySlot,
  level?: Pick<LevelDefinition, "location" | "triggers"> | null,
): PlayPhase {
  if (surface === "online" && !slot.quiz) return "level";
  if (surface === "outdoor") {
    const needsHub = level
      ? levelNeedsOutdoorArrivalHub(level)
      : Boolean(slot.hub.location);
    if (!needsHub) {
      return slot.quiz ? "quiz" : "level";
    }
  }
  return "hub";
}
