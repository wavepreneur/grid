"use server";

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
  type TaskListPage,
  type TaskListSort,
} from "@/lib/cms/types";
import type { ActionResult } from "@/lib/tells/types";
import { normalizeTaskContent } from "@/lib/cms/task-content";
import { taskToOpenerArrivalQuiz } from "@/lib/cms/game-slots";
import { parseLinkOverrides } from "@/lib/cms/game-link-config";
import {
  clearQuizConfirmedFromTranslations,
  parseTranslations,
  stripLocaleQuizzesFromOverrides,
} from "@/lib/cms/game-i18n";
import { parseStudioLanguage } from "@/lib/cms/languages";

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

/**
 * Keep mission-link arrival_quiz snapshots in sync when a pool opener task changes.
 * Also drop other-locale quiz overlays so „Übersetzen“ uses the new German source
 * (city shells still had München-EN after pasting the real city DE).
 */
async function refreshOpenerQuizSnapshots(
  supabase: ReturnType<typeof createAdminClient>,
  opener: Pick<StudioTask, "id" | "title" | "description" | "content">,
): Promise<void> {
  const { data: links, error: linksError } = await supabase
    .from("studio_game_tasks")
    .select("id, game_id, overrides")
    .contains("overrides", { opener_task_id: opener.id });
  const { data: items, error: itemsError } = await supabase
    .from("studio_layer_pack_items")
    .select("id, pack_id, overrides")
    .contains("overrides", { opener_task_id: opener.id });

  const gameIds = new Set<string>();
  const packIds = new Set<string>();

  if (!linksError && links?.length) {
    for (const link of links) {
      if (typeof link.game_id === "string") gameIds.add(link.game_id);
    }
    await writeRefreshedOpenerSnapshots(supabase, "studio_game_tasks", links, opener);
  }
  if (!itemsError && items?.length) {
    for (const item of items) {
      if (typeof item.pack_id === "string") packIds.add(item.pack_id);
    }
    await writeRefreshedOpenerSnapshots(supabase, "studio_layer_pack_items", items, opener);
  }

  if (packIds.size > 0) {
    const { data: packGames } = await supabase
      .from("studio_games")
      .select("id")
      .in("layer1_pack_id", [...packIds]);
    for (const row of packGames ?? []) {
      if (typeof row.id === "string") gameIds.add(row.id);
    }
  }

  await clearOpenerQuizConfirmedOnGames(supabase, [...gameIds]);
}

async function writeRefreshedOpenerSnapshots(
  supabase: ReturnType<typeof createAdminClient>,
  table: "studio_game_tasks" | "studio_layer_pack_items",
  rows: Array<{ id: string; overrides: unknown }>,
  opener: Pick<StudioTask, "id" | "title" | "description" | "content">,
): Promise<void> {
  await Promise.all(
    rows.map(async (row) => {
      const overrides = parseLinkOverrides(row.overrides);
      if (overrides.opener_task_id !== opener.id) return;
      const quiz = taskToOpenerArrivalQuiz(
        {
          title: opener.title,
          description: opener.description ?? "",
          content: normalizeTaskContent(opener.content),
        },
        typeof overrides.opener_points === "number" ? overrides.opener_points : null,
      );
      if (!quiz) return;
      const nextOverrides = stripLocaleQuizzesFromOverrides({
        ...overrides,
        arrival_quiz: quiz,
      });
      await supabase.from(table).update({ overrides: nextOverrides }).eq("id", row.id);
    }),
  );
}

async function clearOpenerQuizConfirmedOnGames(
  supabase: ReturnType<typeof createAdminClient>,
  gameIds: string[],
): Promise<void> {
  const unique = [...new Set(gameIds.filter(Boolean))];
  if (unique.length === 0) return;
  const { data: games, error } = await supabase
    .from("studio_games")
    .select("id, language, translations")
    .in("id", unique);
  if (error || !games?.length) return;

  await Promise.all(
    games.map(async (game) => {
      const source = parseStudioLanguage(game.language);
      const updated = clearQuizConfirmedFromTranslations(
        parseTranslations(game.translations),
        source,
      );
      if (!updated) return;
      await supabase
        .from("studio_games")
        .update({ translations: updated, updated_at: new Date().toISOString() })
        .eq("id", game.id);
    }),
  );
}

function sanitizeTaskSearch(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

function taskListOrder(sort: TaskListSort | undefined): { column: string; ascending: boolean } {
  if (sort === "created") return { column: "created_at", ascending: false };
  if (sort === "name") return { column: "title", ascending: true };
  return { column: "updated_at", ascending: false };
}

export async function listTasks(
  filters: TaskFilterInput = {},
): Promise<ActionResult<TaskListPage>> {
  try {
    const orgId = filters.organizationId ?? (await getStudioOrganizationId());
    const supabase = createAdminClient();
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const page = Math.max(1, filters.page ?? 1);
    const from = (page - 1) * pageSize;
    const order = taskListOrder(filters.sort);
    let query = supabase
      .from("studio_tasks")
      .select(
        "id, organization_id, slug, title, description, language, tags, layer, content_context, role_assignment, content, created_at, updated_at, is_active",
        { count: "exact" },
      )
      .eq("is_active", true)
      .or(`organization_id.eq.${orgId},organization_id.is.null`);

    if (filters.language) query = query.eq("language", filters.language);
    if (filters.citySlug) query = query.eq("city_slug", filters.citySlug);
    if (filters.gameType) query = query.eq("game_type", filters.gameType);
    if (filters.layer) query = query.eq("layer", filters.layer);
    if (filters.contentContext) query = query.eq("content_context", filters.contentContext);
    const tag = filters.tag?.trim();
    if (tag) query = query.contains("tags", [tag]);
    const search = sanitizeTaskSearch(filters.search ?? "");
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order(order.column, { ascending: order.ascending })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);

    return {
      success: true,
      data: {
        tasks: (data ?? []).map((row) => normalizeTaskRow(row as StudioTask)),
        total: count ?? 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tasks konnten nicht geladen werden.",
    };
  }
}

export type TaskLibraryItem = {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  answer_type?: string;
};

export type TaskLibraryTagIndex = {
  tags: string[];
  sets: string[][];
};

const TASK_TAG_PAGE = 1000;
const TASK_TAG_SCAN_MAX = 50_000;

/** Distinct tags plus per-task sets (for AND-filters in Studio pickers). */
export async function listTaskLibraryTags(): Promise<ActionResult<TaskLibraryTagIndex>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const rows: Array<{ tags: string[] | null }> = [];
    for (let from = 0; from < TASK_TAG_SCAN_MAX; from += TASK_TAG_PAGE) {
      const { data, error } = await supabase
        .from("studio_tasks")
        .select("tags")
        .eq("is_active", true)
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .order("id", { ascending: true })
        .range(from, from + TASK_TAG_PAGE - 1);
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as Array<{ tags: string[] | null }>));
      if ((data ?? []).length < TASK_TAG_PAGE) break;
    }

    const unique = new Set<string>();
    const sets: string[][] = [];
    for (const row of rows) {
      const taskTags = [
        ...new Set(
          ((row.tags as string[] | null) ?? []).map((tag) => tag.trim()).filter(Boolean),
        ),
      ];
      if (taskTags.length === 0) continue;
      sets.push(taskTags);
      for (const tag of taskTags) unique.add(tag);
    }

    return {
      success: true,
      data: {
        tags: [...unique].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" })),
        sets,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Schlagworte konnten nicht geladen werden.",
    };
  }
}

const TASK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toLibraryItem(row: {
  id: unknown;
  title: unknown;
  slug: unknown;
  tags: unknown;
  content: unknown;
}): TaskLibraryItem {
  const content = row.content as { answer_type?: string } | null;
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    tags: (row.tags as string[]) ?? [],
    answer_type: content?.answer_type,
  };
}

/** Lightweight task search for the game logic sidebar — no full content payload. */
export async function searchTaskLibrary(input: {
  query?: string;
  tag?: string | null;
  tags?: string[] | null;
  limit?: number;
  /** Only choice / multi_choice tasks (Einstiegsfrage). */
  quizOnly?: boolean;
}): Promise<ActionResult<TaskLibraryItem[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const limit = Math.min(50, Math.max(1, input.limit ?? 30));
    // Over-fetch when filtering to quiz types client-side.
    const fetchLimit = input.quizOnly ? Math.min(100, limit * 4) : limit;
    const tags = [
      ...new Set(
        [...(input.tags ?? []), input.tag ?? ""]
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
    const q = input.query?.trim() ?? "";

    // Exact Task-ID: pin the canonical opener even when title duplicates exist.
    if (TASK_ID_RE.test(q)) {
      const { data, error } = await supabase
        .from("studio_tasks")
        .select("id, title, slug, tags, content")
        .eq("id", q)
        .eq("is_active", true)
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { success: true, data: [] };
      const item = toLibraryItem(data);
      if (
        input.quizOnly &&
        item.answer_type !== "choice" &&
        item.answer_type !== "multi_choice"
      ) {
        return { success: true, data: [] };
      }
      return { success: true, data: [item] };
    }

    let query = supabase
      .from("studio_tasks")
      .select("id, title, slug, tags, content")
      .eq("is_active", true)
      .or(`organization_id.eq.${orgId},organization_id.is.null`)
      .order("updated_at", { ascending: false })
      .limit(fetchLimit);

    for (const tag of tags) {
      query = query.contains("tags", [tag]);
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,slug.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let items = (data ?? []).map((row) => toLibraryItem(row));

    if (input.quizOnly) {
      items = items
        .filter((t) => t.answer_type === "choice" || t.answer_type === "multi_choice")
        .slice(0, limit);
    }

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Aufgaben-Suche fehlgeschlagen.",
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

function friendlyTaskConstraintError(message: string): string {
  if (/studio_tasks_org_slug_key|duplicate key/i.test(message)) {
    return "Eine andere Aufgabe verwendet denselben internen Namen. Bitte erneut speichern.";
  }
  return message;
}

export async function upsertTask(input: TaskUpsertInput): Promise<ActionResult<StudioTask>> {
  try {
    const organizationId = input.organization_scoped !== false
      ? await getStudioOrganizationId()
      : null;

    const payload = {
      organization_id: organizationId,
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

      if (error) throw new Error(friendlyTaskConstraintError(error.message));

      // Refresh frozen arrival_quiz snapshots that use this task as Einstiegsfrage.
      await refreshOpenerQuizSnapshots(supabase, {
        id: data.id as string,
        title: data.title as string,
        description: (data.description as string) ?? "",
        content: normalizeTaskContent(data.content),
      });
      return {
        success: true,
        data: normalizeTaskRow(data as StudioTask),
      };
    }

    const slug =
      (input.slug && slugifyStudio(input.slug)) ||
      (await ensureUniqueTaskSlug(supabase, organizationId, input.title));
    if (!slug) return { success: false, error: "Slug ist ungültig." };

    const { data, error } = await supabase
      .from("studio_tasks")
      .insert({ ...payload, slug })
      .select("*")
      .single();

    if (error) throw new Error(friendlyTaskConstraintError(error.message));
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
        const title = `COPY ${i} ${source.title}`;
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
    return { success: true, data: { id: taskId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Task konnte nicht archiviert werden.",
    };
  }
}
