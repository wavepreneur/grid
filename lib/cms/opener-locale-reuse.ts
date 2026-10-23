/**
 * Reuse Einstiegsfrage locale copy by pool task id.
 * City shells (e.g. München) already store EN/FR quizzes on Layer-1 pack items.
 * New games that attach the same opener_task_id should inherit those locales
 * instead of re-running machine translation.
 */

import {
  localesFromOverrides,
  parseSlotLocale,
  withLinkLocale,
  type QuizLocaleCopy,
  type SlotLocaleCopy,
} from "@/lib/cms/game-i18n";
import { isStudioLanguage, type StudioLanguage } from "@/lib/cms/languages";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Per task id → language → quiz overlay. */
export type OpenerLocalesByTaskId = Map<string, Partial<Record<StudioLanguage, QuizLocaleCopy>>>;

export function quizLocaleHasCopy(quiz: QuizLocaleCopy | null | undefined): boolean {
  if (!quiz) return false;
  if (quiz.title?.trim()) return true;
  if (quiz.question?.trim()) return true;
  if (quiz.description?.trim()) return true;
  if (quiz.side_fact_title?.trim()) return true;
  if (quiz.side_fact?.trim()) return true;
  return Boolean(quiz.options?.some((option) => option.label?.trim()));
}

function quizRichness(quiz: QuizLocaleCopy): number {
  let n = 0;
  if (quiz.title?.trim()) n += 1;
  if (quiz.question?.trim()) n += 1;
  if (quiz.description?.trim()) n += 1;
  if (quiz.side_fact_title?.trim()) n += 1;
  if (quiz.side_fact?.trim()) n += 1;
  n += quiz.options?.filter((option) => option.label?.trim()).length ?? 0;
  return n;
}

/** Prefer the richer overlay when the same task appears on several city packs. */
export function preferRicherQuiz(
  current: QuizLocaleCopy | undefined,
  candidate: QuizLocaleCopy | undefined,
): QuizLocaleCopy | undefined {
  if (!quizLocaleHasCopy(candidate)) return current;
  if (!quizLocaleHasCopy(current)) return candidate;
  return quizRichness(candidate!) >= quizRichness(current!) ? candidate : current;
}

function ingestItemLocales(
  out: OpenerLocalesByTaskId,
  taskId: string,
  overrides: unknown,
) {
  if (!taskId) return;
  const locales = localesFromOverrides(overrides);
  let bucket = out.get(taskId);
  if (!bucket) {
    bucket = {};
    out.set(taskId, bucket);
  }
  for (const [lang, copy] of Object.entries(locales)) {
    if (!isStudioLanguage(lang)) continue;
    if (!quizLocaleHasCopy(copy.quiz)) continue;
    bucket[lang] = preferRicherQuiz(bucket[lang], copy.quiz);
  }
}

/**
 * Load opener quiz locales already authored for these pool task ids
 * (Layer-1 city packs and any other pack items that carry locales).
 */
export async function loadOpenerLocalesByTaskIds(
  supabase: Admin,
  organizationId: string,
  taskIds: string[],
): Promise<OpenerLocalesByTaskId> {
  const unique = [...new Set(taskIds.map((id) => id.trim()).filter(Boolean))];
  const out: OpenerLocalesByTaskId = new Map();
  if (unique.length === 0) return out;

  const { data: packs, error: packError } = await supabase
    .from("studio_layer_packs")
    .select("id")
    .eq("organization_id", organizationId);
  if (packError) throw new Error(packError.message);
  const packIds = (packs ?? []).map((row) => row.id as string).filter(Boolean);
  if (packIds.length === 0) return out;

  // Chunk .in() to stay under PostgREST URL limits.
  const PACK_CHUNK = 80;
  const TASK_CHUNK = 80;
  for (let p = 0; p < packIds.length; p += PACK_CHUNK) {
    const packChunk = packIds.slice(p, p + PACK_CHUNK);
    for (let t = 0; t < unique.length; t += TASK_CHUNK) {
      const taskChunk = unique.slice(t, t + TASK_CHUNK);
      const { data: items, error } = await supabase
        .from("studio_layer_pack_items")
        .select("task_id, overrides")
        .in("pack_id", packChunk)
        .in("task_id", taskChunk);
      if (error) throw new Error(error.message);
      for (const item of items ?? []) {
        ingestItemLocales(out, String(item.task_id ?? ""), item.overrides);
      }
    }
  }

  return out;
}

/** Merge shared opener quizzes into a slot's overrides.locales (all languages). */
export function withSharedOpenerLocales(
  overrides: Record<string, unknown>,
  shared: Partial<Record<StudioLanguage, QuizLocaleCopy>> | undefined,
  sourceLanguage: StudioLanguage,
): Record<string, unknown> {
  if (!shared) return overrides;
  let next = overrides;
  for (const [lang, quiz] of Object.entries(shared)) {
    if (!isStudioLanguage(lang) || lang === sourceLanguage) continue;
    if (!quizLocaleHasCopy(quiz)) continue;
    const existing = localesFromOverrides(next)[lang] ?? {};
    // Only fill empty quiz — never overwrite an author's newer overlay.
    if (quizLocaleHasCopy(existing.quiz)) continue;
    next = withLinkLocale(next, lang, { ...existing, quiz });
  }
  return next;
}

export function sharedQuizForLanguage(
  shared: OpenerLocalesByTaskId,
  taskId: string | null | undefined,
  language: StudioLanguage,
): QuizLocaleCopy | undefined {
  if (!taskId) return undefined;
  return shared.get(taskId)?.[language];
}

/** Parse quiz from a slot locale blob (tolerant). */
export function quizFromSlotLocale(raw: unknown): QuizLocaleCopy | undefined {
  const quiz = parseSlotLocale(raw).quiz;
  return quizLocaleHasCopy(quiz) ? quiz : undefined;
}

export function pickOpenerQuizLocale(input: {
  levelQuiz?: QuizLocaleCopy;
  geoQuiz?: QuizLocaleCopy;
  sharedQuiz?: QuizLocaleCopy;
}): QuizLocaleCopy | undefined {
  return (
    preferRicherQuiz(
      preferRicherQuiz(input.geoQuiz, input.levelQuiz),
      input.sharedQuiz,
    ) ?? undefined
  );
}

export type { SlotLocaleCopy };
