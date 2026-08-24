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
import { parseBonusBindings } from "@/lib/cms/bonus-bindings";
import { surfaceToPreset, taskToOpenerArrivalQuiz } from "@/lib/cms/game-slots";
import { normalizeTaskContent } from "@/lib/cms/task-content";
import {
  compileGameLogic,
  parseLogicRules,
  type StudioLogicRule,
} from "@/lib/cms/logic-rules";
import type { ActionResult } from "@/lib/grid/types";
import type { ContentMode } from "@/lib/cms/layer-model";

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
  /** Player surface chosen at create time. */
  surface?: "outdoor" | "indoor" | "online";
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
      language: "de" as const,
      gps_enabled: preset.gpsEnabled,
      active_layers: [...preset.activeLayers],
      runtime_profiles,
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
  },
): Promise<ActionResult<StudioGameTaskLink>> {
  try {
    const orgId = await getStudioOrganizationId();
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
          patch.opener_points !== undefined
            ? patch.opener_points
            : (overrides.opener_points ?? null);

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
            error:
              "Einstiegs-Aufgabe muss Multiple Choice sein (eine oder mehrere richtige Antworten).",
          };
        }

        overrides.opener_task_id = patch.opener_task_id;
        overrides.arrival_quiz = quiz;
        if (typeof pointsOverride === "number") {
          overrides.opener_points = Math.max(0, Math.round(pointsOverride));
        } else {
          delete overrides.opener_points;
        }
      } else {
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
        // Keep legacy pointer on first for older readers
        overrides.bonus_task_id = patch.bonus_bindings[0]!.task_id;
      } else {
        delete overrides.bonus_bindings;
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

    const { error: updateError } = await supabase
      .from("studio_game_tasks")
      .update({ overrides })
      .eq("id", linkId)
      .eq("game_id", gameId);

    if (updateError) throw new Error(updateError.message);

    // Bindings alone are not enough — compile only sees tasks linked on the game.
    // Auto-attach missing bonus pool tasks as Layer 3 so „Ganzes Team“ actually fires.
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
        const copy = await copyGameWithLinks(supabase, orgId, source, `COPY ${i} ${source.name}`);
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
