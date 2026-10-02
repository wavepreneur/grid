"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  DEFAULT_TASK_CONTENT,
  type StudioGame,
  type StudioGameTaskLink,
  type StudioTask,
  type UpdateGameInput,
} from "@/lib/cms/types";
import { isStudioLanguage, localeLabel, parseStudioLanguage, type StudioLanguage } from "@/lib/cms/languages";
import {
  applyTranslationUnits,
  buildSnapshotLocales,
  collectCityShellTranslationUnits,
  collectTranslationUnits,
  isMachineTranslatableUnit,
  localeCopyWithCoverage,
  localesFromOverrides,
  parseConfirmed,
  parseTranslations,
  resolveSharedGameCopy,
  seedLocaleCopy,
  seedSlotCopyFromStudio,
  isLocaleComplete,
  type GameLocaleCopy,
  type SlotLocaleCopy,
  withGeoQuizLocales,
  withLinkLocale,
} from "@/lib/cms/game-i18n";
import { translateUnitsNative } from "@/lib/cms/gemini-translate";
import { generateGameSlug } from "@/lib/grid/codes";
import {
  DEFAULT_RUNTIME_PROFILES,
  buildLayerSnapshotMeta,
  parseActiveLayers,
  parseRuntimeProfiles,
  type StudioLayer,
} from "@/lib/cms/layer-model";
import type { BonusTrigger, GameLinkOverrides } from "@/lib/cms/game-link-config";
import { parseLinkLayer, parseLinkOverrides } from "@/lib/cms/game-link-config";
import { parseBonusBindings } from "@/lib/cms/bonus-bindings";
import {
  buildGameSlots,
  cityShellQuizSlots,
  layer1LinkForSlot,
  layer1OpenerQuiz,
  surfaceToPreset,
  taskToOpenerArrivalQuiz,
} from "@/lib/cms/game-slots";
import { normalizeTaskContent } from "@/lib/cms/task-content";
import {
  compileGameLogic,
  parseLogicRules,
  type StudioLogicRule,
} from "@/lib/cms/logic-rules";
import type { ActionResult } from "@/lib/grid/types";
import type { ContentMode } from "@/lib/cms/layer-model";
import {
  normalizeStationCode,
  randomStationAccessCode,
  resolveStationAccessCode,
} from "@/lib/grid/stations";
import { PUSHABLE_EVENT_STATUSES, withLastLivePushAt } from "@/lib/cms/live-push";
import { pingTeamsContentUpdated } from "@/lib/grid/content-ping";
import { loadMergedGameTaskLinksForGame, addTaskToLayerPack, fetchPackItem, fillComposeShellIfEmpty, loadRecipeOriginContext, loadRecipeOriginGame, removeTaskFromLayerPack, reorderPackBackedGameTasks, savePackBackedGameLink } from "@/app/actions/cms/packs";
import { gameUsesLayerPacks, isRecipeCityShell, packItemToGameLink, parsePackLinkId } from "@/lib/cms/layer-packs";
import { localeCopyFromPatch, localeWritePackIds } from "@/lib/cms/studio-mutate";

function normalizeGameRow(row: StudioGame): StudioGame {
  return {
    ...(row as StudioGame),
    language: parseStudioLanguage((row as StudioGame).language),
    translations: parseTranslations((row as StudioGame).translations),
    active_layers: parseActiveLayers((row as StudioGame).active_layers),
    runtime_profiles: parseRuntimeProfiles((row as StudioGame).runtime_profiles),
    logic_rules: (row as StudioGame).logic_rules ?? [],
    layer1_pack_id: (row as StudioGame).layer1_pack_id ?? null,
    layer2_pack_id: (row as StudioGame).layer2_pack_id ?? null,
    layer3_pack_id: (row as StudioGame).layer3_pack_id ?? null,
    compose_recipe_id: (row as StudioGame).compose_recipe_id ?? null,
  };
}

function quizCopyFromLayer1(quiz: NonNullable<ReturnType<typeof layer1OpenerQuiz>>) {
  return {
    title: quiz.title ?? "",
    description: quiz.description ?? "",
    question: quiz.question,
    side_fact_title: quiz.side_fact_title ?? "",
    side_fact: quiz.side_fact ?? "",
    options: quiz.options.map((option) => ({ id: option.id, label: option.label })),
  };
}

function sourceSlotsFromLinks(links: StudioGameTaskLink[]) {
  return buildGameSlots(links).map((slot) => {
    const quiz = slot.quiz
      ? {
          title: slot.quiz.title ?? "",
          description: slot.quiz.description ?? "",
          question: slot.quiz.question,
          side_fact_title: slot.quiz.side_fact_title ?? "",
          side_fact: slot.quiz.side_fact ?? "",
          options: slot.quiz.options.map((option) => ({ id: option.id, label: option.label })),
        }
      : null;
    return {
      linkId: slot.levelLink.id,
      source: seedSlotCopyFromStudio({
        title: slot.levelLink.task.title,
        description: slot.levelLink.task.description,
        content: slot.levelLink.task.content,
        overrides: slot.levelLink.overrides,
        quiz,
        bonuses: slot.bonusLinks.map((link) => ({
          taskId: link.task_id,
          title: link.task.title,
          description: link.task.description,
          content: link.task.content,
        })),
      }),
      overrides: slot.levelLink.overrides,
    };
  });
}

function openerSlotsFromLinks(links: StudioGameTaskLink[]) {
  return buildGameSlots(links).flatMap((slot) => {
    const geo = layer1LinkForSlot(slot);
    if (!geo) return [];
    const quiz = layer1OpenerQuiz(geo);
    if (!quiz) return [];
    return [
      {
        linkId: geo.id,
        source: { quiz: quizCopyFromLayer1(quiz) } satisfies SlotLocaleCopy,
        overrides: geo.overrides,
      },
    ];
  });
}

function translationUnitsForGame(
  game: StudioGame,
  links: StudioGameTaskLink[],
  recipeBound = false,
) {
  if (recipeBound) {
    return collectCityShellTranslationUnits({
      game,
      slots: cityShellQuizSlots(links),
    });
  }
  return collectTranslationUnits({
    game,
    slots: sourceSlotsFromLinks(links).map(({ linkId, source }) => ({ linkId, source })),
  });
}

function slimListTranslations(raw: unknown) {
  const parsed = parseTranslations(raw);
  const slim: Record<string, { coverage?: { confirmed: number; total: number } }> = {};
  for (const [key, copy] of Object.entries(parsed)) {
    slim[key] = copy?.coverage ? { coverage: copy.coverage } : {};
  }
  return slim;
}

export async function listGames(): Promise<ActionResult<StudioGame[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const games: StudioGame[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("studio_games")
        .select(
          "id, organization_id, slug, name, logo_url, language, translations, city_slug, runtime_profiles, layer1_pack_id, layer2_pack_id, layer3_pack_id, compose_recipe_id, status, published_version_number, is_template, created_at, updated_at",
        )
        .eq("organization_id", orgId)
        .neq("is_template", true)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        games.push(
          normalizeGameRow({
            ...(row as StudioGame),
            translations: slimListTranslations((row as StudioGame).translations),
          }),
        );
      }
      if ((data ?? []).length < 1000) break;
    }
    return { success: true, data: games };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Games konnten nicht geladen werden.",
    };
  }
}

export async function listTemplates(): Promise<ActionResult<StudioGame[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_games")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_template", true)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return {
      success: true,
      data: (data ?? []).map((row) => normalizeGameRow(row as StudioGame)),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gespeicherte Templates konnten nicht geladen werden.",
    };
  }
}

export type CreateGameInput = {
  name: string;
  /** Player surface chosen at create time. */
  surface?: "outdoor" | "indoor" | "online";
  language?: StudioLanguage;
  layer1_pack_id?: string | null;
  layer2_pack_id?: string | null;
  layer3_pack_id?: string | null;
};

async function ensureUniqueGameSlug(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateGameSlug();
    const { data } = await supabase
      .from("studio_games")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("Spiel-Code konnte nicht erzeugt werden.");
}

export async function createGame(input: CreateGameInput): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const slug = await ensureUniqueGameSlug(supabase, orgId);

    const surface: ContentMode =
      input.surface === "indoor" || input.surface === "online" || input.surface === "outdoor"
        ? input.surface
        : "outdoor";
    const preset = surfaceToPreset(surface);
    const runtime_profiles = {
      ...DEFAULT_RUNTIME_PROFILES,
      default_mode: preset.defaultMode,
      allowed_fallbacks: [...preset.allowedFallbacks],
      indoor_one_click: preset.allowedFallbacks.includes("indoor"),
    };

    const payload = {
      organization_id: orgId,
      blueprint_id: null,
      slug,
      name: input.name.trim(),
      description: "",
      language: parseStudioLanguage(input.language),
      translations: {},
      gps_enabled: preset.gpsEnabled,
      active_layers: [...preset.activeLayers],
      runtime_profiles,
      feature_flags: {},
      logic_rules: [],
      status: "draft" as const,
      ...(input.layer1_pack_id || input.layer2_pack_id || input.layer3_pack_id
        ? {
            layer1_pack_id: input.layer1_pack_id ?? null,
            layer2_pack_id: input.layer2_pack_id ?? null,
            layer3_pack_id: input.layer3_pack_id ?? null,
          }
        : {}),
    };

    const { data, error } = await supabase
      .from("studio_games")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: normalizeGameRow(data as StudioGame) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Game konnte nicht erstellt werden.",
    };
  }
}

export async function getGame(gameId: string): Promise<ActionResult<StudioGame>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: "Game nicht gefunden." };
    const game = normalizeGameRow(data as StudioGame);
    if (gameUsesLayerPacks(game)) {
      return { success: true, data: normalizeGameRow(await fillComposeShellIfEmpty(game)) };
    }
    return { success: true, data: game };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Game konnte nicht geladen werden.",
    };
  }
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

async function loadLegacyGameTaskLink(
  supabase: ReturnType<typeof createAdminClient>,
  gameId: string,
  linkId: string,
): Promise<StudioGameTaskLink | null> {
  const { data, error } = await supabase
    .from("studio_game_tasks")
    .select("id, game_id, task_id, layer, sort_order, overrides, studio_tasks(*)")
    .eq("id", linkId)
    .eq("game_id", gameId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const taskRaw = Array.isArray(data.studio_tasks) ? data.studio_tasks[0] : data.studio_tasks;
  if (!taskRaw || typeof taskRaw !== "object") return null;
  return {
    id: String(data.id),
    game_id: String(data.game_id),
    task_id: String(data.task_id),
    layer: parseLinkLayer({
      layer: data.layer as StudioLayer,
      overrides: (data.overrides as Record<string, unknown>) ?? {},
    }),
    sort_order: typeof data.sort_order === "number" ? data.sort_order : 0,
    overrides: (data.overrides as Record<string, unknown>) ?? {},
    task: mapTaskRow(taskRaw as Record<string, unknown>),
  };
}

export async function listGameTasks(gameId: string): Promise<ActionResult<StudioGameTaskLink[]>> {
  try {
    const supabase = createAdminClient();
    const { data: gameRow, error: gameError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) throw new Error(gameError.message);
    if (!gameRow) return { success: true, data: [] };

    const links = await loadMergedGameTaskLinksForGame(
      supabase,
      normalizeGameRow(gameRow as StudioGame),
    );
    return { success: true, data: links };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Game-Tasks konnten nicht geladen werden.",
    };
  }
}

export async function updateGame(input: UpdateGameInput): Promise<ActionResult<StudioGame>> {
  try {
    const supabase = createAdminClient();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      payload.name = input.name.trim();
    }
    if (input.description !== undefined) payload.description = input.description.trim();
    if (input.language !== undefined) payload.language = input.language;
    if (input.translations !== undefined) payload.translations = parseTranslations(input.translations);
    if (input.city_slug !== undefined) payload.city_slug = input.city_slug;
    if (input.duration_minutes !== undefined) payload.duration_minutes = input.duration_minutes;
    if (input.gps_enabled !== undefined) payload.gps_enabled = input.gps_enabled;
    if (input.farewell_text !== undefined) payload.farewell_text = input.farewell_text.trim();
    if (input.logo_url !== undefined) payload.logo_url = input.logo_url;
    if (input.feature_flags !== undefined) payload.feature_flags = input.feature_flags;
    if (input.logic_rules !== undefined) payload.logic_rules = parseLogicRules(input.logic_rules);
    if (input.active_layers !== undefined) payload.active_layers = input.active_layers;
    if (input.runtime_profiles !== undefined) payload.runtime_profiles = input.runtime_profiles;
    if (input.layer1_pack_id !== undefined) payload.layer1_pack_id = input.layer1_pack_id;
    if (input.layer2_pack_id !== undefined) payload.layer2_pack_id = input.layer2_pack_id;
    if (input.layer3_pack_id !== undefined) payload.layer3_pack_id = input.layer3_pack_id;

    if (input.layer1_pack_id) {
      const { data: cityPack } = await supabase
        .from("studio_layer_packs")
        .select("city_slug")
        .eq("id", input.layer1_pack_id)
        .maybeSingle();
      if (cityPack && input.city_slug === undefined) {
        payload.city_slug = (cityPack as { city_slug?: string | null }).city_slug ?? null;
      }
    }

    const { data, error } = await supabase
      .from("studio_games")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: normalizeGameRow(data as StudioGame) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Game konnte nicht gespeichert werden.",
    };
  }
}

export async function updateGameLayerProfile(input: {
  id: string;
  active_layers: import("@/lib/cms/layer-model").StudioLayer[];
  runtime_profiles: import("@/lib/cms/layer-model").RuntimeProfiles;
  gps_enabled?: boolean;
}): Promise<ActionResult<StudioGame>> {
  return updateGame({
    id: input.id,
    active_layers: input.active_layers,
    runtime_profiles: input.runtime_profiles,
    gps_enabled: input.gps_enabled,
  });
}

export async function addTaskToGame(
  gameId: string,
  taskId: string,
  layer: StudioLayer = 2,
): Promise<ActionResult<StudioGameTaskLink>> {
  try {
    const supabase = createAdminClient();
    const { data: gameRow } = await supabase
      .from("studio_games")
      .select("layer1_pack_id, layer2_pack_id, layer3_pack_id, runtime_profiles")
      .eq("id", gameId)
      .maybeSingle();
    const indoorGame =
      parseRuntimeProfiles(gameRow?.runtime_profiles).default_mode === "indoor";
    const packIdForLayer =
      layer === 1
        ? gameRow?.layer1_pack_id
        : layer === 2
          ? gameRow?.layer2_pack_id
          : gameRow?.layer3_pack_id;
    if (packIdForLayer) {
      const extras: { overrides?: Record<string, unknown> } = {};
      if (indoorGame && layer === 1) {
        extras.overrides = { station: { code: randomStationAccessCode() } };
      }
      const added = await addTaskToLayerPack(String(packIdForLayer), taskId, extras);
      if (!added.success) return { success: false, error: added.error };
      const item = (added.data ?? []).find((row) => row.task_id === taskId);
      if (!item) return { success: false, error: "Pack-Eintrag nach dem Hinzufügen nicht gefunden." };
      return {
        success: true,
        data: packItemToGameLink({
          gameId,
          packId: String(packIdForLayer),
          item,
          layer,
        }),
      };
    }

    const { data: existing } = await supabase
      .from("studio_game_tasks")
      .select("id")
      .eq("game_id", gameId)
      .eq("task_id", taskId)
      .maybeSingle();

    if (existing) return { success: false, error: "Aufgabe ist bereits in diesem Spiel." };

    const { count, error: countError } = await supabase
      .from("studio_game_tasks")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("layer", layer);

    if (countError) throw new Error(countError.message);

    let insertOverrides: Record<string, unknown> = {};
    if (indoorGame && layer !== 3) {
      const { data: siblingRows } = await supabase
        .from("studio_game_tasks")
        .select("overrides")
        .eq("game_id", gameId);
      const taken = new Set(
        (siblingRows ?? []).flatMap((row) => {
          const code = (row.overrides as { station?: { code?: string } } | null)?.station
            ?.code;
          return code ? [normalizeStationCode(code)] : [];
        }),
      );
      let code = randomStationAccessCode();
      let guard = 0;
      while (taken.has(code) && guard < 12) {
        code = randomStationAccessCode();
        guard += 1;
      }
      insertOverrides = { station: { code } };
    }

    const { data: link, error: linkError } = await supabase
      .from("studio_game_tasks")
      .insert({
        game_id: gameId,
        task_id: taskId,
        layer,
        sort_order: count ?? 0,
        ...(Object.keys(insertOverrides).length > 0 ? { overrides: insertOverrides } : {}),
      })
      .select("id, game_id, task_id, layer, sort_order, overrides")
      .single();

    if (linkError) throw new Error(linkError.message);

    const { data: task, error: taskError } = await supabase
      .from("studio_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) throw new Error(taskError.message);
    return {
      success: true,
      data: {
        ...(link as Omit<StudioGameTaskLink, "task">),
        layer: parseLinkLayer({
          layer: (link as { layer?: number }).layer as StudioLayer,
          overrides: (link as { overrides: Record<string, unknown> }).overrides ?? {},
        }),
        overrides: (link as { overrides: Record<string, unknown> }).overrides ?? {},
        task: mapTaskRow(task as Record<string, unknown>),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Task konnte nicht hinzugefügt werden.",
    };
  }
}

export async function removeTaskFromGame(linkId: string, gameId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const packed = parsePackLinkId(linkId);
    if (packed) {
      const removed = await removeTaskFromLayerPack(packed.packId, packed.itemId);
      if (!removed.success) return { success: false, error: removed.error };
      return { success: true, data: { id: linkId } };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("studio_game_tasks").delete().eq("id", linkId);
    if (error) throw new Error(error.message);

    const { data: remaining } = await supabase
      .from("studio_game_tasks")
      .select("id")
      .eq("game_id", gameId)
      .order("sort_order");

    if (remaining) {
      const { data: full } = await supabase
        .from("studio_game_tasks")
        .select("id, layer")
        .eq("game_id", gameId)
        .order("sort_order");
      const byLayer = new Map<number, string[]>();
      for (const row of full ?? []) {
        const l = (row as { layer?: number }).layer ?? 2;
        if (!byLayer.has(l)) byLayer.set(l, []);
        byLayer.get(l)!.push((row as { id: string }).id);
      }
      await Promise.all(
        [...byLayer.entries()].flatMap(([layer, ids]) =>
          ids.map((id, index) =>
            supabase
              .from("studio_game_tasks")
              .update({ sort_order: index })
              .eq("id", id)
              .eq("layer", layer),
          ),
        ),
      );
    }
    return { success: true, data: { id: linkId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Task konnte nicht entfernt werden.",
    };
  }
}

export async function updateGameTaskLocation(
  gameId: string,
  linkId: string,
  location: { lat: number; lng: number; radius_meters: number } | null,
): Promise<ActionResult<StudioGameTaskLink>> {
  try {
    if (parsePackLinkId(linkId)) {
      const overrides: Record<string, unknown> = {};
      if (location) {
        overrides.location = location;
        overrides.gps = location;
      }
      return savePackBackedGameLink({ gameId, linkId, overrides });
    }
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from("studio_game_tasks")
      .select("id, overrides")
      .eq("id", linkId)
      .eq("game_id", gameId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return { success: false, error: "Task-Zuweisung nicht gefunden." };

    const overrides = {
      ...((existing as { overrides: Record<string, unknown> }).overrides ?? {}),
    };
    if (location) {
      overrides.location = location;
      overrides.gps = location;
    } else {
      delete overrides.location;
      delete overrides.gps;
    }

    const { error: updateError } = await supabase
      .from("studio_game_tasks")
      .update({ overrides })
      .eq("id", linkId)
      .eq("game_id", gameId);

    if (updateError) throw new Error(updateError.message);

    const link = await loadLegacyGameTaskLink(supabase, gameId, linkId);
    if (!link) return { success: false, error: "Task nach Update nicht gefunden." };
    return { success: true, data: link };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Wegpunkt konnte nicht gespeichert werden.",
    };
  }
}

type GameLinkConfigPatch = {
  location?: { lat: number; lng: number; radius_meters: number } | null;
  role?: GameLinkOverrides["role"];
  trigger?: BonusTrigger | null;
  arrival_quiz?: GameLinkOverrides["arrival_quiz"] | null;
  opener_task_id?: string | null;
  opener_points?: number | null;
  bonus_task_id?: string | null;
  bonus_bindings?: Array<{
    task_id: string;
    role: "alpha" | "beta" | "gamma" | "team";
    when: {
      type:
        | "immediate"
        | "delay_minutes"
        | "delay_meters"
        | "game_minutes"
        | "interval_minutes";
      minutes?: number;
      meters?: number;
    };
  }> | null;
  geo_task_id?: string | null;
  unlock?: GameLinkOverrides["unlock"] | null;
  visible_to?: GameLinkOverrides["visible_to"] | null;
  station?: GameLinkOverrides["station"] | null;
  ends_game?: boolean | null;
};

async function applyGameLinkConfigPatch(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  overrides: GameLinkOverrides,
  patch: GameLinkConfigPatch,
): Promise<ActionResult<GameLinkOverrides>> {
  if (patch.location !== undefined) {
    if (patch.location) {
      overrides.location = patch.location;
      overrides.gps = patch.location;
    } else {
      delete overrides.location;
      delete overrides.gps;
    }
  }
  if (patch.role !== undefined) {
    overrides.role = patch.role;
  }
  if (patch.trigger !== undefined) {
    if (patch.trigger) overrides.trigger = patch.trigger;
    else delete overrides.trigger;
  }
  if (patch.arrival_quiz !== undefined && patch.opener_task_id === undefined) {
    if (patch.arrival_quiz) overrides.arrival_quiz = patch.arrival_quiz;
    else delete overrides.arrival_quiz;
  }
  if (patch.opener_task_id !== undefined) {
    if (patch.opener_task_id) {
      const { data: openerTask, error: openerError } = await supabase
        .from("studio_tasks")
        .select("id, title, description, content, organization_id")
        .eq("id", patch.opener_task_id)
        .eq("is_active", true)
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .maybeSingle();

      if (openerError) throw new Error(openerError.message);
      if (!openerTask) {
        return { success: false, error: "Einstiegs-Aufgabe nicht gefunden." };
      }

      const pointsOverride =
        patch.opener_points !== undefined ? patch.opener_points : (overrides.opener_points ?? null);

      const quiz = taskToOpenerArrivalQuiz(
        {
          title: openerTask.title as string,
          description: (openerTask.description as string) ?? "",
          content: normalizeTaskContent(openerTask.content),
        },
        pointsOverride,
      );
      if (!quiz) {
        return {
          success: false,
          error: "Einstiegs-Aufgabe muss Multiple Choice sein (eine oder mehrere richtige Antworten).",
        };
      }

      overrides.opener_task_id = patch.opener_task_id;
      overrides.opener_enabled = true;
      overrides.arrival_quiz = quiz;
      if (typeof pointsOverride === "number") {
        overrides.opener_points = Math.max(0, Math.round(pointsOverride));
      } else {
        delete overrides.opener_points;
      }
    } else {
      overrides.opener_enabled = false;
      delete overrides.opener_task_id;
      delete overrides.opener_points;
      delete overrides.arrival_quiz;
    }
  } else if (patch.opener_points !== undefined && overrides.opener_task_id) {
    const { data: openerTask, error: openerError } = await supabase
      .from("studio_tasks")
      .select("id, title, description, content")
      .eq("id", overrides.opener_task_id)
      .maybeSingle();

    if (openerError) throw new Error(openerError.message);
    if (openerTask) {
      const quiz = taskToOpenerArrivalQuiz(
        {
          title: openerTask.title as string,
          description: (openerTask.description as string) ?? "",
          content: normalizeTaskContent(openerTask.content),
        },
        patch.opener_points,
      );
      if (quiz) {
        overrides.arrival_quiz = quiz;
        if (typeof patch.opener_points === "number") {
          overrides.opener_points = Math.max(0, Math.round(patch.opener_points));
        } else {
          delete overrides.opener_points;
        }
      }
    }
  }
  if (patch.bonus_task_id !== undefined) {
    if (patch.bonus_task_id) overrides.bonus_task_id = patch.bonus_task_id;
    else delete overrides.bonus_task_id;
  }
  if (patch.bonus_bindings !== undefined) {
    if (patch.bonus_bindings && patch.bonus_bindings.length > 0) {
      overrides.bonus_bindings = patch.bonus_bindings;
      overrides.bonus_task_id = patch.bonus_bindings[0]!.task_id;
    } else {
      overrides.bonus_bindings = [];
      delete overrides.bonus_task_id;
    }
  }
  if (patch.geo_task_id !== undefined) {
    if (patch.geo_task_id) overrides.geo_task_id = patch.geo_task_id;
    else delete overrides.geo_task_id;
  }
  if (patch.unlock !== undefined) {
    if (patch.unlock) overrides.unlock = patch.unlock;
    else delete overrides.unlock;
  }
  if (patch.visible_to !== undefined) {
    if (patch.visible_to) overrides.visible_to = patch.visible_to;
    else delete overrides.visible_to;
  }
  if (patch.station !== undefined) {
    if (patch.station) overrides.station = patch.station;
    else delete overrides.station;
  }
  if (patch.ends_game !== undefined) {
    if (patch.ends_game) overrides.ends_game = true;
    else delete overrides.ends_game;
  }
  return { success: true, data: overrides };
}

export async function updateGameTaskLinkConfig(
  gameId: string,
  linkId: string,
  patch: GameLinkConfigPatch,
): Promise<ActionResult<StudioGameTaskLink>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    if (parsePackLinkId(linkId)) {
      const parsed = parsePackLinkId(linkId);
      if (!parsed) return { success: false, error: "Kein Pack-Slot." };
      const item = await fetchPackItem(supabase, parsed.itemId);
      if (!item) return { success: false, error: "Task-Zuweisung nicht gefunden." };

      const overrides: GameLinkOverrides = {
        ...(((item.overrides as GameLinkOverrides) ?? {}) as GameLinkOverrides),
      };
      const applied = await applyGameLinkConfigPatch(supabase, orgId, overrides, patch);
      if (!applied.success) return applied;

      return savePackBackedGameLink({
        gameId,
        linkId,
        overrides: applied.data,
        openerTaskId: patch.opener_task_id,
        bonusBindingsTouched: patch.bonus_bindings !== undefined,
        endsGame: patch.ends_game,
      });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("studio_game_tasks")
      .select("id, task_id, overrides")
      .eq("id", linkId)
      .eq("game_id", gameId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return { success: false, error: "Task-Zuweisung nicht gefunden." };

    const overrides: GameLinkOverrides = {
      ...(((existing as { overrides: GameLinkOverrides }).overrides ?? {}) as GameLinkOverrides),
    };
    const applied = await applyGameLinkConfigPatch(supabase, orgId, overrides, patch);
    if (!applied.success) return applied;

    const { error: updateError } = await supabase
      .from("studio_game_tasks")
      .update({ overrides: applied.data })
      .eq("id", linkId)
      .eq("game_id", gameId);

    if (updateError) throw new Error(updateError.message);

    // Bindings alone are not enough — compile only sees tasks linked on the game.
    // Auto-attach missing bonus pool tasks as Layer 3 so „Ganzes Team“ actually fires.
    if (patch.bonus_bindings !== undefined) {
      const keepIds = new Set(
        (patch.bonus_bindings ?? []).map((b) => b.task_id).filter(Boolean),
      );
      const missionTaskId = (existing as { task_id?: string }).task_id;
      if (missionTaskId) {
        const { data: layer3, error: layer3Error } = await supabase
          .from("studio_game_tasks")
          .select("id, task_id, overrides")
          .eq("game_id", gameId)
          .eq("layer", 3);
        if (layer3Error) throw new Error(layer3Error.message);
        await Promise.all(
          (layer3 ?? []).map(async (row) => {
            if (keepIds.has(row.task_id as string)) return;
            const sibling = {
              ...(((row as { overrides: GameLinkOverrides }).overrides ??
                {}) as GameLinkOverrides),
            };
            const trigger = sibling.trigger;
            if (
              trigger?.type !== "after_task_solved" ||
              trigger.source_task_id !== missionTaskId
            ) {
              return;
            }
            delete sibling.trigger;
            await supabase
              .from("studio_game_tasks")
              .update({ overrides: sibling })
              .eq("id", row.id)
              .eq("game_id", gameId);
          }),
        );
      }
    }

    if (patch.bonus_bindings && patch.bonus_bindings.length > 0) {
      const neededIds = Array.from(
        new Set(patch.bonus_bindings.map((b) => b.task_id).filter(Boolean)),
      );
      if (neededIds.length > 0) {
        const { data: existingLinks, error: existingError } = await supabase
          .from("studio_game_tasks")
          .select("task_id")
          .eq("game_id", gameId)
          .in("task_id", neededIds);
        if (existingError) throw new Error(existingError.message);

        const linked = new Set((existingLinks ?? []).map((row) => row.task_id as string));
        const missing = neededIds.filter((id) => !linked.has(id));

        if (missing.length > 0) {
          const { count, error: countError } = await supabase
            .from("studio_game_tasks")
            .select("id", { count: "exact", head: true })
            .eq("game_id", gameId)
            .eq("layer", 3);
          if (countError) throw new Error(countError.message);

          const { error: insertError } = await supabase.from("studio_game_tasks").insert(
            missing.map((taskId, index) => ({
              game_id: gameId,
              task_id: taskId,
              layer: 3,
              sort_order: (count ?? 0) + index,
              overrides: {},
            })),
          );
          if (insertError) throw new Error(insertError.message);
        }
      }
    }

    // Only one farewell stop per game — clear the flag on sibling mission links.
    if (patch.ends_game) {
      const { data: siblings, error: siblingsError } = await supabase
        .from("studio_game_tasks")
        .select("id, overrides")
        .eq("game_id", gameId)
        .neq("id", linkId);

      if (siblingsError) throw new Error(siblingsError.message);

      await Promise.all(
        (siblings ?? []).map(async (row) => {
          const siblingOverrides = {
            ...(((row as { overrides: GameLinkOverrides }).overrides ??
              {}) as GameLinkOverrides),
          };
          if (!siblingOverrides.ends_game) return;
          delete siblingOverrides.ends_game;
          await supabase
            .from("studio_game_tasks")
            .update({ overrides: siblingOverrides })
            .eq("id", row.id)
            .eq("game_id", gameId);
        }),
      );
    }

    const link = await loadLegacyGameTaskLink(supabase, gameId, linkId);
    if (!link) return { success: false, error: "Task nach Update nicht gefunden." };
    return { success: true, data: link };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Konfiguration konnte nicht gespeichert werden.",
    };
  }
}

export async function reorderGameTasksInLayer(
  gameId: string,
  layer: StudioLayer,
  orderedLinkIds: string[],
): Promise<ActionResult<{ count: number }>> {
  try {
    if (orderedLinkIds.some((id) => parsePackLinkId(id))) {
      return reorderPackBackedGameTasks(gameId, layer, orderedLinkIds);
    }
    const supabase = createAdminClient();
    const results = await Promise.all(
      orderedLinkIds.map((linkId, index) =>
        supabase
          .from("studio_game_tasks")
          .update({ sort_order: index })
          .eq("id", linkId)
          .eq("game_id", gameId)
          .eq("layer", layer),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
    return { success: true, data: { count: orderedLinkIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reihenfolge konnte nicht gespeichert werden.",
    };
  }
}

export async function reorderGameTasks(
  gameId: string,
  orderedLinkIds: string[],
): Promise<ActionResult<{ count: number }>> {
  try {
    if (orderedLinkIds.some((id) => parsePackLinkId(id))) {
      return reorderPackBackedGameTasks(gameId, 2, orderedLinkIds);
    }
    const supabase = createAdminClient();
    const results = await Promise.all(
      orderedLinkIds.map((linkId, index) =>
        supabase
          .from("studio_game_tasks")
          .update({ sort_order: index })
          .eq("id", linkId)
          .eq("game_id", gameId),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
    return { success: true, data: { count: orderedLinkIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reihenfolge konnte nicht gespeichert werden.",
    };
  }
}

export async function publishGame(
  gameId: string,
  notes?: string,
): Promise<ActionResult<{ versionId: string; versionNumber: number }>> {
  try {
    const supabase = createAdminClient();
    const gameResult = await getGame(gameId);
    if (!gameResult.success) {
      return { success: false, error: gameResult.error };
    }
    if (!gameResult.data) {
      return { success: false, error: "Game nicht gefunden." };
    }

    const game = normalizeGameRow(gameResult.data);
    if (game.is_template) {
      return { success: false, error: "Vorlagen können nicht veröffentlicht werden." };
    }
    const tasksResult = await listGameTasks(gameId);
    if (!tasksResult.success) {
      return { success: false, error: tasksResult.error };
    }

    const rules = parseLogicRules(game.logic_rules);
    let links = tasksResult.data ?? [];

    // Same as live compile: bindings that only reference pool tasks still need a Layer-3 link.
    const linkedIds = new Set(links.map((l) => l.task_id));
    const orphanBonusIds = [
      ...new Set(
        links.flatMap((link) => {
          const bindings = parseBonusBindings(link.overrides as GameLinkOverrides);
          const legacy =
            typeof (link.overrides as { bonus_task_id?: unknown })?.bonus_task_id === "string"
              ? [(link.overrides as { bonus_task_id: string }).bonus_task_id.trim()]
              : [];
          return [...bindings.map((b) => b.task_id), ...legacy].filter(
            (id) => id && !linkedIds.has(id),
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
        links = [
          ...links,
          {
            id: `virtual-bonus-${task.id}`,
            game_id: gameId,
            task_id: task.id,
            layer: 3 as const,
            sort_order: sortBase++,
            overrides: {},
            task,
          },
        ];
        linkedIds.add(task.id);
      }
    }

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

    const compiled = compileGameLogic({
      game,
      links,
      rules,
      openerTasksById,
    });
    const slots = buildGameSlots(links, { openerTasksById });
    const origin = await loadRecipeOriginGame(supabase, game);
    const locales = buildSnapshotLocales({
      game,
      origin,
      levels: compiled.levels,
      slotLinks: slots.map((slot) => ({
        overrides: withGeoQuizLocales(slot.levelLink.overrides, slot.geoLink?.overrides),
      })),
    });

    const nextVersion = game.published_version_number + 1;
    const snapshot = {
      game,
      tasks: tasksResult.data ?? [],
      logic_rules: rules,
      compiled_logic: compiled,
      levels: compiled.levels,
      locales,
      layer_profile: buildLayerSnapshotMeta({
        activeLayers: game.active_layers,
        runtimeProfiles: game.runtime_profiles,
      }),
      published_at: new Date().toISOString(),
    };

    const { data: version, error: versionError } = await supabase
      .from("studio_game_versions")
      .insert({
        game_id: gameId,
        version_number: nextVersion,
        snapshot,
        publish_notes: notes?.trim() || null,
      })
      .select("id, version_number")
      .single();

    if (versionError) throw new Error(versionError.message);

    const { error: updateError } = await supabase
      .from("studio_games")
      .update({
        status: "published",
        published_version_number: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (updateError) throw new Error(updateError.message);
    return {
      success: true,
      data: { versionId: version.id, versionNumber: version.version_number },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Game konnte nicht veröffentlicht werden.",
    };
  }
}

export async function publishDraftComposeGames(recipeId: string): Promise<
  ActionResult<{
    publishedCount: number;
    remainingCount: number;
    failedCount: number;
    errors: string[];
  }>
> {
  try {
    const id = recipeId.trim();
    if (!id) return { success: false, error: "Rezept fehlt." };

    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("studio_games")
      .update({
        status: "published",
        published_version_number: 1,
        updated_at: now,
      })
      .eq("compose_recipe_id", id)
      .eq("is_template", false)
      .eq("status", "draft")
      .select("id");
    if (error) throw new Error(error.message);

    return {
      success: true,
      data: {
        publishedCount: data?.length ?? 0,
        remainingCount: 0,
        failedCount: 0,
        errors: [],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Entwürfe konnten nicht veröffentlicht werden.",
    };
  }
}

export async function pushLiveStudioGame(gameId: string): Promise<
  ActionResult<{
    versionNumber: number;
    eventCount: number;
    pushedAt: string;
    featureFlags: Record<string, unknown>;
  }>
> {
  try {
    const orgId = await getStudioOrganizationId();
    const published = await publishGame(gameId, "Live-Teams aktualisieren");
    if (!published.success) {
      return { success: false, error: published.error };
    }

    const supabase = createAdminClient();
    const { data: versions, error: versionsError } = await supabase
      .from("studio_game_versions")
      .select("id")
      .eq("game_id", gameId);
    if (versionsError) throw new Error(versionsError.message);

    const versionIds = (versions ?? []).map((row) => row.id as string);
    const eventMap = new Map<
      string,
      { id: string; content_config: unknown; content_revision: number | null }
    >();

    if (versionIds.length > 0) {
      const { data: byVersion, error: byVersionError } = await supabase
        .from("events")
        .select("id, content_config, content_revision")
        .eq("organization_id", orgId)
        .in("studio_game_version_id", versionIds)
        .in("status", [...PUSHABLE_EVENT_STATUSES]);
      if (byVersionError) throw new Error(byVersionError.message);
      for (const row of byVersion ?? []) {
        eventMap.set(row.id as string, {
          id: row.id as string,
          content_config: row.content_config,
          content_revision: (row.content_revision as number | null) ?? 0,
        });
      }
    }

    const { data: byCmsId, error: byCmsError } = await supabase
      .from("events")
      .select("id, content_config, content_revision")
      .eq("organization_id", orgId)
      .eq("content_config->>cms_game_id", gameId)
      .in("status", [...PUSHABLE_EVENT_STATUSES]);
    if (byCmsError) throw new Error(byCmsError.message);
    for (const row of byCmsId ?? []) {
      eventMap.set(row.id as string, {
        id: row.id as string,
        content_config: row.content_config,
        content_revision: (row.content_revision as number | null) ?? 0,
      });
    }

    const events = [...eventMap.values()];
    for (const event of events) {
      const prev =
        event.content_config && typeof event.content_config === "object"
          ? (event.content_config as Record<string, unknown>)
          : {};
      const { error: updateError } = await supabase
        .from("events")
        .update({
          studio_game_version_id: published.data.versionId,
          content_config: {
            ...prev,
            cms_game_id: gameId,
            cms_version_number: published.data.versionNumber,
          },
          content_revision: (event.content_revision ?? 0) + 1,
        })
        .eq("id", event.id);
      if (updateError) throw new Error(updateError.message);
    }

    await pingTeamsContentUpdated(
      events.map((event) => event.id),
      Math.max(...events.map((event) => (event.content_revision ?? 0) + 1), 1),
    );

    const { data: gameRow, error: gameReadError } = await supabase
      .from("studio_games")
      .select("feature_flags")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (gameReadError) throw new Error(gameReadError.message);

    const pushedAt = new Date().toISOString();
    const featureFlags = withLastLivePushAt(
      (gameRow?.feature_flags as Record<string, unknown> | null) ?? {},
      pushedAt,
    );
    const { error: flagError } = await supabase
      .from("studio_games")
      .update({
        feature_flags: featureFlags,
        updated_at: pushedAt,
      })
      .eq("id", gameId)
      .eq("organization_id", orgId);
    if (flagError) throw new Error(flagError.message);
    return {
      success: true,
      data: {
        versionNumber: published.data.versionNumber,
        eventCount: events.length,
        pushedAt,
        featureFlags,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Live-Teams konnten nicht aktualisiert werden.",
    };
  }
}

export async function revertGameToDraft(gameId: string): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return { success: false, error: "Spiel nicht gefunden." };

    const game = existing as StudioGame;
    if (game.status === "draft") {
      return { success: true, data: game };
    }

    const { data, error } = await supabase
      .from("studio_games")
      .update({
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as StudioGame };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Spiel konnte nicht auf Entwurf gesetzt werden.",
    };
  }
}

export async function saveGameAsTemplate(gameId: string): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return { success: false, error: "Game nicht gefunden." };

    const { data, error } = await supabase
      .from("studio_games")
      .update({
        is_template: true,
        status: "draft",
        published_version_number: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: normalizeGameRow(data as StudioGame) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Vorlage konnte nicht gespeichert werden.",
    };
  }
}

export async function removeGameTemplate(gameId: string): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("studio_games")
      .update({
        is_template: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: normalizeGameRow(data as StudioGame) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Vorlagen-Status konnte nicht entfernt werden.",
    };
  }
}

export type CreateGameFromTemplateInput = {
  templateId: string;
  name: string;
};

export async function createGameFromTemplate(
  input: CreateGameFromTemplateInput,
): Promise<ActionResult<StudioGame>> {
  try {
    const name = input.name.trim();
    if (!name) return { success: false, error: "Bitte einen Namen eingeben." };

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: template, error: fetchError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", input.templateId)
      .eq("organization_id", orgId)
      .eq("is_template", true)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!template) return { success: false, error: "Vorlage nicht gefunden." };

    const copy = await copyGameWithLinks(
      supabase,
      orgId,
      normalizeGameRow(template as StudioGame),
      name,
    );
    return { success: true, data: copy };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Spiel konnte nicht aus Vorlage erstellt werden.",
    };
  }
}

export type DuplicateGamesResult = {
  createdIds: string[];
  createdCount: number;
};

async function copyGameWithLinks(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  source: StudioGame,
  name: string,
): Promise<StudioGame> {
  const slug = await ensureUniqueGameSlug(supabase, orgId);

  const { data, error } = await supabase
    .from("studio_games")
    .insert({
      organization_id: orgId,
      blueprint_id: source.blueprint_id,
      slug,
      name,
      logo_url: source.logo_url,
      description: source.description,
      language: source.language,
      translations: parseTranslations(source.translations),
      city_slug: source.city_slug,
      duration_minutes: source.duration_minutes,
      gps_enabled: source.gps_enabled,
      farewell_text: source.farewell_text,
      feature_flags: source.feature_flags,
      logic_rules: source.logic_rules,
      active_layers: source.active_layers,
      runtime_profiles: source.runtime_profiles,
      ...(gameUsesLayerPacks(source)
        ? {
            layer1_pack_id: source.layer1_pack_id ?? null,
            layer2_pack_id: source.layer2_pack_id ?? null,
            layer3_pack_id: source.layer3_pack_id ?? null,
          }
        : {}),
      is_template: false,
      status: "draft",
      published_version_number: 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  if (gameUsesLayerPacks(source)) {
    return normalizeGameRow(data as StudioGame);
  }

  const { data: sourceLinks } = await supabase
    .from("studio_game_tasks")
    .select("task_id, sort_order, layer, overrides")
    .eq("game_id", source.id)
    .order("sort_order");

  if (sourceLinks?.length) {
    const { error: linksError } = await supabase.from("studio_game_tasks").insert(
      sourceLinks.map((link) => ({
        game_id: data.id,
        task_id: link.task_id,
        layer: (link as { layer?: number }).layer ?? 2,
        sort_order: link.sort_order,
        overrides: link.overrides,
      })),
    );
    if (linksError) throw new Error(linksError.message);
  }

  return normalizeGameRow(data as StudioGame);
}

export async function addGameLocale(
  gameId: string,
  language: StudioLanguage,
): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { success: false, error: "Spiel nicht gefunden." };

    if (!isStudioLanguage(language)) {
      return { success: false, error: "Diese Sprache wird noch nicht unterstützt." };
    }

    const game = normalizeGameRow(row as StudioGame);
    if (language === game.language) {
      return { success: true, data: game };
    }
    const context = await loadRecipeOriginContext(supabase, game);
    const recipeBound = isRecipeCityShell(game, context.origin, context.isSource);
    const translations = { ...game.translations };
    if (!translations[language]) {
      const linksResult = await listGameTasks(gameId);
      const units = translationUnitsForGame(
        game,
        linksResult.success ? linksResult.data ?? [] : [],
        recipeBound,
      );
      const seed = recipeBound ? { name: game.name } : seedLocaleCopy(game);
      translations[language] = localeCopyWithCoverage(undefined, seed, units);
    }

    const { data, error: updateError } = await supabase
      .from("studio_games")
      .update({ translations, updated_at: new Date().toISOString() })
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);
    return { success: true, data: normalizeGameRow(data as StudioGame) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sprache konnte nicht angelegt werden.",
    };
  }
}

async function writeSlotLocalePatches(
  supabase: ReturnType<typeof createAdminClient>,
  game: StudioGame,
  language: StudioLanguage,
  cityShell: boolean,
  slots: Array<{ linkId: string; copy: SlotLocaleCopy }>,
) {
  if (slots.length === 0) return;
  const allowedPacks = localeWritePackIds(game, cityShell);
  const copyByItemId = new Map<string, SlotLocaleCopy>();
  const copyByLegacyId = new Map<string, SlotLocaleCopy>();
  for (const slot of slots) {
    const parsed = parsePackLinkId(slot.linkId);
    if (parsed) copyByItemId.set(parsed.itemId, slot.copy);
    else copyByLegacyId.set(slot.linkId, slot.copy);
  }

  if (copyByItemId.size > 0 && allowedPacks.length > 0) {
    const { data: items, error } = await supabase
      .from("studio_layer_pack_items")
      .select("id, pack_id, overrides")
      .in("id", [...copyByItemId.keys()])
      .in("pack_id", allowedPacks);
    if (error) throw new Error(error.message);
    const results = await Promise.all(
      (items ?? []).flatMap((item) => {
        const copy = copyByItemId.get(item.id as string);
        if (!copy) return [];
        return [
          supabase
            .from("studio_layer_pack_items")
            .update({
              overrides: withLinkLocale(
                (item.overrides as Record<string, unknown>) ?? {},
                language,
                copy,
              ),
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id)
            .eq("pack_id", item.pack_id),
        ];
      }),
    );
    const failed = results.find((row) => row.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  if (copyByLegacyId.size > 0) {
    const { data: links, error } = await supabase
      .from("studio_game_tasks")
      .select("id, overrides")
      .eq("game_id", game.id)
      .in("id", [...copyByLegacyId.keys()]);
    if (error) throw new Error(error.message);
    const results = await Promise.all(
      (links ?? []).flatMap((link) => {
        const copy = copyByLegacyId.get(link.id as string);
        if (!copy) return [];
        return [
          supabase
            .from("studio_game_tasks")
            .update({
              overrides: withLinkLocale(
                (link.overrides as Record<string, unknown>) ?? {},
                language,
                copy,
              ),
            })
            .eq("id", link.id)
            .eq("game_id", game.id),
        ];
      }),
    );
    const failed = results.find((row) => row.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
}

export async function saveGameLocale(input: {
  gameId: string;
  language: StudioLanguage;
  copy: GameLocaleCopy;
  slots?: Array<{ linkId: string; copy: SlotLocaleCopy }>;
}): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", input.gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { success: false, error: "Spiel nicht gefunden." };

    const game = normalizeGameRow(row as StudioGame);
    const source = parseStudioLanguage(game.language);
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const context = await loadRecipeOriginContext(supabase, game);
    const recipeBound = isRecipeCityShell(game, context.origin, context.isSource);

    if (input.language === source) {
      if (input.copy.name !== undefined) payload.name = input.copy.name.trim();
      if (!recipeBound) {
        if (input.copy.description !== undefined) payload.description = input.copy.description;
        if (input.copy.farewell_text !== undefined) payload.farewell_text = input.copy.farewell_text;
      }
    } else {
      payload.translations = {
        ...game.translations,
        [input.language]: localeCopyFromPatch(
          recipeBound ? undefined : game.translations[input.language],
          input.copy,
          recipeBound,
        ),
      };
    }

    const { data, error: updateError } = await supabase
      .from("studio_games")
      .update(payload)
      .eq("id", input.gameId)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    await writeSlotLocalePatches(supabase, game, input.language, recipeBound, input.slots ?? []);

    return { success: true, data: normalizeGameRow(data as StudioGame) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Übersetzung konnte nicht gespeichert werden.",
    };
  }
}

export type TranslateGameLocaleResult = {
  game: StudioGame;
  copy: GameLocaleCopy;
  slots: Record<string, SlotLocaleCopy>;
  translated: number;
};

export async function translateGameLocale(input: {
  gameId: string;
  language: StudioLanguage;
}): Promise<ActionResult<TranslateGameLocaleResult>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", input.gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { success: false, error: "Spiel nicht gefunden." };
    if (!isStudioLanguage(input.language)) {
      return { success: false, error: "Diese Sprache wird noch nicht unterstützt." };
    }

    const game = normalizeGameRow(row as StudioGame);
    const sourceLang = parseStudioLanguage(game.language);
    if (input.language === sourceLang) {
      return { success: false, error: `${localeLabel(input.language)} ist die Ausgangssprache.` };
    }

    const linksResult = await listGameTasks(input.gameId);
    if (!linksResult.success) return { success: false, error: linksResult.error };
    const links = linksResult.data ?? [];
    const context = await loadRecipeOriginContext(supabase, game);
    const recipeBound = isRecipeCityShell(game, context.origin, context.isSource);
    const origin = context.origin;

    const openerSlots = openerSlotsFromLinks(links);
    const shellSlots = cityShellQuizSlots(links);
    const sourceSlots = sourceSlotsFromLinks(links);
    const units = recipeBound
      ? collectCityShellTranslationUnits({ game, slots: shellSlots })
      : collectTranslationUnits({
          game,
          slots: sourceSlots.map(({ linkId, source }) => ({ linkId, source })),
        });
    const existingCopy: GameLocaleCopy = recipeBound
      ? { name: game.translations[input.language]?.name ?? game.name, ...game.translations[input.language] }
      : { ...seedLocaleCopy(game), ...game.translations[input.language] };
    const slotCopies: Record<string, SlotLocaleCopy> = {};
    if (recipeBound) {
      for (const slot of shellSlots) {
        slotCopies[slot.linkId] = { quiz: slot.source.quiz };
      }
    } else {
      for (const slot of sourceSlots) {
        slotCopies[slot.linkId] = localesFromOverrides(slot.overrides)[input.language] ?? {};
      }
    }

    const toTranslate = units.filter(
      (unit) => unit.key !== "game:name" && isMachineTranslatableUnit(unit),
    );
    const translated =
      toTranslate.length > 0
        ? await translateUnitsNative({
            source: sourceLang,
            target: input.language,
            units: toTranslate,
          })
        : {};

    const applied = applyTranslationUnits({
      gameCopy: existingCopy,
      slotCopies,
      linkIds: (recipeBound ? shellSlots : sourceSlots).map((slot) => slot.linkId),
      values: translated,
    });
    const gameCopy: GameLocaleCopy = {
      ...(recipeBound ? existingCopy : applied.gameCopy),
      name: existingCopy.name,
      confirmed: parseConfirmed([
        ...parseConfirmed(existingCopy.confirmed).filter((key) =>
          recipeBound ? !key.includes(":quiz:") : true,
        ),
        ...Object.keys(translated),
      ]),
    };

    const openerByGeo = new Map(openerSlots.map((slot) => [slot.linkId, slot]));
    const saved = await saveGameLocale({
      gameId: input.gameId,
      language: input.language,
      copy: gameCopy,
      slots: recipeBound
        ? shellSlots.flatMap((slot) => {
            if (!slot.geoId) return [];
            const opener = openerByGeo.get(slot.geoId);
            return [
              {
                linkId: slot.geoId,
                copy: {
                  ...localesFromOverrides(opener?.overrides)[input.language],
                  quiz: applied.slotCopies[slot.linkId]?.quiz,
                },
              },
            ];
          })
        : buildGameSlots(links).flatMap((slot) => {
            const copy = applied.slotCopies[slot.levelLink.id] ?? {};
            const geo = layer1LinkForSlot(slot);
            const rows: Array<{ linkId: string; copy: SlotLocaleCopy }> = [
              {
                linkId: slot.levelLink.id,
                copy: {
                  ...copy,
                  quiz: localesFromOverrides(slot.levelLink.overrides)[input.language]?.quiz,
                },
              },
            ];
            if (geo) {
              rows.push({
                linkId: geo.id,
                copy: {
                  ...localesFromOverrides(geo.overrides)[input.language],
                  quiz: copy.quiz,
                },
              });
            }
            return rows;
          }),
    });
    if (!saved.success) return { success: false, error: saved.error };

    return {
      success: true,
      data: {
        game: saved.data!,
        copy: recipeBound
          ? {
              ...resolveSharedGameCopy(saved.data!, input.language, origin),
              confirmed: gameCopy.confirmed,
            }
          : gameCopy,
        slots: applied.slotCopies,
        translated: Object.keys(translated).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Übersetzung ist fehlgeschlagen.",
    };
  }
}

export async function duplicateGames(
  gameIds: string[],
  count: number,
): Promise<ActionResult<DuplicateGamesResult>> {
  try {
    const copies = Math.min(100, Math.max(1, Math.floor(count)));
    const uniqueIds = [...new Set(gameIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { success: false, error: "Keine Spiele ausgewählt." };
    }

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: games, error: fetchError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_template", false)
      .in("id", uniqueIds);

    if (fetchError) throw new Error(fetchError.message);

    const sourceById = new Map((games ?? []).map((g) => [g.id as string, g as StudioGame]));
    const createdIds: string[] = [];

    for (const gameId of uniqueIds) {
      const source = sourceById.get(gameId);
      if (!source) continue;

      for (let i = 1; i <= copies; i += 1) {
        const copy = await copyGameWithLinks(supabase, orgId, source, `COPY ${i} ${source.name}`);
        createdIds.push(copy.id);
      }
    }

    if (createdIds.length === 0) {
      return { success: false, error: "Keine Spiele zum Duplizieren gefunden." };
    }
    return { success: true, data: { createdIds, createdCount: createdIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Spiele konnten nicht dupliziert werden.",
    };
  }
}

export async function translateRecipeCityLocales(input: {
  recipeId: string;
  language: StudioLanguage;
  limit?: number;
}): Promise<ActionResult<{ processed: number; remaining: number; translatedFields: number; total: number }>> {
  try {
    if (!isStudioLanguage(input.language)) {
      return { success: false, error: "Diese Sprache wird noch nicht unterstützt." };
    }
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: recipe, error: recipeError } = await supabase
      .from("studio_compose_recipes")
      .select("id, origin_game_id")
      .eq("id", input.recipeId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (recipeError) throw new Error(recipeError.message);
    if (!recipe) return { success: false, error: "Rezept nicht gefunden." };

    const { data: rows, error } = await supabase
      .from("studio_games")
      .select("*")
      .eq("organization_id", orgId)
      .eq("compose_recipe_id", input.recipeId)
      .neq("is_template", true)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const originId = typeof recipe.origin_game_id === "string" ? recipe.origin_game_id : null;
    const pending = (rows ?? [])
      .map((row) => normalizeGameRow(row as StudioGame))
      .filter((game) => game.id !== originId && !isLocaleComplete(game, input.language));
    const limit = Math.min(4, Math.max(1, Math.floor(input.limit ?? 4)));
    const batch = pending.slice(0, limit);
    let translatedFields = 0;
    for (const game of batch) {
      const result = await translateGameLocale({ gameId: game.id, language: input.language });
      if (!result.success) {
        return { success: false, error: `${game.name}: ${result.error}` };
      }
      translatedFields += result.data?.translated ?? 0;
    }
    return {
      success: true,
      data: {
        processed: batch.length,
        remaining: Math.max(0, pending.length - batch.length),
        translatedFields,
        total: pending.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Städte konnten nicht übersetzt werden.",
    };
  }
}

export type GameStationCodeCard = {
  index: number;
  title: string;
  code: string;
};

export async function listGameStationCodes(
  gameId: string,
): Promise<ActionResult<{ gameName: string; cards: GameStationCodeCard[] }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: game, error: gameError } = await supabase
      .from("studio_games")
      .select("id, name, organization_id, runtime_profiles")
      .eq("id", gameId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (gameError) throw new Error(gameError.message);
    if (!game) return { success: false, error: "Spiel nicht gefunden." };
    if (parseRuntimeProfiles(game.runtime_profiles).default_mode !== "indoor") {
      return { success: false, error: "Codes gibt es nur bei Indoor-Spielen." };
    }

    const linksResult = await listGameTasks(gameId);
    if (!linksResult.success) {
      return { success: false, error: linksResult.error };
    }
    const slots = buildGameSlots(linksResult.data);
    const cards = slots.map((slot) => {
      const overrides = parseLinkOverrides(slot.levelLink.overrides);
      return {
        index: slot.index,
        title: slot.levelLink.task.title,
        code: resolveStationAccessCode(overrides.station?.code, `${gameId}:${slot.index}`),
      };
    });
    return { success: true, data: { gameName: game.name, cards } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Codes konnten nicht geladen werden.",
    };
  }
}
