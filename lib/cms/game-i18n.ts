import {
  isStudioLanguage,
  LAUNCH_LOCALES,
  parseStudioLanguage,
  type StudioLanguage,
} from "@/lib/cms/languages";
import type { GameLinkOverrides } from "@/lib/cms/game-link-config";
import { normalizeTaskContent } from "@/lib/cms/task-content";
import type { StudioGame, StudioTaskContent } from "@/lib/cms/types";
import { withGameHelpLinks } from "@/lib/grid/game-help-links";
import type {
  ArrivalQuiz,
  BonusDefinition,
  LevelContentTile,
  LevelDefinition,
  LevelHint,
  QuizOption,
} from "@/lib/grid/level-types";

export type TranslationCoverage = {
  confirmed: number;
  total: number;
};

export type TranslationUnit = {
  key: string;
  source: string;
};

export type GameLocaleCopy = {
  name?: string;
  description?: string;
  farewell_text?: string;
  briefing_iframe_url?: string;
  faq_iframe_url?: string;
  /** Field keys the author marked as done for this locale. */
  confirmed?: string[];
  /** Cached list progress, including slot fields. */
  coverage?: TranslationCoverage;
};

export type TileLocaleCopy = {
  id: string;
  label?: string;
  url?: string;
  hint_text?: string;
};

export type QuizLocaleCopy = {
  title?: string;
  description?: string;
  question?: string;
  side_fact?: string;
  options?: Array<{ id: string; label: string }>;
};

export type BonusLocaleCopy = {
  title?: string;
  description?: string;
  question?: string;
  success_info?: string;
  options?: Array<{ id: string; label: string }>;
  tiles?: TileLocaleCopy[];
};

export type SlotLocaleCopy = {
  title?: string;
  description?: string;
  question?: string;
  success_title?: string;
  success_info?: string;
  options?: Array<{ id: string; label: string }>;
  tiles?: TileLocaleCopy[];
  hints?: Array<{ id: string; text?: string }>;
  quiz?: QuizLocaleCopy;
  station?: { name?: string; place?: string };
  bonuses?: Record<string, BonusLocaleCopy>;
};

export type GameTranslations = Record<string, GameLocaleCopy>;

export function parseConfirmed(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
}

export function parseCoverage(value: unknown): TranslationCoverage | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const confirmed = Number(row.confirmed);
  const total = Number(row.total);
  if (!Number.isFinite(confirmed) || !Number.isFinite(total) || total < 0) return undefined;
  return {
    confirmed: Math.max(0, Math.round(confirmed)),
    total: Math.max(0, Math.round(total)),
  };
}

export function parseTranslations(value: unknown): GameTranslations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: GameTranslations = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    next[key] = {
      name: typeof row.name === "string" ? row.name : undefined,
      description: typeof row.description === "string" ? row.description : undefined,
      farewell_text: typeof row.farewell_text === "string" ? row.farewell_text : undefined,
      briefing_iframe_url:
        typeof row.briefing_iframe_url === "string" ? row.briefing_iframe_url : undefined,
      faq_iframe_url: typeof row.faq_iframe_url === "string" ? row.faq_iframe_url : undefined,
      confirmed: parseConfirmed(row.confirmed),
      coverage: parseCoverage(row.coverage),
    };
  }
  return next;
}

function parseOptions(value: unknown): Array<{ id: string; label: string }> | undefined {
  if (!Array.isArray(value)) return undefined;
  const options = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const option = item as { id?: unknown; label?: unknown };
    if (typeof option.id !== "string" || typeof option.label !== "string") return [];
    return [{ id: option.id, label: option.label }];
  });
  return options.length > 0 ? options : undefined;
}

function parseTiles(value: unknown): TileLocaleCopy[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tiles = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string") return [];
    return [
      {
        id: row.id,
        label: typeof row.label === "string" ? row.label : undefined,
        url: typeof row.url === "string" ? row.url : undefined,
        hint_text: typeof row.hint_text === "string" ? row.hint_text : undefined,
      },
    ];
  });
  return tiles.length > 0 ? tiles : undefined;
}

function parseBonusLocales(value: unknown): Record<string, BonusLocaleCopy> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const next: Record<string, BonusLocaleCopy> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    next[key] = {
      title: typeof row.title === "string" ? row.title : undefined,
      description: typeof row.description === "string" ? row.description : undefined,
      question: typeof row.question === "string" ? row.question : undefined,
      success_info: typeof row.success_info === "string" ? row.success_info : undefined,
      options: parseOptions(row.options),
      tiles: parseTiles(row.tiles),
    };
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function parseSlotLocale(value: unknown): SlotLocaleCopy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  const quizRaw = row.quiz && typeof row.quiz === "object" ? (row.quiz as Record<string, unknown>) : null;
  const stationRaw =
    row.station && typeof row.station === "object" ? (row.station as Record<string, unknown>) : null;
  const hints = Array.isArray(row.hints)
    ? row.hints.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const hint = item as { id?: unknown; text?: unknown };
        if (typeof hint.id !== "string") return [];
        return [{ id: hint.id, text: typeof hint.text === "string" ? hint.text : undefined }];
      })
    : undefined;
  return {
    title: typeof row.title === "string" ? row.title : undefined,
    description: typeof row.description === "string" ? row.description : undefined,
    question: typeof row.question === "string" ? row.question : undefined,
    success_title: typeof row.success_title === "string" ? row.success_title : undefined,
    success_info: typeof row.success_info === "string" ? row.success_info : undefined,
    options: parseOptions(row.options),
    tiles: parseTiles(row.tiles),
    hints: hints?.length ? hints : undefined,
    quiz: quizRaw
      ? {
          title: typeof quizRaw.title === "string" ? quizRaw.title : undefined,
          description: typeof quizRaw.description === "string" ? quizRaw.description : undefined,
          question: typeof quizRaw.question === "string" ? quizRaw.question : undefined,
          side_fact: typeof quizRaw.side_fact === "string" ? quizRaw.side_fact : undefined,
          options: parseOptions(quizRaw.options),
        }
      : undefined,
    station: stationRaw
      ? {
          name: typeof stationRaw.name === "string" ? stationRaw.name : undefined,
          place: typeof stationRaw.place === "string" ? stationRaw.place : undefined,
        }
      : undefined,
    bonuses: parseBonusLocales(row.bonuses),
  };
}

export function localesFromOverrides(overrides: unknown): Record<string, SlotLocaleCopy> {
  const raw = (overrides as GameLinkOverrides & { locales?: unknown })?.locales;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next: Record<string, SlotLocaleCopy> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    next[key] = parseSlotLocale(value);
  }
  return next;
}

export function withLinkLocale(
  overrides: Record<string, unknown>,
  locale: string,
  copy: SlotLocaleCopy,
): Record<string, unknown> {
  const locales = { ...localesFromOverrides(overrides), [locale]: copy };
  return { ...overrides, locales };
}

export function gameLocales(game: Pick<StudioGame, "language" | "translations">): StudioLanguage[] {
  const source = parseStudioLanguage(game.language);
  const extras = Object.keys(parseTranslations(game.translations)).filter(isReadyLocaleKey);
  return [...new Set([source, ...extras])] as StudioLanguage[];
}

export function localeCoverageMap(
  game: Pick<StudioGame, "language" | "translations">,
): Partial<Record<StudioLanguage, TranslationCoverage>> {
  const map: Partial<Record<StudioLanguage, TranslationCoverage>> = {};
  for (const locale of gameLocales(game)) {
    if (locale === parseStudioLanguage(game.language)) continue;
    map[locale] = localeCoverage(game, locale);
  }
  return map;
}

function isReadyLocaleKey(key: string): key is StudioLanguage {
  return isStudioLanguage(key);
}

export function coveragePercent(coverage: TranslationCoverage): number {
  if (coverage.total <= 0) return 100;
  return Math.min(100, Math.round((coverage.confirmed / coverage.total) * 100));
}

export function remainingPercent(coverage: TranslationCoverage): number {
  return Math.max(0, 100 - coveragePercent(coverage));
}

export function localeCoverage(
  game: Pick<StudioGame, "language" | "translations">,
  locale: string,
): TranslationCoverage {
  const source = parseStudioLanguage(game.language);
  if (locale === source) return { confirmed: 1, total: 1 };
  const copy = parseTranslations(game.translations)[locale];
  if (!copy) return { confirmed: 0, total: 1 };
  if (copy.coverage) return copy.coverage;
  return { confirmed: 0, total: 1 };
}

export function isLocaleComplete(
  game: Pick<StudioGame, "language" | "translations">,
  locale: string,
): boolean {
  const coverage = localeCoverage(game, locale);
  return coverage.total === 0 || coverage.confirmed >= coverage.total;
}

export function missingLaunchLocales(
  game: Pick<StudioGame, "language" | "translations">,
): StudioLanguage[] {
  const source = parseStudioLanguage(game.language);
  return LAUNCH_LOCALES.filter((locale) => locale !== source && !isLocaleComplete(game, locale));
}

export function hasLaunchCoverage(game: Pick<StudioGame, "language" | "translations">): boolean {
  return missingLaunchLocales(game).length === 0;
}

export function coverageForConfirmed(
  units: TranslationUnit[],
  confirmed: Iterable<string>,
): TranslationCoverage {
  const valid = new Set(units.map((unit) => unit.key));
  let count = 0;
  for (const key of confirmed) {
    if (valid.has(key)) count += 1;
  }
  return { confirmed: count, total: units.length };
}

function considerDifferent(
  keys: string[],
  key: string,
  source: unknown,
  current: unknown,
) {
  if (typeof source !== "string" || !source.trim()) return;
  if (typeof current !== "string") return;
  const next = current.trim();
  if (next && next !== source.trim()) keys.push(key);
}

function inferredSlotKeys(linkId: string, source: SlotLocaleCopy, current: SlotLocaleCopy): string[] {
  const prefix = `slot:${linkId}`;
  const keys: string[] = [];
  considerDifferent(keys, `${prefix}:title`, source.title, current.title);
  considerDifferent(keys, `${prefix}:description`, source.description, current.description);
  considerDifferent(keys, `${prefix}:question`, source.question, current.question);
  considerDifferent(keys, `${prefix}:success_title`, source.success_title, current.success_title);
  considerDifferent(keys, `${prefix}:success_info`, source.success_info, current.success_info);
  const currentOptions = new Map((current.options ?? []).map((option) => [option.id, option.label]));
  for (const option of source.options ?? []) {
    considerDifferent(keys, `${prefix}:option:${option.id}`, option.label, currentOptions.get(option.id));
  }
  const currentTiles = new Map((current.tiles ?? []).map((tile) => [tile.id, tile]));
  for (const tile of source.tiles ?? []) {
    const row = currentTiles.get(tile.id);
    considerDifferent(keys, `${prefix}:tile:${tile.id}:label`, tile.label, row?.label);
    considerDifferent(keys, `${prefix}:tile:${tile.id}:url`, tile.url, row?.url);
    considerDifferent(keys, `${prefix}:tile:${tile.id}:hint`, tile.hint_text, row?.hint_text);
  }
  const currentHints = new Map((current.hints ?? []).map((hint) => [hint.id, hint.text]));
  for (const hint of source.hints ?? []) {
    considerDifferent(keys, `${prefix}:hint:${hint.id}`, hint.text, currentHints.get(hint.id));
  }
  if (source.quiz) {
    considerDifferent(keys, `${prefix}:quiz:title`, source.quiz.title, current.quiz?.title);
    considerDifferent(keys, `${prefix}:quiz:description`, source.quiz.description, current.quiz?.description);
    considerDifferent(keys, `${prefix}:quiz:question`, source.quiz.question, current.quiz?.question);
    considerDifferent(keys, `${prefix}:quiz:side_fact`, source.quiz.side_fact, current.quiz?.side_fact);
    const quizOptions = new Map((current.quiz?.options ?? []).map((option) => [option.id, option.label]));
    for (const option of source.quiz.options ?? []) {
      considerDifferent(keys, `${prefix}:quiz:option:${option.id}`, option.label, quizOptions.get(option.id));
    }
  }
  if (source.station) {
    considerDifferent(keys, `${prefix}:station:name`, source.station.name, current.station?.name);
    considerDifferent(keys, `${prefix}:station:place`, source.station.place, current.station?.place);
  }
  for (const [taskId, bonus] of Object.entries(source.bonuses ?? {})) {
    const bonusPrefix = `${prefix}:bonus:${taskId}`;
    const row = current.bonuses?.[taskId];
    considerDifferent(keys, `${bonusPrefix}:title`, bonus.title, row?.title);
    considerDifferent(keys, `${bonusPrefix}:description`, bonus.description, row?.description);
    considerDifferent(keys, `${bonusPrefix}:question`, bonus.question, row?.question);
    considerDifferent(keys, `${bonusPrefix}:success_info`, bonus.success_info, row?.success_info);
    const bonusOptions = new Map((row?.options ?? []).map((option) => [option.id, option.label]));
    for (const option of bonus.options ?? []) {
      considerDifferent(keys, `${bonusPrefix}:option:${option.id}`, option.label, bonusOptions.get(option.id));
    }
    const bonusTiles = new Map((row?.tiles ?? []).map((tile) => [tile.id, tile]));
    for (const tile of bonus.tiles ?? []) {
      const tileRow = bonusTiles.get(tile.id);
      considerDifferent(keys, `${bonusPrefix}:tile:${tile.id}:label`, tile.label, tileRow?.label);
      considerDifferent(keys, `${bonusPrefix}:tile:${tile.id}:url`, tile.url, tileRow?.url);
      considerDifferent(keys, `${bonusPrefix}:tile:${tile.id}:hint`, tile.hint_text, tileRow?.hint_text);
    }
  }
  return keys;
}

/** Locale values that already differ from source count as confirmed, even before a checkmark. */
export function inferredConfirmedKeys(input: {
  sourceGame: GameLocaleCopy;
  currentGame: GameLocaleCopy;
  slots: Array<{ linkId: string; source: SlotLocaleCopy; current: SlotLocaleCopy }>;
}): string[] {
  const keys: string[] = [];
  considerDifferent(keys, "game:name", input.sourceGame.name, input.currentGame.name);
  considerDifferent(keys, "game:description", input.sourceGame.description, input.currentGame.description);
  considerDifferent(
    keys,
    "game:farewell_text",
    input.sourceGame.farewell_text,
    input.currentGame.farewell_text,
  );
  considerDifferent(
    keys,
    "game:briefing_iframe_url",
    input.sourceGame.briefing_iframe_url,
    input.currentGame.briefing_iframe_url,
  );
  considerDifferent(
    keys,
    "game:faq_iframe_url",
    input.sourceGame.faq_iframe_url,
    input.currentGame.faq_iframe_url,
  );
  for (const slot of input.slots) {
    keys.push(...inferredSlotKeys(slot.linkId, slot.source, slot.current));
  }
  return parseConfirmed(keys);
}

function helpUrlFromFlags(featureFlags: unknown, key: "briefing_iframe_url" | "faq_iframe_url"): string {
  if (!featureFlags || typeof featureFlags !== "object") return "";
  const value = (featureFlags as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function resolveGameCopy(
  game: Pick<
    StudioGame,
    "language" | "name" | "description" | "farewell_text" | "translations" | "feature_flags"
  >,
  locale: string,
): {
  name: string;
  description: string;
  farewell_text: string;
  briefing_iframe_url: string;
  faq_iframe_url: string;
} {
  const source = parseStudioLanguage(game.language);
  const sourceHelp = {
    briefing_iframe_url: helpUrlFromFlags(game.feature_flags, "briefing_iframe_url"),
    faq_iframe_url: helpUrlFromFlags(game.feature_flags, "faq_iframe_url"),
  };
  if (locale === source) {
    return {
      name: game.name,
      description: game.description ?? "",
      farewell_text: game.farewell_text ?? "",
      ...sourceHelp,
    };
  }
  const copy = parseTranslations(game.translations)[locale] ?? {};
  return {
    name: copy.name?.trim() || game.name,
    description: copy.description ?? game.description ?? "",
    farewell_text: copy.farewell_text ?? game.farewell_text ?? "",
    briefing_iframe_url: copy.briefing_iframe_url?.trim() || sourceHelp.briefing_iframe_url,
    faq_iframe_url: copy.faq_iframe_url?.trim() || sourceHelp.faq_iframe_url,
  };
}

export function localizedFeatureFlags(
  featureFlags: Record<string, unknown> | null | undefined,
  copy: Pick<GameLocaleCopy, "briefing_iframe_url" | "faq_iframe_url">,
): Record<string, unknown> {
  return withGameHelpLinks(featureFlags, {
    briefingIframeUrl: copy.briefing_iframe_url ?? null,
    faqIframeUrl: copy.faq_iframe_url ?? null,
  });
}

function applyOptionLabels(
  options: QuizOption[] | undefined,
  labels: Array<{ id: string; label: string }> | undefined,
): QuizOption[] | undefined {
  if (!options?.length || !labels?.length) return options;
  const byId = new Map(labels.map((item) => [item.id, item.label]));
  return options.map((option) => ({
    ...option,
    label: byId.get(option.id)?.trim() || option.label,
  }));
}

function applyQuizLocale(quiz: ArrivalQuiz | undefined, copy: SlotLocaleCopy["quiz"]): ArrivalQuiz | undefined {
  if (!quiz || !copy) return quiz;
  return {
    ...quiz,
    title: copy.title?.trim() || quiz.title,
    description: copy.description ?? quiz.description,
    question: copy.question?.trim() || quiz.question,
    side_fact: copy.side_fact ?? quiz.side_fact,
    options: applyOptionLabels(quiz.options, copy.options) ?? quiz.options,
  };
}

function applyTiles(
  tiles: LevelContentTile[] | undefined,
  copy: TileLocaleCopy[] | undefined,
): LevelContentTile[] | undefined {
  if (!tiles?.length) return tiles;
  const byId = new Map((copy ?? []).map((tile) => [tile.id, tile]));
  return tiles.map((tile) => {
    const patch = byId.get(tile.id);
    if (!patch) return tile;
    return {
      ...tile,
      label: patch.label?.trim() || tile.label,
      url: patch.url?.trim() || tile.url,
      hint:
        patch.hint_text !== undefined
          ? {
              text: patch.hint_text.trim() || tile.hint?.text || "",
              point_cost: tile.hint?.point_cost,
            }
          : tile.hint,
    };
  });
}

function applyHints(
  hints: LevelHint[] | undefined,
  copy: Array<{ id: string; text?: string }> | undefined,
): LevelHint[] | undefined {
  if (!hints?.length) return hints;
  const byId = new Map((copy ?? []).map((hint) => [hint.id, hint]));
  return hints.map((hint) => ({
    ...hint,
    text: byId.get(hint.id)?.text?.trim() || hint.text,
  }));
}

function bonusTaskId(bonus: Pick<BonusDefinition, "id">): string {
  return bonus.id.replace(/^\d+-/, "");
}

function applyBonusLocale(bonus: BonusDefinition, copy: BonusLocaleCopy | undefined): BonusDefinition {
  if (!copy) return bonus;
  return {
    ...bonus,
    title: copy.title?.trim() || bonus.title,
    description: copy.description ?? bonus.description,
    question: copy.question?.trim() || bonus.question,
    success_info: copy.success_info ?? bonus.success_info,
    options: applyOptionLabels(bonus.options, copy.options) ?? bonus.options,
    tiles: applyTiles(bonus.tiles, copy.tiles),
  };
}

export function applySlotLocale(level: LevelDefinition, copy: SlotLocaleCopy | undefined): LevelDefinition {
  if (!copy) return level;
  const bonuses = localizeBonuses(level.bonuses, copy.bonuses);
  return {
    ...level,
    title: copy.title?.trim() || level.title,
    description: copy.description?.trim() || level.description,
    question: copy.question?.trim() || level.question,
    success_title: copy.success_title ?? level.success_title,
    success_info: copy.success_info ?? level.success_info,
    options: applyOptionLabels(level.options, copy.options),
    tiles: applyTiles(level.tiles, copy.tiles),
    hints: applyHints(level.hints, copy.hints),
    arrival_quiz: applyQuizLocale(level.arrival_quiz, copy.quiz),
    station: level.station
      ? {
          ...level.station,
          name: copy.station?.name?.trim() || level.station.name,
          place: copy.station?.place ?? level.station.place,
        }
      : level.station,
    bonuses,
    bonus: bonuses?.[0] ?? level.bonus,
  };
}

function localizeBonuses(
  bonuses: BonusDefinition[] | undefined,
  copy: Record<string, BonusLocaleCopy> | undefined,
): BonusDefinition[] | undefined {
  if (!bonuses?.length) return bonuses;
  return bonuses.map((bonus) =>
    applyBonusLocale(bonus, copy?.[bonusTaskId(bonus)] ?? copy?.[bonus.id]),
  );
}

export function localizeLevels(
  levels: LevelDefinition[],
  links: Array<{ overrides?: unknown }>,
  locale: string,
  sourceLocale: string,
): LevelDefinition[] {
  if (locale === sourceLocale) return levels;
  return levels.map((level) => {
    const link = links[level.level - 1];
    const copy = localesFromOverrides(link?.overrides)[locale];
    return applySlotLocale(level, copy);
  });
}

export function seedLocaleCopy(
  game: Pick<StudioGame, "name" | "description" | "farewell_text" | "feature_flags">,
): GameLocaleCopy {
  return {
    name: game.name,
    description: game.description ?? "",
    farewell_text: game.farewell_text ?? "",
    briefing_iframe_url: helpUrlFromFlags(game.feature_flags, "briefing_iframe_url"),
    faq_iframe_url: helpUrlFromFlags(game.feature_flags, "faq_iframe_url"),
  };
}

function seedTilesFromContent(content: unknown): TileLocaleCopy[] | undefined {
  const normalized = normalizeTaskContent(content);
  const raw =
    content && typeof content === "object"
      ? ((content as { tiles?: unknown }).tiles ?? normalized.tiles)
      : normalized.tiles;
  const source = Array.isArray(raw) && raw.length > 0 ? raw : normalized.tiles ?? [];
  const tiles = source.flatMap((tile, index) => {
    if (!tile || typeof tile !== "object") return [];
    const row = tile as Record<string, unknown>;
    const url =
      (typeof row.media_url === "string" ? row.media_url : "") ||
      (typeof row.url === "string" ? row.url : "");
    const id = typeof row.id === "string" && row.id.trim() ? row.id : `tile-${index}`;
    return [
      {
        id,
        label: typeof row.label === "string" ? row.label : "",
        url,
        hint_text: typeof row.hint_text === "string" ? row.hint_text : "",
      },
    ];
  });
  return tiles.length > 0 ? tiles : undefined;
}

function seedBonusFromTask(task: {
  title: string;
  description?: string | null;
  content?: unknown;
}): BonusLocaleCopy {
  const content = normalizeTaskContent(task.content);
  return {
    title: task.title,
    description: task.description ?? "",
    question: content.question ?? "",
    success_info: content.success_info ?? "",
    options: content.options?.map((option) => ({ id: option.id, label: option.label })),
    tiles: seedTilesFromContent(content),
  };
}

export function seedSlotCopyFromStudio(input: {
  title: string;
  description?: string | null;
  content?: unknown;
  overrides?: unknown;
  quiz?: QuizLocaleCopy | null;
  bonuses?: Array<{ taskId: string; title: string; description?: string | null; content?: unknown }>;
}): SlotLocaleCopy {
  const content = normalizeTaskContent(input.content);
  const station = (input.overrides as { station?: { name?: string; place?: string } } | null)?.station;
  return {
    title: input.title,
    description: input.description ?? "",
    question: content.question ?? "",
    success_title: content.success_title ?? "",
    success_info: content.success_info ?? "",
    options: content.options?.map((option) => ({ id: option.id, label: option.label })),
    tiles: seedTilesFromContent(content),
    quiz: input.quiz ?? undefined,
    station: station ? { name: station.name ?? "", place: station.place ?? "" } : undefined,
    bonuses: input.bonuses?.length
      ? Object.fromEntries(
          input.bonuses.map((bonus) => [bonus.taskId, seedBonusFromTask(bonus)]),
        )
      : undefined,
  };
}

function addTranslationUnit(units: TranslationUnit[], key: string, source: unknown) {
  if (typeof source !== "string") return;
  const text = source.trim();
  if (!text) return;
  units.push({ key, source: text });
}

export function collectGameTranslationUnits(
  game: Pick<StudioGame, "name" | "description" | "farewell_text" | "feature_flags">,
): TranslationUnit[] {
  const units: TranslationUnit[] = [];
  addTranslationUnit(units, "game:name", game.name);
  addTranslationUnit(units, "game:description", game.description);
  addTranslationUnit(units, "game:farewell_text", game.farewell_text);
  addTranslationUnit(units, "game:briefing_iframe_url", helpUrlFromFlags(game.feature_flags, "briefing_iframe_url"));
  addTranslationUnit(units, "game:faq_iframe_url", helpUrlFromFlags(game.feature_flags, "faq_iframe_url"));
  return units;
}

function collectSlotTranslationUnits(linkId: string, source: SlotLocaleCopy): TranslationUnit[] {
  const prefix = `slot:${linkId}`;
  const units: TranslationUnit[] = [];
  addTranslationUnit(units, `${prefix}:title`, source.title);
  addTranslationUnit(units, `${prefix}:description`, source.description);
  addTranslationUnit(units, `${prefix}:question`, source.question);
  addTranslationUnit(units, `${prefix}:success_title`, source.success_title);
  addTranslationUnit(units, `${prefix}:success_info`, source.success_info);
  for (const option of source.options ?? []) {
    addTranslationUnit(units, `${prefix}:option:${option.id}`, option.label);
  }
  for (const tile of source.tiles ?? []) {
    addTranslationUnit(units, `${prefix}:tile:${tile.id}:label`, tile.label);
    addTranslationUnit(units, `${prefix}:tile:${tile.id}:url`, tile.url);
    addTranslationUnit(units, `${prefix}:tile:${tile.id}:hint`, tile.hint_text);
  }
  for (const hint of source.hints ?? []) {
    addTranslationUnit(units, `${prefix}:hint:${hint.id}`, hint.text);
  }
  if (source.quiz) {
    addTranslationUnit(units, `${prefix}:quiz:title`, source.quiz.title);
    addTranslationUnit(units, `${prefix}:quiz:description`, source.quiz.description);
    addTranslationUnit(units, `${prefix}:quiz:question`, source.quiz.question);
    addTranslationUnit(units, `${prefix}:quiz:side_fact`, source.quiz.side_fact);
    for (const option of source.quiz.options ?? []) {
      addTranslationUnit(units, `${prefix}:quiz:option:${option.id}`, option.label);
    }
  }
  if (source.station) {
    addTranslationUnit(units, `${prefix}:station:name`, source.station.name);
    addTranslationUnit(units, `${prefix}:station:place`, source.station.place);
  }
  for (const [taskId, bonus] of Object.entries(source.bonuses ?? {})) {
    const bonusPrefix = `${prefix}:bonus:${taskId}`;
    addTranslationUnit(units, `${bonusPrefix}:title`, bonus.title);
    addTranslationUnit(units, `${bonusPrefix}:description`, bonus.description);
    addTranslationUnit(units, `${bonusPrefix}:question`, bonus.question);
    addTranslationUnit(units, `${bonusPrefix}:success_info`, bonus.success_info);
    for (const option of bonus.options ?? []) {
      addTranslationUnit(units, `${bonusPrefix}:option:${option.id}`, option.label);
    }
    for (const tile of bonus.tiles ?? []) {
      addTranslationUnit(units, `${bonusPrefix}:tile:${tile.id}:label`, tile.label);
      addTranslationUnit(units, `${bonusPrefix}:tile:${tile.id}:url`, tile.url);
      addTranslationUnit(units, `${bonusPrefix}:tile:${tile.id}:hint`, tile.hint_text);
    }
  }
  return units;
}

export function collectTranslationUnits(input: {
  game: Pick<StudioGame, "name" | "description" | "farewell_text" | "feature_flags">;
  slots: Array<{ linkId: string; source: SlotLocaleCopy }>;
}): TranslationUnit[] {
  return [
    ...collectGameTranslationUnits(input.game),
    ...input.slots.flatMap((slot) => collectSlotTranslationUnits(slot.linkId, slot.source)),
  ];
}

export function localeCopyWithCoverage(
  current: GameLocaleCopy | undefined,
  next: GameLocaleCopy,
  units: TranslationUnit[],
): GameLocaleCopy {
  const confirmed = parseConfirmed(next.confirmed ?? current?.confirmed);
  const coverage = coverageForConfirmed(units, confirmed);
  return {
    ...current,
    name: next.name,
    description: next.description,
    farewell_text: next.farewell_text,
    briefing_iframe_url: next.briefing_iframe_url,
    faq_iframe_url: next.faq_iframe_url,
    confirmed: confirmed.filter((key) => units.some((unit) => unit.key === key)),
    coverage,
  };
}

export function mergeSlotCopy(source: SlotLocaleCopy, existing: SlotLocaleCopy): SlotLocaleCopy {
  const tilesById = new Map((existing.tiles ?? []).map((tile) => [tile.id, tile]));
  const bonusKeys = new Set([
    ...Object.keys(source.bonuses ?? {}),
    ...Object.keys(existing.bonuses ?? {}),
  ]);
  return {
    title: existing.title ?? source.title,
    description: existing.description ?? source.description,
    question: existing.question ?? source.question,
    success_title: existing.success_title ?? source.success_title,
    success_info: existing.success_info ?? source.success_info,
    options: existing.options ?? source.options,
    tiles: source.tiles?.map((tile) => ({ ...tile, ...tilesById.get(tile.id) })),
    hints: existing.hints ?? source.hints,
    quiz: existing.quiz || source.quiz
      ? { ...source.quiz, ...existing.quiz, options: existing.quiz?.options ?? source.quiz?.options }
      : undefined,
    station: existing.station ?? source.station,
    bonuses: bonusKeys.size
      ? Object.fromEntries(
          [...bonusKeys].map((key) => [
            key,
            { ...(source.bonuses?.[key] ?? {}), ...(existing.bonuses?.[key] ?? {}) },
          ]),
        )
      : undefined,
  };
}

export function seedSlotCopyFromLevel(level: LevelDefinition): SlotLocaleCopy {
  return {
    title: level.title,
    description: level.description,
    question: level.question,
    success_title: level.success_title,
    success_info: level.success_info,
    options: level.options?.map((option) => ({ id: option.id, label: option.label })),
    tiles: level.tiles?.map((tile) => ({
      id: tile.id,
      label: tile.label ?? "",
      url: tile.url,
      hint_text: tile.hint?.text ?? "",
    })),
    hints: level.hints?.map((hint) => ({ id: hint.id, text: hint.text })),
    quiz: level.arrival_quiz
      ? {
          title: level.arrival_quiz.title,
          description: level.arrival_quiz.description,
          question: level.arrival_quiz.question,
          side_fact: level.arrival_quiz.side_fact,
          options: level.arrival_quiz.options?.map((option) => ({
            id: option.id,
            label: option.label,
          })),
        }
      : undefined,
    station: level.station
      ? { name: level.station.name, place: level.station.place }
      : undefined,
    bonuses: level.bonuses
      ? Object.fromEntries(
          level.bonuses.map((bonus) => [
            bonusTaskId(bonus),
            {
              title: bonus.title,
              description: bonus.description ?? "",
              question: bonus.question,
              success_info: bonus.success_info ?? "",
              options: bonus.options?.map((option) => ({ id: option.id, label: option.label })),
              tiles: bonus.tiles?.map((tile) => ({
                id: tile.id,
                label: tile.label ?? "",
                url: tile.url,
                hint_text: tile.hint?.text ?? "",
              })),
            },
          ]),
        )
      : undefined,
  };
}

export type LocalizedStudioContent = {
  name: string;
  description: string;
  farewell_text: string;
  briefing_iframe_url: string;
  faq_iframe_url: string;
  levels: LevelDefinition[];
};

export function localizeStudioGameContent(input: {
  game: Pick<
    StudioGame,
    "language" | "name" | "description" | "farewell_text" | "translations" | "feature_flags"
  >;
  levels: LevelDefinition[];
  slotLinks: Array<{ overrides?: unknown }>;
  locale: string;
}): LocalizedStudioContent {
  const source = parseStudioLanguage(input.game.language);
  const copy = resolveGameCopy(input.game, input.locale);
  return {
    ...copy,
    levels: localizeLevels(input.levels, input.slotLinks, input.locale, source),
  };
}

export function parseSnapshotLocales(value: unknown): Record<string, LocalizedStudioContent> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, LocalizedStudioContent> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const levels = Array.isArray(row.levels) ? (row.levels as LevelDefinition[]) : [];
    if (levels.length === 0) continue;
    next[key] = {
      name: typeof row.name === "string" ? row.name : "",
      description: typeof row.description === "string" ? row.description : "",
      farewell_text: typeof row.farewell_text === "string" ? row.farewell_text : "",
      briefing_iframe_url: typeof row.briefing_iframe_url === "string" ? row.briefing_iframe_url : "",
      faq_iframe_url: typeof row.faq_iframe_url === "string" ? row.faq_iframe_url : "",
      levels,
    };
  }
  return next;
}

export function buildSnapshotLocales(input: {
  game: Pick<
    StudioGame,
    "language" | "name" | "description" | "farewell_text" | "translations" | "feature_flags"
  >;
  levels: LevelDefinition[];
  slotLinks: Array<{ overrides?: unknown }>;
}): Record<string, LocalizedStudioContent> {
  const locales: Record<string, LocalizedStudioContent> = {};
  for (const locale of gameLocales(input.game)) {
    locales[locale] = localizeStudioGameContent({
      game: input.game,
      levels: input.levels,
      slotLinks: input.slotLinks,
      locale,
    });
  }
  return locales;
}

export function pickLocalizedSnapshot(input: {
  locales: unknown;
  game: Pick<
    StudioGame,
    "language" | "name" | "description" | "farewell_text" | "translations" | "feature_flags"
  >;
  levels: LevelDefinition[];
  slotLinks?: Array<{ overrides?: unknown }>;
  locale: string;
}): LocalizedStudioContent {
  const frozen = parseSnapshotLocales(input.locales)[input.locale];
  if (frozen) return frozen;
  return localizeStudioGameContent({
    game: input.game,
    levels: input.levels,
    slotLinks: input.slotLinks ?? [],
    locale: input.locale,
  });
}
