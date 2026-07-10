"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  parseContentContext,
  parseRoleAssignment,
} from "@/lib/cms/layer-model";
import {
  DEFAULT_TASK_CONTENT,
  slugifyStudio,
  type StudioTask,
  type StudioTaskContent,
  type TaskFilterInput,
} from "@/lib/cms/types";
import type { ActionResult } from "@/lib/grid/types";

import { normalizeTaskContent } from "@/lib/cms/task-content";

function normalizeTaskRow(row: StudioTask): StudioTask {
  return {
    ...(row as StudioTask),
    content: normalizeTaskContent((row as StudioTask).content),
    tags: (row as StudioTask).tags ?? [],
    layer: (row as StudioTask).layer ?? 2,
    content_context: parseContentContext((row as StudioTask).content_context),
    role_assignment: parseRoleAssignment((row as StudioTask).role_assignment),
  };
}

export async function listTasks(filters: TaskFilterInput = {}): Promise<ActionResult<StudioTask[]>> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("studio_tasks")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (filters.organizationId) {
      query = query.or(
        `organization_id.eq.${filters.organizationId},organization_id.is.null`,
      );
    }

    if (filters.language) query = query.eq("language", filters.language);
    if (filters.citySlug) query = query.eq("city_slug", filters.citySlug);
    if (filters.gameType) query = query.eq("game_type", filters.gameType);
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,slug.ilike.%${q}%`);
    }

    if (filters.layer) query = query.eq("layer", filters.layer);
    if (filters.contentContext) query = query.eq("content_context", filters.contentContext);

    const { data, error } = await query.limit(200);
    if (error) throw new Error(error.message);

    const tasks = (data ?? []).map((row) => normalizeTaskRow(row as StudioTask));

    return { success: true, data: tasks };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tasks konnten nicht geladen werden.",
    };
  }
}

export async function getTask(taskId: string): Promise<ActionResult<StudioTask>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: "Task nicht gefunden." };

    return {
      success: true,
      data: normalizeTaskRow(data as StudioTask),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Task konnte nicht geladen werden.",
    };
  }
}

export type TaskUpsertInput = {
  id?: string;
  title: string;
  description?: string;
  slug?: string;
  language?: "de" | "en";
  city_slug?: string | null;
  game_type?: string | null;
  tags?: string[];
  content?: StudioTaskContent;
  layer?: import("@/lib/cms/layer-model").StudioLayer;
  content_context?: import("@/lib/cms/layer-model").ContentContext;
  role_assignment?: import("@/lib/cms/layer-model").RoleAssignment;
  organization_scoped?: boolean;
};

export async function upsertTask(input: TaskUpsertInput): Promise<ActionResult<StudioTask>> {
  try {
    const organizationId = input.organization_scoped !== false
      ? await getStudioOrganizationId()
      : null;

    const slug = slugifyStudio(input.slug || input.title);
    if (!slug) return { success: false, error: "Slug ist ungültig." };

    const payload = {
      organization_id: organizationId,
      slug,
      title: input.title.trim(),
      description: (input.description ?? "").trim(),
      language: input.language ?? "de",
      city_slug: input.city_slug?.trim() || null,
      game_type: input.game_type?.trim() || null,
      tags: input.tags ?? [],
      content: normalizeTaskContent(input.content ?? DEFAULT_TASK_CONTENT),
      layer: input.layer ?? 2,
      content_context: input.content_context ?? "any",
      role_assignment: input.role_assignment ?? "team",
      updated_at: new Date().toISOString(),
    };

    const supabase = createAdminClient();

    if (input.id) {
      const { data, error } = await supabase
        .from("studio_tasks")
        .update(payload)
        .eq("id", input.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      revalidatePath("/admin/tasks");
      return {
        success: true,
        data: normalizeTaskRow(data as StudioTask),
      };
    }

    const { data, error } = await supabase
      .from("studio_tasks")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    revalidatePath("/admin/tasks");
    return {
      success: true,
      data: normalizeTaskRow(data as StudioTask),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Task konnte nicht gespeichert werden.",
    };
  }
}

async function ensureUniqueTaskSlug(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string | null,
  name: string,
): Promise<string> {
  const base = slugifyStudio(name) || "aufgabe";
  let candidate = base;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let query = supabase.from("studio_tasks").select("id").eq("slug", candidate);
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    } else {
      query = query.is("organization_id", null);
    }
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${attempt + 2}`.slice(0, 64);
  }
  return `${base}-${Date.now()}`.slice(0, 64);
}

export type DuplicateTasksResult = {
  createdIds: string[];
  createdCount: number;
};

export async function duplicateTasks(
  taskIds: string[],
  count: number,
): Promise<ActionResult<DuplicateTasksResult>> {
  try {
    const copies = Math.min(100, Math.max(1, Math.floor(count)));
    const uniqueIds = [...new Set(taskIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { success: false, error: "Keine Aufgaben ausgewählt." };
    }

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: tasks, error: fetchError } = await supabase
      .from("studio_tasks")
      .select("*")
      .eq("is_active", true)
      .in("id", uniqueIds);

    if (fetchError) throw new Error(fetchError.message);

    const sourceById = new Map((tasks ?? []).map((t) => [t.id as string, t as StudioTask]));
    const createdIds: string[] = [];

    for (const taskId of uniqueIds) {
      const source = sourceById.get(taskId);
      if (!source) continue;

      for (let i = 1; i <= copies; i += 1) {
        const title = `${i} ${source.title}`;
        const slug = await ensureUniqueTaskSlug(supabase, source.organization_id ?? orgId, title);

        const { data, error } = await supabase
          .from("studio_tasks")
          .insert({
            organization_id: source.organization_id ?? orgId,
            slug,
            title,
            description: source.description,
            language: source.language,
            city_slug: source.city_slug,
            game_type: source.game_type,
            tags: source.tags ?? [],
            content: normalizeTaskContent(source.content),
            layer: source.layer ?? 2,
            content_context: source.content_context ?? "any",
            role_assignment: source.role_assignment ?? "team",
            is_active: true,
          })
          .select("*")
          .single();

        if (error) throw new Error(error.message);
        createdIds.push((data as StudioTask).id);
      }
    }

    if (createdIds.length === 0) {
      return { success: false, error: "Keine Aufgaben zum Duplizieren gefunden." };
    }

    revalidatePath("/admin/tasks");
    return { success: true, data: { createdIds, createdCount: createdIds.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Aufgaben konnten nicht dupliziert werden.",
    };
  }
}

export async function archiveTask(taskId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("studio_tasks")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) throw new Error(error.message);
    revalidatePath("/admin/tasks");
    return { success: true, data: { id: taskId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Task konnte nicht archiviert werden.",
    };
  }
}
