import { createAdminClient } from "@/lib/supabase/admin";
import { loadMergedGameTaskLinksForGame, loadRecipeOriginGame } from "@/app/actions/cms/packs";
import { parseBonusBindings } from "@/lib/cms/bonus-bindings";
import { parseLinkLayer, type GameLinkOverrides } from "@/lib/cms/game-link-config";
import {
  compileGameLogic,
  parseLogicRules,
} from "@/lib/cms/logic-rules";
import {
  parseActiveLayers,
  parseRuntimeProfiles,
} from "@/lib/cms/layer-model";
import { DEFAULT_TASK_CONTENT, type StudioGame, type StudioGameTaskLink, type StudioTask } from "@/lib/cms/types";
import type { StudioVersionSnapshot } from "@/lib/cms/studio-snapshot";
import { parseStudioLanguage } from "@/lib/cms/languages";
import {
  localizedFeatureFlags,
  localizeStudioGameContent,
  recipeShellMedia,
  parseTranslations,
  withGeoQuizLocales,
} from "@/lib/cms/game-i18n";
import { buildGameSlots } from "@/lib/cms/game-slots";

function normalizeGameRow(row: StudioGame): StudioGame {
  return {
    ...row,
    language: parseStudioLanguage(row.language),
    translations: parseTranslations(row.translations),
    active_layers: parseActiveLayers(row.active_layers),
    runtime_profiles: parseRuntimeProfiles(row.runtime_profiles),
    logic_rules: row.logic_rules ?? [],
    layer1_pack_id: row.layer1_pack_id ?? null,
    layer2_pack_id: row.layer2_pack_id ?? null,
    layer3_pack_id: row.layer3_pack_id ?? null,
  };
}

function mapTaskRow(raw: Record<string, unknown>): StudioTask {
  return {
    ...(raw as StudioTask),
    content: { ...DEFAULT_TASK_CONTENT, ...((raw.content as StudioTask["content"]) ?? {}) },
    tags: (raw.tags as string[]) ?? [],
    layer: (raw.layer as StudioTask["layer"]) ?? 2,
    content_context: (raw.content_context as StudioTask["content_context"]) ?? "any",
    role_assignment: (raw.role_assignment as StudioTask["role_assignment"]) ?? "team",
  };
}

/**
 * Compile the current Studio editor state (not a frozen publish snapshot).
 * Used by Studio test sessions so „Testen“ always reflects saved changes.
 */
export async function loadLiveStudioGameSnapshot(
  gameId: string,
  locale?: string,
): Promise<StudioVersionSnapshot | null> {
  const supabase = createAdminClient();
  const { data: gameRow, error: gameError } = await supabase
    .from("studio_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) throw new Error(gameError.message);
  if (!gameRow) return null;

  const game = normalizeGameRow(gameRow as StudioGame);
  const origin = await loadRecipeOriginGame(supabase, game);
  const shell = recipeShellMedia(origin);

  const links = await loadMergedGameTaskLinksForGame(supabase, game);

  // Bonus bindings may reference pool tasks that were never linked as Layer 3.
  // Hydrate them so live „Testen“ / compile still emits for_team bonuses.
  const linkedTaskIds = new Set(links.map((l) => l.task_id));
  const orphanBonusIds = [
    ...new Set(
      links.flatMap((link) => {
        const bindings = parseBonusBindings(link.overrides as GameLinkOverrides);
        const legacy =
          typeof (link.overrides as { bonus_task_id?: unknown })?.bonus_task_id === "string"
            ? [(link.overrides as { bonus_task_id: string }).bonus_task_id.trim()]
            : [];
        return [...bindings.map((b) => b.task_id), ...legacy].filter(
          (id) => id && !linkedTaskIds.has(id),
        );
      }),
    ),
  ];
  if (orphanBonusIds.length > 0) {
    const { data: orphanRows, error: orphanError } = await supabase
      .from("studio_tasks")
      .select("*")
      .in("id", orphanBonusIds)
      .eq("is_active", true);
    if (orphanError) throw new Error(orphanError.message);

    let sortBase = links.filter((l) => parseLinkLayer(l) === 3).length;
    for (const row of orphanRows ?? []) {
      const task = mapTaskRow(row as Record<string, unknown>);
      links.push({
        id: `virtual-bonus-${task.id}`,
        game_id: gameId,
        task_id: task.id,
        layer: 3,
        sort_order: sortBase++,
        overrides: {},
        task,
      });
      linkedTaskIds.add(task.id);
    }
  }

  // Reload Einstiegsfragen from live pool tasks so removed hero images etc. apply immediately.
  const openerIds = [
    ...new Set(
      links.flatMap((link) => {
        const id = (link.overrides as { opener_task_id?: unknown })?.opener_task_id;
        return typeof id === "string" && id.trim() ? [id.trim()] : [];
      }),
    ),
  ];
  const openerTasksById: Record<
    string,
    Pick<StudioTask, "title" | "description" | "content">
  > = {};
  if (openerIds.length > 0) {
    const { data: openerRows, error: openerError } = await supabase
      .from("studio_tasks")
      .select("id, title, description, content")
      .in("id", openerIds);
    if (openerError) throw new Error(openerError.message);
    for (const row of openerRows ?? []) {
      const t = row as {
        id: string;
        title: string;
        description: string | null;
        content: StudioTask["content"];
      };
      openerTasksById[t.id] = {
        title: t.title,
        description: t.description ?? "",
        content: { ...DEFAULT_TASK_CONTENT, ...(t.content ?? {}) },
      };
    }
  }

  const rules = parseLogicRules(game.logic_rules);
  const compiled = compileGameLogic({ game, links, rules, openerTasksById });
  const language = parseStudioLanguage(locale ?? game.language);
  const localized = localizeStudioGameContent({
    game,
    levels: compiled.levels,
    slotLinks: buildGameSlots(links, { openerTasksById }).map((slot) => ({
      overrides: withGeoQuizLocales(slot.levelLink.overrides, slot.geoLink?.overrides),
    })),
    locale: language,
    origin,
  });

  return {
    game: {
      ...game,
      name: localized.name,
      description: localized.description,
      farewell_text: localized.farewell_text,
      logo_url: shell?.logo_url ?? game.logo_url,
      duration_minutes: shell?.duration_minutes ?? game.duration_minutes,
      feature_flags: localizedFeatureFlags(origin?.feature_flags ?? game.feature_flags, localized),
    },
    levels: localized.levels,
    compiledLogic: { ...compiled, levels: localized.levels },
  };
}
