import {
  clearQuizConfirmedFromTranslations,
  parseTranslations,
  stripLocaleQuizzesFromOverrides,
} from "@/lib/cms/game-i18n";
import { parseStudioLanguage } from "@/lib/cms/languages";
import { parseLinkOverrides } from "@/lib/cms/game-link-config";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type ResetCityShellOpenerLocalesResult = {
  games: number;
  packItems: number;
  gameLinks: number;
};

/**
 * Drop stale locale quiz overlays (e.g. München-EN) on city-shell Layer-1 openers
 * and clear quiz checkmarks so „Übersetzen“ uses the current German source.
 */
export async function resetCityShellOpenerLocales(
  supabase: Admin,
  input: { organizationId: string; recipeId?: string; gameId?: string },
): Promise<ResetCityShellOpenerLocalesResult> {
  let gamesQuery = supabase
    .from("studio_games")
    .select("id, name, city_slug, language, translations, layer1_pack_id, compose_recipe_id")
    .eq("organization_id", input.organizationId)
    .neq("is_template", true)
    .not("compose_recipe_id", "is", null);

  if (input.recipeId) gamesQuery = gamesQuery.eq("compose_recipe_id", input.recipeId);
  if (input.gameId) gamesQuery = gamesQuery.eq("id", input.gameId);

  const { data: games, error: gamesError } = await gamesQuery;
  if (gamesError) throw new Error(gamesError.message);
  if (!games?.length) return { games: 0, packItems: 0, gameLinks: 0 };

  // Never touch the recipe origin (First Profiler München). Prefer origin_game_id
  // when the column exists; always also exclude München by name/slug.
  const recipeIds = [
    ...new Set(
      games
        .map((game) => game.compose_recipe_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const originIds = new Set<string>();
  if (recipeIds.length > 0) {
    const { data: recipes, error: recipeError } = await supabase
      .from("studio_compose_recipes")
      .select("id, origin_game_id")
      .in("id", recipeIds);
    if (!recipeError) {
      for (const recipe of recipes ?? []) {
        if (typeof recipe.origin_game_id === "string") originIds.add(recipe.origin_game_id);
      }
    }
  }

  const shells = games.filter((game) => {
    if (originIds.has(game.id as string)) return false;
    if (isRecipeOriginGameName(game)) return false;
    return true;
  });
  const packIds = [
    ...new Set(
      shells
        .map((game) => game.layer1_pack_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const gameIds = shells.map((game) => game.id as string);

  let packItems = 0;
  let gameLinks = 0;
  const PAGE = 200;

  for (let offset = 0; offset < packIds.length; offset += PAGE) {
    const chunk = packIds.slice(offset, offset + PAGE);
    const { data: items, error } = await supabase
      .from("studio_layer_pack_items")
      .select("id, overrides")
      .in("pack_id", chunk);
    if (error) throw new Error(error.message);
    for (const item of items ?? []) {
      const raw =
        item.overrides && typeof item.overrides === "object" && !Array.isArray(item.overrides)
          ? { ...(item.overrides as Record<string, unknown>) }
          : {};
      const parsed = parseLinkOverrides(raw);
      const hasOpener =
        typeof parsed.opener_task_id === "string" || Boolean(parsed.arrival_quiz);
      if (!hasOpener) continue;
      const next = stripLocaleQuizzesFromOverrides(raw);
      if (next === raw) continue;
      const { error: updateError } = await supabase
        .from("studio_layer_pack_items")
        .update({ overrides: next, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (updateError) throw new Error(updateError.message);
      packItems += 1;
    }
  }

  for (let offset = 0; offset < gameIds.length; offset += PAGE) {
    const chunk = gameIds.slice(offset, offset + PAGE);
    const { data: links, error } = await supabase
      .from("studio_game_tasks")
      .select("id, overrides")
      .in("game_id", chunk);
    if (error) throw new Error(error.message);
    for (const link of links ?? []) {
      const raw =
        link.overrides && typeof link.overrides === "object" && !Array.isArray(link.overrides)
          ? { ...(link.overrides as Record<string, unknown>) }
          : {};
      const parsed = parseLinkOverrides(raw);
      const hasOpener =
        typeof parsed.opener_task_id === "string" || Boolean(parsed.arrival_quiz);
      if (!hasOpener) continue;
      const next = stripLocaleQuizzesFromOverrides(raw);
      if (next === raw) continue;
      const { error: updateError } = await supabase
        .from("studio_game_tasks")
        .update({ overrides: next })
        .eq("id", link.id);
      if (updateError) throw new Error(updateError.message);
      gameLinks += 1;
    }
  }

  for (const game of shells) {
    const source = parseStudioLanguage(game.language);
    const updated = clearQuizConfirmedFromTranslations(
      parseTranslations(game.translations),
      source,
    );
    if (!updated) continue;
    const { error } = await supabase
      .from("studio_games")
      .update({ translations: updated, updated_at: new Date().toISOString() })
      .eq("id", game.id);
    if (error) throw new Error(error.message);
  }

  return { games: shells.length, packItems, gameLinks };
}

/** Origin city for First Profiler — must keep its EN/FR opener locales. */
function isRecipeOriginGameName(game: {
  name?: unknown;
  city_slug?: unknown;
}): boolean {
  const name = typeof game.name === "string" ? game.name : "";
  const slug = typeof game.city_slug === "string" ? game.city_slug : "";
  return /münchen|muenchen|munich/i.test(name) || /^(muenchen|munich)$/i.test(slug);
}
