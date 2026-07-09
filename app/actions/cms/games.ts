"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  DEFAULT_TASK_CONTENT,
  slugifyStudio,
  type StudioBlueprint,
  type StudioGame,
  type StudioGameTaskLink,
  type StudioTask,
  type UpdateGameInput,
} from "@/lib/cms/types";
import {
  compileGameLogic,
  parseLogicRules,
  type StudioLogicRule,
} from "@/lib/cms/logic-rules";
import type { ActionResult } from "@/lib/grid/types";

export async function listBlueprints(): Promise<ActionResult<StudioBlueprint[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_blueprints")
      .select("*")
      .or(`organization_id.is.null,organization_id.eq.${orgId}`)
      .order("sort_order");

    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []) as StudioBlueprint[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Templates konnten nicht geladen werden.",
    };
  }
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
    return { success: true, data: (data ?? []) as StudioGame[] };
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
    return { success: true, data: (data ?? []) as StudioGame[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gespeicherte Templates konnten nicht geladen werden.",
    };
  }
}

export type CreateGameInput = {
  name: string;
  blueprint_id?: string | null;
  blank?: boolean;
};

export async function createGame(input: CreateGameInput): Promise<ActionResult<StudioGame>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    let blueprint: StudioBlueprint | null = null;
    if (input.blueprint_id) {
      const { data } = await supabase
        .from("studio_blueprints")
        .select("*")
        .eq("id", input.blueprint_id)
        .maybeSingle();
      blueprint = data as StudioBlueprint | null;
    }

    const slug = slugifyStudio(input.name);
    const preset = (blueprint?.preset_config ?? {}) as Record<string, unknown>;

    const payload = {
      organization_id: orgId,
      blueprint_id: blueprint?.id ?? null,
      slug,
      name: input.name.trim(),
      description: blueprint?.description ?? "",
      language: "de" as const,
      gps_enabled: Boolean(preset.gps_enabled ?? false),
      feature_flags: preset,
      logic_rules: blueprint?.preset_logic ?? [],
      status: "draft" as const,
    };

    const { data, error } = await supabase
      .from("studio_games")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    revalidatePath("/admin/games");
    return { success: true, data: data as StudioGame };
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
    return { success: true, data: data as StudioGame };
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
  };
}

export async function listGameTasks(gameId: string): Promise<ActionResult<StudioGameTaskLink[]>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_game_tasks")
      .select("id, game_id, task_id, sort_order, overrides, studio_tasks(*)")
      .eq("game_id", gameId)
      .order("sort_order");

    if (error) throw new Error(error.message);

    const links: StudioGameTaskLink[] = (data ?? []).flatMap((row) => {
      const r = row as {
        id: string;
        game_id: string;
        task_id: string;
        sort_order: number;
        overrides: Record<string, unknown>;
        studio_tasks: Record<string, unknown> | Record<string, unknown>[] | null;
      };
      const taskRaw = Array.isArray(r.studio_tasks) ? r.studio_tasks[0] : r.studio_tasks;
      if (!taskRaw) return [];
      return [
        {
          id: r.id,
          game_id: r.game_id,
          task_id: r.task_id,
          sort_order: r.sort_order,
          overrides: r.overrides ?? {},
          task: mapTaskRow(taskRaw),
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

    const { data, error } = await supabase
      .from("studio_games")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    revalidatePath(`/admin/games/${input.id}`);
    revalidatePath("/admin/games");
    return { success: true, data: data as StudioGame };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Game konnte nicht gespeichert werden.",
    };
  }
}

export async function addTaskToGame(
  gameId: string,
  taskId: string,
): Promise<ActionResult<StudioGameTaskLink>> {
  try {
    const supabase = createAdminClient();

    const { count, error: countError } = await supabase
      .from("studio_game_tasks")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId);

    if (countError) throw new Error(countError.message);

    const { data: existing } = await supabase
      .from("studio_game_tasks")
      .select("id")
      .eq("game_id", gameId)
      .eq("task_id", taskId)
      .maybeSingle();

    if (existing) return { success: false, error: "Task ist bereits im Game." };

    const { data: link, error: linkError } = await supabase
      .from("studio_game_tasks")
      .insert({
        game_id: gameId,
        task_id: taskId,
        sort_order: count ?? 0,
      })
      .select("id, game_id, task_id, sort_order, overrides")
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
      await Promise.all(
        remaining.map((row, index) =>
          supabase.from("studio_game_tasks").update({ sort_order: index }).eq("id", row.id),
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

    const game = gameResult.data;
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

export async function saveGameAsTemplate(gameId: string): Promise<ActionResult<StudioGame>> {
  try {
    const supabase = createAdminClient();
    const { data: game, error: fetchError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!game) return { success: false, error: "Game nicht gefunden." };

    const base = game as StudioGame;
    const templateSlug = `${base.slug}-tpl-${Date.now().toString(36)}`.slice(0, 64);

    const { data, error } = await supabase
      .from("studio_games")
      .insert({
        organization_id: base.organization_id,
        blueprint_id: base.blueprint_id,
        slug: templateSlug,
        name: `${base.name} (Template)`,
        logo_url: base.logo_url,
        description: base.description,
        language: base.language,
        city_slug: base.city_slug,
        duration_minutes: base.duration_minutes,
        gps_enabled: base.gps_enabled,
        farewell_text: base.farewell_text,
        feature_flags: base.feature_flags,
        logic_rules: base.logic_rules,
        is_template: true,
        status: "draft",
        published_version_number: 0,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const { data: sourceLinks } = await supabase
      .from("studio_game_tasks")
      .select("task_id, sort_order, overrides")
      .eq("game_id", gameId)
      .order("sort_order");

    if (sourceLinks?.length) {
      await supabase.from("studio_game_tasks").insert(
        sourceLinks.map((link) => ({
          game_id: data.id,
          task_id: link.task_id,
          sort_order: link.sort_order,
          overrides: link.overrides,
        })),
      );
    }

    revalidatePath("/admin/templates");
    return { success: true, data: data as StudioGame };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Template konnte nicht gespeichert werden.",
    };
  }
}
