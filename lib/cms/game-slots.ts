/**
 * Studio game slots — one stop = Quiz → Level → Bonus.
 * Plain language for non-technical authors; maps to layers 1/2/3 under the hood.
 */

import {
  parseLinkLayer,
  parseLinkOverrides,
  type GameLinkOverrides,
} from "@/lib/cms/game-link-config";
import type { ContentMode } from "@/lib/cms/layer-model";
import { LAYER_GAME_PRESETS, type LayerGamePreset } from "@/lib/cms/layer-model";
import type { StudioGameTaskLink, StudioTaskContent } from "@/lib/cms/types";
import type { ArrivalQuiz, BonusTask, QuizOption } from "@/lib/grid/level-types";
import { normalizeTaskContent } from "@/lib/cms/task-content";

export type StudioArrivalQuiz = {
  question: string;
  options: Array<{ id: string; label: string; correct?: boolean }>;
  /** Single correct (classic). */
  correct_option_id?: string;
  /** Multi correct. */
  correct_option_ids?: string[];
};

export type GameSlot = {
  index: number;
  /** Mission / game level (Layer 2, or Layer 1 if no missions). */
  levelLink: StudioGameTaskLink;
  /** Opener quiz — from overrides or linked geo task. */
  quiz: StudioArrivalQuiz | null;
  quizSource: "override" | "geo_task" | "none";
  geoLink: StudioGameTaskLink | null;
  bonusLink: StudioGameTaskLink | null;
};

export function surfaceToPreset(surface: ContentMode): LayerGamePreset {
  if (surface === "indoor") {
    return LAYER_GAME_PRESETS.find((p) => p.id === "indoor_escape") ?? LAYER_GAME_PRESETS[0]!;
  }
  if (surface === "online") {
    return LAYER_GAME_PRESETS.find((p) => p.id === "mission") ?? LAYER_GAME_PRESETS[0]!;
  }
  return LAYER_GAME_PRESETS.find((p) => p.id === "full") ?? LAYER_GAME_PRESETS[0]!;
}

export function surfaceLabelDe(surface: ContentMode): string {
  switch (surface) {
    case "outdoor":
      return "Outdoor (GPS-Karte)";
    case "indoor":
      return "Indoor (Stationen)";
    case "online":
      return "Online (Tabbrain)";
  }
}

export function surfaceDescriptionDe(surface: ContentMode): string {
  switch (surface) {
    case "outdoor":
      return "Spieler laufen draußen zur Karte. Quiz öffnet das Level, danach zurück zur Karte.";
    case "indoor":
      return "Spieler laufen im Gebäude zu Stationen mit Codes. Kein GPS nötig.";
    case "online":
      return "Jeder spielt am eigenen Gerät. Missionen der Reihe nach — ideal für Tabbrain.";
  }
}

function contentToArrivalQuiz(content: StudioTaskContent): StudioArrivalQuiz | null {
  const normalized = normalizeTaskContent(content);
  if (normalized.answer_type !== "choice" && normalized.answer_type !== "multi_choice") {
    return null;
  }
  if (!normalized.options?.length) return null;
  const question = (normalized.question ?? "").trim();
  if (!question) return null;

  const quiz: StudioArrivalQuiz = {
    question,
    options: normalized.options.map((o) => ({
      id: o.id,
      label: o.label,
      correct: Boolean(o.correct),
    })),
  };

  if (normalized.answer_type === "multi_choice") {
    const ids = normalized.options.filter((o) => o.correct).map((o) => o.id);
    if (ids.length === 0) return null;
    quiz.correct_option_ids = ids;
  } else {
    const match =
      normalized.options.find((o) => o.correct) ??
      normalized.options.find((o) => o.label === normalized.answer);
    if (!match) return null;
    quiz.correct_option_id = match.id;
  }

  return quiz;
}

export function parseArrivalQuizOverride(raw: unknown): StudioArrivalQuiz | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as StudioArrivalQuiz;
  if (typeof q.question !== "string" || !Array.isArray(q.options) || q.options.length === 0) {
    return null;
  }
  return {
    question: q.question,
    options: q.options,
    correct_option_id: q.correct_option_id,
    correct_option_ids: q.correct_option_ids,
  };
}

export function arrivalQuizToRuntime(quiz: StudioArrivalQuiz): ArrivalQuiz | null {
  const options: QuizOption[] = quiz.options.map((o) => ({ id: o.id, label: o.label }));
  if (quiz.correct_option_ids?.length) {
    return {
      question: quiz.question,
      options,
      correct_option_id: quiz.correct_option_ids[0]!,
      correct_option_ids: quiz.correct_option_ids,
    };
  }
  if (quiz.correct_option_id) {
    return {
      question: quiz.question,
      options,
      correct_option_id: quiz.correct_option_id,
    };
  }
  const correct = quiz.options.find((o) => o.correct);
  if (!correct) return null;
  return {
    question: quiz.question,
    options,
    correct_option_id: correct.id,
  };
}

export function taskContentToBonus(
  task: StudioGameTaskLink["task"],
  forRole: "alpha" | "beta" | "gamma" | "team" = "gamma",
): BonusTask | null {
  const content = normalizeTaskContent(task.content);
  if (content.answer_type !== "choice" && content.answer_type !== "multi_choice") return null;
  if (!content.options?.length) return null;
  const question = (content.question ?? task.description ?? "").trim();
  if (!question) return null;

  const correctIds = content.options.filter((o) => o.correct).map((o) => o.id);
  const correctId =
    correctIds[0] ??
    content.options.find((o) => o.label === content.answer)?.id ??
    content.options[0]?.id;
  if (!correctId) return null;

  const role =
    forRole === "team"
      ? "gamma"
      : forRole === "alpha" || forRole === "beta" || forRole === "gamma"
        ? forRole
        : "gamma";

  return {
    for_role: role,
    title: task.title.startsWith("Bonus") ? task.title : `Bonus: ${task.title}`,
    intro:
      forRole === "team"
        ? "Diese Bonusaufgabe sehen alle im Team."
        : `Nur ${role === "alpha" ? "Alpha" : role === "beta" ? "Beta" : "Gamma"} sieht diese Aufgabe.`,
    question,
    options: content.options.map((o) => ({ id: o.id, label: o.label })),
    correct_option_id: correctId,
    correct_option_ids: correctIds.length > 1 ? correctIds : undefined,
    reward: content.scoring?.points && content.scoring.points > 0 ? content.scoring.points : 150,
    for_team: forRole === "team",
  };
}

/** Build author-facing slots from game task links. */
export function buildGameSlots(links: StudioGameTaskLink[]): GameSlot[] {
  const geos: StudioGameTaskLink[] = [];
  const missions: StudioGameTaskLink[] = [];
  const bonuses: StudioGameTaskLink[] = [];

  for (const link of links) {
    const layer = parseLinkLayer(link);
    if (layer === 1) geos.push(link);
    else if (layer === 2) missions.push(link);
    else bonuses.push(link);
  }

  geos.sort((a, b) => a.sort_order - b.sort_order);
  missions.sort((a, b) => a.sort_order - b.sort_order);
  bonuses.sort((a, b) => a.sort_order - b.sort_order);

  const levelLinks = missions.length > 0 ? missions : geos;
  if (levelLinks.length === 0) return [];

  return levelLinks.map((levelLink, index) => {
    const overrides = parseLinkOverrides(levelLink.overrides);
    const fromOverride = parseArrivalQuizOverride(overrides.arrival_quiz);
    const geoLink =
      missions.length > 0
        ? (geos[index] ??
          (overrides.geo_task_id
            ? (geos.find((g) => g.task_id === overrides.geo_task_id) ?? null)
            : null))
        : null;

    let quiz: StudioArrivalQuiz | null = fromOverride;
    let quizSource: GameSlot["quizSource"] = fromOverride ? "override" : "none";

    if (!quiz && geoLink) {
      quiz = contentToArrivalQuiz(geoLink.task.content);
      if (quiz) quizSource = "geo_task";
    }

    if (!quiz && missions.length === 0) {
      // Level itself is geo/quiz-only slot — opener can be inline override only
      quiz = fromOverride;
    }

    const bonusTaskId = overrides.bonus_task_id;
    let bonusLink =
      (bonusTaskId
        ? bonuses.find((b) => b.task_id === bonusTaskId || b.id === bonusTaskId)
        : null) ?? null;

    if (!bonusLink) {
      // Bonus with trigger after this mission
      bonusLink =
        bonuses.find((b) => {
          const t = parseLinkOverrides(b.overrides).trigger;
          return t?.type === "after_task_solved" && t.source_task_id === levelLink.task_id;
        }) ?? null;
    }

    // Fallback: bonus by same index
    if (!bonusLink && bonuses[index] && !bonusTaskId) {
      const candidate = bonuses[index]!;
      const t = parseLinkOverrides(candidate.overrides).trigger;
      if (!t || t.type === "game_start" || t.source_task_id === levelLink.task_id) {
        bonusLink = candidate;
      }
    }

    return {
      index: index + 1,
      levelLink,
      quiz,
      quizSource,
      geoLink,
      bonusLink,
    };
  });
}

export function slotPhaseSummary(slot: GameSlot): string {
  const parts = [
    slot.quiz ? "Quiz" : "Quiz fehlt",
    "Level",
    slot.bonusLink ? "Bonus" : "ohne Bonus",
  ];
  return parts.join(" → ");
}

export type { GameLinkOverrides };
