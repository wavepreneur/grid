"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  DEFAULT_TASK_CONTENT,
  slugifyStudio,
  type StudioGame,
  type StudioGameTaskLink,
  type StudioTask,
  type UpdateGameInput,
} from "@/lib/cms/types";
import {
  DEFAULT_RUNTIME_PROFILES,
  buildLayerSnapshotMeta,
  parseActiveLayers,
  parseRuntimeProfiles,
  type StudioLayer,
} from "@/lib/cms/layer-model";
import type { BonusTrigger, GameLinkOverrides } from "@/lib/cms/game-link-config";
import { parseLinkLayer } from "@/lib/cms/game-link-config";
import {
  compileGameLogic,
  parseLogicRules,
  type StudioLogicRule,
} from "@/lib/cms/logic-rules";
import type { ActionResult } from "@/lib/grid/types";

function normalizeGameRow(row: StudioGame): StudioGame {
  return {
    ...(row as StudioGame),
    active_layers: parseActiveLayers((row as StudioGame).active_layers),
    runtime_profiles: parseRuntimeProfiles((row as StudioGame).runtime_profiles),
    logic_rules: (row as StudioGame).logic_rules ?? [],
  };
}

export async function listGames(): Promise<ActionResult<StudioGame[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_games")
      .select("*")
      .eq("organization_id", orgId)
      .neq("is_template", true)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return {
      success: true,
      data: (data ?? []).map((row) => normalizeGameRow(row as StudioGame)),
    };
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
};

async function ensureUniqueGameSlug(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  name: string,
): Promise<string> {
  const base = slugifyStudio(name) || "spiel";
  let candidate = base;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const { data } = await supabase
      .from("studio_games")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${attempt + 2}`.slice(0, 64);
  }
  return `${base}-${Date.now()}`.slice(0, 64);
}

export async function createGame(input: CreateGameInput): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const slug = await ensureUniqueGameSlug(supabase, orgId, input.name);

    const payload = {
      organization_id: orgId,
      blueprint_id: null,
      slug,
      name: input.name.trim(),
      description: "",
      language: "de" as const,
      gps_enabled: false,
      active_layers: [2, 3],
      runtime_profiles: DEFAULT_RUNTIME_PROFILES,
      feature_flags: {},
      logic_rules: [],
      status: "draft" as const,
    };

    const { data, error } = await supabase
      .from("studio_games")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    revalidatePath("/admin/games");
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
    return { success: true, data: normalizeGameRow(data as StudioGame) };
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

export async function listGameTasks(gameId: string): Promise<ActionResult<StudioGameTaskLink[]>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_game_tasks")
      .select("id, game_id, task_id, layer, sort_order, overrides, studio_tasks(*)")
      .eq("game_id", gameId)
      .order("sort_order");

    if (error) throw new Error(error.message);

    const links: StudioGameTaskLink[] = (data ?? []).flatMap((row) => {
      const r = row as {
        id: string;
        game_id: string;
        task_id: string;
        layer?: number;
        sort_order: number;
        overrides: Record<string, unknown>;
        studio_tasks: Record<string, unknown> | Record<string, unknown>[] | null;
      };
      const taskRaw = Array.isArray(r.studio_tasks) ? r.studio_tasks[0] : r.studio_tasks;
      if (!taskRaw) return [];
      const partial = {
        id: r.id,
        game_id: r.game_id,
        task_id: r.task_id,
        sort_order: r.sort_order,
        overrides: r.overrides ?? {},
        layer: (r.layer === 1 || r.layer === 2 || r.layer === 3 ? r.layer : 2) as StudioLayer,
        task: mapTaskRow(taskRaw),
      };
      return [
        {
          ...partial,
          layer: parseLinkLayer(partial),
        },
      ];
    });

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
      payload.slug = slugifyStudio(input.name);
    }
    if (input.description !== undefined) payload.description = input.description.trim();
    if (input.language !== undefined) payload.language = input.language;
    if (input.city_slug !== undefined) payload.city_slug = input.city_slug;
    if (input.duration_minutes !== undefined) payload.duration_minutes = input.duration_minutes;
    if (input.gps_enabled !== undefined) payload.gps_enabled = input.gps_enabled;
    if (input.farewell_text !== undefined) payload.farewell_text = input.farewell_text.trim();
    if (input.logo_url !== undefined) payload.logo_url = input.logo_url;
    if (input.feature_flags !== undefined) payload.feature_flags = input.feature_flags;
    if (input.logic_rules !== undefined) payload.logic_rules = parseLogicRules(input.logic_rules);
    if (input.active_layers !== undefined) payload.active_layers = input.active_layers;
    if (input.runtime_profiles !== undefined) payload.runtime_profiles = input.runtime_profiles;

    const { data, error } = await supabase
      .from("studio_games")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    revalidatePath(`/admin/games/${input.id}`);
    revalidatePath("/admin/games");
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

    const { data: link, error: linkError } = await supabase
      .from("studio_game_tasks")
      .insert({
        game_id: gameId,
        task_id: taskId,
        layer,
        sort_order: count ?? 0,
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

    revalidatePath(`/admin/games/${gameId}`);
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

    revalidatePath(`/admin/games/${gameId}`);
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

    const tasksResult = await listGameTasks(gameId);
    if (!tasksResult.success) {
      return { success: false, error: tasksResult.error };
    }
    const link = tasksResult.data?.find((l) => l.id === linkId);
    if (!link) return { success: false, error: "Task nach Update nicht gefunden." };

    revalidatePath(`/admin/games/${gameId}`);
    return { success: true, data: link };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Wegpunkt konnte nicht gespeichert werden.",
    };
  }
}

export async function updateGameTaskLinkConfig(
  gameId: string,
  linkId: string,
  patch: {
    location?: { lat: number; lng: number; radius_meters: number } | null;
    role?: GameLinkOverrides["role"];
    trigger?: BonusTrigger | null;
  },
): Promise<ActionResult<StudioGameTaskLink>> {
  try {
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from("studio_game_tasks")
      .select("id, overrides")
      .eq("id", linkId)
      .eq("game_id", gameId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return { success: false, error: "Task-Zuweisung nicht gefunden." };

    const overrides: GameLinkOverrides = {
      ...(((existing as { overrides: GameLinkOverrides }).overrides ?? {}) as GameLinkOverrides),
    };

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

    const { error: updateError } = await supabase
      .from("studio_game_tasks")
      .update({ overrides })
      .eq("id", linkId)
      .eq("game_id", gameId);

    if (updateError) throw new Error(updateError.message);

    const tasksResult = await listGameTasks(gameId);
    if (!tasksResult.success) {
      return { success: false, error: tasksResult.error };
    }
    const link = tasksResult.data?.find((l) => l.id === linkId);
    if (!link) return { success: false, error: "Task nach Update nicht gefunden." };

    revalidatePath(`/admin/games/${gameId}`);
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
    revalidatePath(`/admin/games/${gameId}`);
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
    revalidatePath(`/admin/games/${gameId}`);
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
    const compiled = compileGameLogic({
      game,
      links: tasksResult.data ?? [],
      rules,
    });

    const nextVersion = game.published_version_number + 1;
    const snapshot = {
      game,
      tasks: tasksResult.data ?? [],
      logic_rules: rules,
      compiled_logic: compiled,
      levels: compiled.levels,
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

    revalidatePath("/admin/games");
    revalidatePath(`/admin/games/${gameId}`);
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

    revalidatePath("/admin/games");
    revalidatePath(`/admin/games/${gameId}`);
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

    revalidatePath("/admin/games");
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

    revalidatePath("/admin/games");
    revalidatePath(`/admin/games/${gameId}`);
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

    revalidatePath("/admin/games");
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
  const slug = await ensureUniqueGameSlug(supabase, orgId, name);

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
      city_slug: source.city_slug,
      duration_minutes: source.duration_minutes,
      gps_enabled: source.gps_enabled,
      farewell_text: source.farewell_text,
      feature_flags: source.feature_flags,
      logic_rules: source.logic_rules,
      active_layers: source.active_layers,
      runtime_profiles: source.runtime_profiles,
      is_template: false,
      status: "draft",
      published_version_number: 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

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

  return data as StudioGame;
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
        const copy = await copyGameWithLinks(supabase, orgId, source, `${i} ${source.name}`);
        createdIds.push(copy.id);
      }
    }

    if (createdIds.length === 0) {
      return { success: false, error: "Keine Spiele zum Duplizieren gefunden." };
    }

    revalidatePath("/admin/games");
    return { success: true, data: { createdIds, createdCount: createdIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Spiele konnten nicht dupliziert werden.",
    };
  }
}
