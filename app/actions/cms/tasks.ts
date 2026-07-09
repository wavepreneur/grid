"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  DEFAULT_TASK_CONTENT,
  slugifyStudio,
  type StudioTask,
  type StudioTaskContent,
  type TaskFilterInput,
} from "@/lib/cms/types";
import type { ActionResult } from "@/lib/grid/types";

function normalizeTaskContent(raw: unknown): StudioTaskContent {
  const base = { ...DEFAULT_TASK_CONTENT, ...(raw as StudioTaskContent) };
  return {
    ...base,
    tile: { ...DEFAULT_TASK_CONTENT.tile, ...base.tile },
    open_media: { ...DEFAULT_TASK_CONTENT.open_media, ...base.open_media },
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

    const { data, error } = await query.limit(200);
    if (error) throw new Error(error.message);

    const tasks = (data ?? []).map((row) => ({
      ...(row as StudioTask),
      content: normalizeTaskContent((row as StudioTask).content),
      tags: (row as StudioTask).tags ?? [],
    }));

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
      data: {
        ...(data as StudioTask),
        content: normalizeTaskContent((data as StudioTask).content),
        tags: (data as StudioTask).tags ?? [],
      },
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
        data: { ...(data as StudioTask), content: normalizeTaskContent(data.content) },
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
      data: { ...(data as StudioTask), content: normalizeTaskContent(data.content) },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Task konnte nicht gespeichert werden.",
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
