/**
 * Studio game slots — one stop = Quiz → Level → Bonus.
 * Plain language for non-technical authors; maps to layers 1/2/3 under the hood.
 */

import {
  parseLinkLayer,
  parseLinkOverrides,
  type GameLinkOverrides,
} from "@/lib/cms/game-link-config";
import { parseBonusBindings, type BonusBinding } from "@/lib/cms/bonus-bindings";
import type { ContentMode } from "@/lib/cms/layer-model";
import { LAYER_GAME_PRESETS, type LayerGamePreset } from "@/lib/cms/layer-model";
import type { StudioGameTaskLink, StudioTask, StudioTaskContent } from "@/lib/cms/types";
import type { ArrivalQuiz, BonusTask, QuizOption } from "@/lib/grid/level-types";
import { normalizeTaskContent } from "@/lib/cms/task-content";

export type StudioArrivalQuiz = {
  title?: string;
  image_url?: string;
  description?: string;
  question: string;
  options: Array<{ id: string; label: string; correct?: boolean }>;
  /** Single correct (classic). */
  correct_option_id?: string;
  /** Multi correct. */
  correct_option_ids?: string[];
  /** Bonus points for a correct opener answer. */
  points?: number;
  /** Side-fact after answer. */
  side_fact?: string;
};

export type GameSlot = {
  index: number;
  /** Mission / game level (Layer 2, or Layer 1 if no missions). */
  levelLink: StudioGameTaskLink;
  /** Opener quiz — from pool task snapshot or legacy override. */
  quiz: StudioArrivalQuiz | null;
  quizSource: "opener_task" | "override" | "geo_task" | "none";
  /** Pool task id when Einstiegsfrage is bound. */
  openerTaskId: string | null;
  geoLink: StudioGameTaskLink | null;
  /** @deprecated Prefer bonusBindings + bonusLinks */
  bonusLink: StudioGameTaskLink | null;
  /** All Layer-3 links bound to this mission. */
  bonusLinks: StudioGameTaskLink[];
  bonusBindings: BonusBinding[];
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
      return "Outdoor";
    case "indoor":
      return "Indoor";
    case "online":
      return "Online";
  }
}

export function surfaceTaglineDe(surface: ContentMode): string {
  switch (surface) {
    case "outdoor":
      return "GPS · unterwegs";
    case "indoor":
      return "Codes · vor Ort";
    case "online":
      return "Cross-Device · remote";
  }
}

export function surfaceDescriptionDe(surface: ContentMode): string {
  switch (surface) {
    case "outdoor":
      return "GPS-Spiel draußen: Aufgaben starten an festen Wegpunkten oder nachdem das Team eine bestimmte Distanz gelaufen ist.";
    case "indoor":
      return "Im Raum: An Stationen hängen 4-stellige Codes. Wer den Code findet und eingibt, aktiviert die Aufgabe — ohne GPS.";
    case "online":
      return "Gemeinsam an PC, Tablet und Smartphone, ohne Laufen. Die UI zeigt, wer im Team ist und wer was eingegeben hat.";
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

  if (normalized.hero_image_url?.trim()) {
    quiz.image_url = normalized.hero_image_url.trim();
  }
  const sideParts = [normalized.success_title?.trim(), normalized.success_info?.trim()].filter(
    Boolean,
  );
  if (sideParts.length > 0) {
    quiz.side_fact = sideParts.join(" — ");
  }

  if (normalized.answer_type === "multi_choice") {
    const ids = normalized.options.filter((o) => o.correct).map((o) => o.id);
    if (ids.length === 0) return null;
    quiz.correct_option_ids = ids;
    quiz.correct_option_id = ids[0];
  } else {
    const match =
      normalized.options.find((o) => o.correct) ??
      normalized.options.find((o) => o.label === normalized.answer);
    if (!match) return null;
    quiz.correct_option_id = match.id;
  }

  return quiz;
}

/** Build rich opener quiz from a pool task (choice / multi_choice). */
export function taskToOpenerArrivalQuiz(
  task: Pick<StudioTask, "title" | "description" | "content">,
  pointsOverride?: number | null,
): StudioArrivalQuiz | null {
  const quiz = contentToArrivalQuiz(task.content);
  if (!quiz) return null;

  quiz.title = task.title.trim() || undefined;
  const desc = task.description?.trim();
  if (desc) quiz.description = desc;

  const scoringPoints = normalizeTaskContent(task.content).scoring?.points;
  const points =
    typeof pointsOverride === "number"
      ? Math.max(0, Math.round(pointsOverride))
      : typeof scoringPoints === "number"
        ? Math.max(0, Math.round(scoringPoints))
        : 0;
  quiz.points = points;

  return quiz;
}

export function isQuizPoolTask(task: Pick<StudioTask, "content">): boolean {
  const type = normalizeTaskContent(task.content).answer_type;
  return type === "choice" || type === "multi_choice";
}

export function parseArrivalQuizOverride(raw: unknown): StudioArrivalQuiz | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as StudioArrivalQuiz;
  if (typeof q.question !== "string" || !Array.isArray(q.options) || q.options.length === 0) {
    return null;
  }
  return {
    title: typeof q.title === "string" ? q.title : undefined,
    image_url: typeof q.image_url === "string" ? q.image_url : undefined,
    description: typeof q.description === "string" ? q.description : undefined,
    question: q.question,
    options: q.options,
    correct_option_id: q.correct_option_id,
    correct_option_ids: q.correct_option_ids,
    points: typeof q.points === "number" ? Math.max(0, q.points) : undefined,
    side_fact: typeof q.side_fact === "string" ? q.side_fact : undefined,
  };
}

export function arrivalQuizToRuntime(quiz: StudioArrivalQuiz): ArrivalQuiz | null {
  const options: QuizOption[] = quiz.options.map((o) => ({ id: o.id, label: o.label }));
  const points =
    typeof quiz.points === "number" && quiz.points > 0 ? Math.round(quiz.points) : undefined;
  const rich = {
    ...(quiz.title?.trim() ? { title: quiz.title.trim() } : {}),
    ...(quiz.image_url?.trim() ? { image_url: quiz.image_url.trim() } : {}),
    ...(quiz.description?.trim() ? { description: quiz.description.trim() } : {}),
    ...(quiz.side_fact?.trim() ? { side_fact: quiz.side_fact.trim() } : {}),
    ...(points !== undefined ? { points } : {}),
  };

  if (quiz.correct_option_ids?.length) {
    return {
      question: quiz.question,
      options,
      correct_option_id: quiz.correct_option_ids[0]!,
      correct_option_ids: quiz.correct_option_ids,
      ...rich,
    };
  }
  if (quiz.correct_option_id) {
    return {
      question: quiz.question,
      options,
      correct_option_id: quiz.correct_option_id,
      ...rich,
    };
  }
  const correct = quiz.options.find((o) => o.correct);
  if (!correct) return null;
  return {
    question: quiz.question,
    options,
    correct_option_id: correct.id,
    ...rich,
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
export function buildGameSlots(
  links: StudioGameTaskLink[],
  options?: {
    /**
     * Live opener pool tasks keyed by task id.
     * When set, Einstiegsfragen are rebuilt from current content (not a stale
     * overrides.arrival_quiz snapshot that can still hold a removed hero image).
     */
    openerTasksById?: Record<
      string,
      Pick<StudioGameTaskLink["task"], "title" | "description" | "content">
    >;
  },
): GameSlot[] {
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

  const openerTasksById = options?.openerTasksById ?? {};

  return levelLinks.map((levelLink, index) => {
    const overrides = parseLinkOverrides(levelLink.overrides);
    const fromOverride = parseArrivalQuizOverride(overrides.arrival_quiz);
    const openerTaskId =
      typeof overrides.opener_task_id === "string" && overrides.opener_task_id
        ? overrides.opener_task_id
        : null;

    const geoLink =
      missions.length > 0
        ? (geos[index] ??
          (overrides.geo_task_id
            ? (geos.find((g) => g.task_id === overrides.geo_task_id) ?? null)
            : null))
        : null;

    let quiz: StudioArrivalQuiz | null = null;
    let quizSource: GameSlot["quizSource"] = "none";

    // Prefer live opener pool content over frozen arrival_quiz snapshot.
    if (openerTaskId && openerTasksById[openerTaskId]) {
      const live = taskToOpenerArrivalQuiz(
        openerTasksById[openerTaskId]!,
        typeof overrides.opener_points === "number" ? overrides.opener_points : null,
      );
      if (live) {
        quiz = live;
        quizSource = "opener_task";
      }
    }

    if (!quiz && fromOverride) {
      quiz = fromOverride;
      quizSource = openerTaskId ? "opener_task" : "override";
    }

    if (!quiz && geoLink) {
      quiz = contentToArrivalQuiz(geoLink.task.content);
      if (quiz) quizSource = "geo_task";
    }

    const bindings = parseBonusBindings(overrides);
    const bonusLinks: StudioGameTaskLink[] = [];

    for (const binding of bindings) {
      const found =
        bonuses.find((b) => b.task_id === binding.task_id || b.id === binding.task_id) ??
        // Content may already be linked under another layer — still attach for compile.
        geos.concat(missions).find((b) => b.task_id === binding.task_id || b.id === binding.task_id) ??
        null;
      if (found) bonusLinks.push(found);
    }

    // Legacy fallbacks when no bindings yet
    if (bonusLinks.length === 0) {
      const bonusTaskId = overrides.bonus_task_id;
      let bonusLink =
        (bonusTaskId
          ? bonuses.find((b) => b.task_id === bonusTaskId || b.id === bonusTaskId)
          : null) ?? null;

      if (!bonusLink) {
        bonusLink =
          bonuses.find((b) => {
            const t = parseLinkOverrides(b.overrides).trigger;
            return t?.type === "after_task_solved" && t.source_task_id === levelLink.task_id;
          }) ?? null;
      }

      if (!bonusLink && bonuses[index] && !bonusTaskId) {
        const candidate = bonuses[index]!;
        const t = parseLinkOverrides(candidate.overrides).trigger;
        if (!t || t.type === "game_start" || t.source_task_id === levelLink.task_id) {
          bonusLink = candidate;
        }
      }

      if (bonusLink) {
        bonusLinks.push(bonusLink);
      }
    }

    const resolvedBindings =
      bindings.length > 0
        ? bindings
        : bonusLinks.map((link) => {
            const bo = parseLinkOverrides(link.overrides);
            const role = bo.role ?? "gamma";
            return {
              task_id: link.task_id,
              role:
                role === "alpha" || role === "beta" || role === "gamma" || role === "team"
                  ? role
                  : ("gamma" as const),
              when: { type: "immediate" as const },
            };
          });

    return {
      index: index + 1,
      levelLink,
      quiz,
      quizSource,
      openerTaskId,
      geoLink,
      bonusLink: bonusLinks[0] ?? null,
      bonusLinks,
      bonusBindings: resolvedBindings,
    };
  });
}

export function slotPhaseSummary(slot: GameSlot): string {
  const bonusCount = slot.bonusBindings.length || (slot.bonusLink ? 1 : 0);
  const parts = [
    slot.quiz ? "Quiz" : "Quiz fehlt",
    "Level",
    bonusCount > 1 ? `${bonusCount} Boni` : bonusCount === 1 ? "Bonus" : "ohne Bonus",
  ];
  return parts.join(" → ");
}

export type { GameLinkOverrides };
