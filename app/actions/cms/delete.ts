"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  buildGameDeleteStatus,
  buildTaskDeleteStatus,
  fetchVersionIdsForGames,
  LIVE_EVENT_STATUSES,
  type BulkDeleteGamesResult,
  type BulkDeleteTasksResult,
  type GameDeleteStatus,
  type TaskDeleteStatus,
  type TaskGameUsage,
  type TaskLiveGameLink,
} from "@/lib/cms/delete-status";
import type { ActionResult } from "@/lib/grid/types";
import type { StudioGameStatus } from "@/lib/cms/types";

type JoinedGame = {
  id: string;
  name: string;
  status: StudioGameStatus;
  published_version_number: number;
};

function asJoinedGame(raw: unknown): JoinedGame | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first || typeof first !== "object") return null;
    return first as JoinedGame;
  }
  if (typeof raw === "object") return raw as JoinedGame;
  return null;
}

async function fetchTasksGameLinks(taskIds: string[]): Promise<{
  linksByTask: Map<string, Array<{ id: string; game_id: string; task_id: string; studio_games: unknown }>>;
  liveEventsByGame: Map<string, Array<{ id: string; title: string; invite_code: string; status: string }>>;
}> {
  const supabase = createAdminClient();

  const { data: links, error: linksError } = await supabase
    .from("studio_game_tasks")
    .select("id, game_id, task_id, studio_games(id, name, status, published_version_number, organization_id)")
    .in("task_id", taskIds);

  if (linksError) throw new Error(linksError.message);

  const gameIds = [
    ...new Set(
      (links ?? []).map((row) => asJoinedGame(row.studio_games)?.id).filter(Boolean) as string[],
    ),
  ];

  const versionMap = await fetchVersionIdsForGames(supabase, gameIds);
  const allVersionIds = [...versionMap.values()].flat();

  const versionToGame = new Map<string, string>();
  for (const [gameId, versionIds] of versionMap.entries()) {
    for (const versionId of versionIds) {
      versionToGame.set(versionId, gameId);
    }
  }

  const { data: liveRows, error: liveError } = await supabase
    .from("events")
    .select("id, title, invite_code, status, studio_game_version_id")
    .in(
      "studio_game_version_id",
      allVersionIds.length ? allVersionIds : ["00000000-0000-0000-0000-000000000000"],
    )
    .in("status", [...LIVE_EVENT_STATUSES]);

  if (liveError) throw new Error(liveError.message);

  const liveEventsByGame = new Map<string, Array<{ id: string; title: string; invite_code: string; status: string }>>();
  for (const row of liveRows ?? []) {
    const gameId = versionToGame.get(row.studio_game_version_id as string);
    if (!gameId) continue;
    const list = liveEventsByGame.get(gameId) ?? [];
    list.push({
      id: row.id as string,
      title: (row.title as string) || "Live-Event",
      invite_code: row.invite_code as string,
      status: row.status as string,
    });
    liveEventsByGame.set(gameId, list);
  }

  const linksByTask = new Map<string, typeof links>();
  for (const row of links ?? []) {
    const taskId = row.task_id as string;
    const list = linksByTask.get(taskId) ?? [];
    list.push(row);
    linksByTask.set(taskId, list);
  }

  return { linksByTask, liveEventsByGame };
}

function buildTaskGamesFromLinks(
  taskLinks: Array<{ id: string; studio_games: unknown }>,
  liveEventsByGame: Map<string, Array<{ id: string; title: string; invite_code: string; status: string }>>,
): TaskLiveGameLink[] {
  const games: TaskLiveGameLink[] = [];
  for (const row of taskLinks) {
    const game = asJoinedGame(row.studio_games);
    if (!game) continue;
    const liveEvents = liveEventsByGame.get(game.id) ?? [];
    games.push({
      linkId: row.id as string,
      gameId: game.id,
      gameName: game.name,
      gameStatus: game.status,
      publishedVersionNumber: game.published_version_number,
      liveEvents,
    });
  }
  return games.sort((a, b) => {
    const liveDiff = b.liveEvents.length - a.liveEvents.length;
    if (liveDiff !== 0) return liveDiff;
    return a.gameName.localeCompare(b.gameName, "de", { sensitivity: "base" });
  });
}

export async function getGameDeleteStatus(gameId: string): Promise<ActionResult<GameDeleteStatus>> {
  try {
    const statuses = await getGamesDeleteStatus([gameId]);
    if (!statuses.success) return statuses;
    const status = statuses.data!.find((s) => s.gameId === gameId);
    if (!status) return { success: false, error: "Spiel nicht gefunden." };
    return { success: true, data: status };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Status konnte nicht geladen werden.",
    };
  }
}

export async function getGamesDeleteStatus(
  gameIds: string[],
): Promise<ActionResult<GameDeleteStatus[]>> {
  try {
    if (gameIds.length === 0) return { success: true, data: [] };

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: games, error: gamesError } = await supabase
      .from("studio_games")
      .select("id")
      .eq("organization_id", orgId)
      .in("id", gameIds);

    if (gamesError) throw new Error(gamesError.message);

    const allowedIds = new Set((games ?? []).map((g) => g.id as string));
    const versionMap = await fetchVersionIdsForGames(supabase, [...allowedIds]);

    const allVersionIds = [...versionMap.values()].flat();

    const versionToGame = new Map<string, string>();
    for (const [gameId, versionIds] of versionMap.entries()) {
      for (const versionId of versionIds) {
        versionToGame.set(versionId, gameId);
      }
    }

    const { data: liveRows, error: liveError } = await supabase
      .from("events")
      .select("id, title, invite_code, status, studio_game_version_id")
      .in(
        "studio_game_version_id",
        allVersionIds.length ? allVersionIds : ["00000000-0000-0000-0000-000000000000"],
      )
      .in("status", [...LIVE_EVENT_STATUSES]);

    if (liveError) throw new Error(liveError.message);

    const liveEventsByGame = new Map<string, Array<{ id: string; title: string; invite_code: string; status: string }>>();
    for (const row of liveRows ?? []) {
      const gameId = versionToGame.get(row.studio_game_version_id as string);
      if (!gameId) continue;
      const list = liveEventsByGame.get(gameId) ?? [];
      list.push({
        id: row.id as string,
        title: (row.title as string) || "Live-Event",
        invite_code: row.invite_code as string,
        status: row.status as string,
      });
      liveEventsByGame.set(gameId, list);
    }

    const { data: pools, error: poolsError } = await supabase
      .from("studio_ticket_pools")
      .select("game_id")
      .in("game_id", [...allowedIds])
      .eq("status", "active");

    if (poolsError) throw new Error(poolsError.message);

    const activePoolsByGame = new Map<string, number>();
    for (const pool of pools ?? []) {
      const gameId = pool.game_id as string;
      activePoolsByGame.set(gameId, (activePoolsByGame.get(gameId) ?? 0) + 1);
    }

    const result = gameIds.map((gameId) => {
      if (!allowedIds.has(gameId)) {
        return {
          gameId,
          liveEvents: [],
          activeTicketPools: 0,
          canDelete: false,
          blockReason: "Spiel nicht gefunden oder keine Berechtigung.",
        } satisfies GameDeleteStatus;
      }
      return buildGameDeleteStatus(
        gameId,
        liveEventsByGame.get(gameId) ?? [],
        activePoolsByGame.get(gameId) ?? 0,
      );
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Status konnte nicht geladen werden.",
    };
  }
}

export async function takeGamesOffline(gameIds: string[]): Promise<ActionResult<{ gameIds: string[] }>> {
  try {
    if (gameIds.length === 0) return { success: true, data: { gameIds: [] } };

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: games, error: gamesError } = await supabase
      .from("studio_games")
      .select("id")
      .eq("organization_id", orgId)
      .in("id", gameIds);

    if (gamesError) throw new Error(gamesError.message);

    const allowedIds = (games ?? []).map((g) => g.id as string);
    const versionMap = await fetchVersionIdsForGames(supabase, allowedIds);
    const allVersionIds = [...versionMap.values()].flat();

    if (allVersionIds.length > 0) {
      const { error: eventsError } = await supabase
        .from("events")
        .update({ status: "archived" })
        .in("studio_game_version_id", allVersionIds)
        .in("status", [...LIVE_EVENT_STATUSES]);

      if (eventsError) throw new Error(eventsError.message);
    }

    const { error: poolsError } = await supabase
      .from("studio_ticket_pools")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .in("game_id", allowedIds)
      .eq("status", "active");

    if (poolsError) throw new Error(poolsError.message);

    revalidatePath("/admin/games");
    return { success: true, data: { gameIds: allowedIds } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Offline-Stellen fehlgeschlagen.",
    };
  }
}

export async function deleteGames(gameIds: string[]): Promise<ActionResult<BulkDeleteGamesResult>> {
  try {
    if (gameIds.length === 0) {
      return { success: true, data: { deletedIds: [], failed: [] } };
    }

    const statusResult = await getGamesDeleteStatus(gameIds);
    if (!statusResult.success) {
      return { success: false, error: statusResult.error };
    }

    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const deletedIds: string[] = [];
    const failed: BulkDeleteGamesResult["failed"] = [];

    for (const status of statusResult.data!) {
      if (!status.canDelete) {
        failed.push({ id: status.gameId, error: status.blockReason ?? "Löschen blockiert.", status });
        continue;
      }

      const { error } = await supabase
        .from("studio_games")
        .delete()
        .eq("id", status.gameId)
        .eq("organization_id", orgId);

      if (error) {
        failed.push({ id: status.gameId, error: error.message, status });
        continue;
      }
      deletedIds.push(status.gameId);
    }

    revalidatePath("/admin/games");
    revalidatePath("/admin/games");
    return { success: true, data: { deletedIds, failed } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Spiele konnten nicht gelöscht werden.",
    };
  }
}

export async function getTaskGameUsage(taskId: string): Promise<ActionResult<TaskGameUsage>> {
  try {
    const result = await getTasksGameUsage([taskId]);
    if (!result.success) return { success: false, error: result.error };
    const usage = result.data!.find((u) => u.taskId === taskId);
    if (!usage) return { success: false, error: "Aufgabe nicht gefunden." };
    return { success: true, data: usage };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verwendung konnte nicht geladen werden.",
    };
  }
}

export async function getTasksGameUsage(taskIds: string[]): Promise<ActionResult<TaskGameUsage[]>> {
  try {
    if (taskIds.length === 0) return { success: true, data: [] };

    const { linksByTask, liveEventsByGame } = await fetchTasksGameLinks(taskIds);

    const result = taskIds.map((taskId) => {
      const taskLinks = linksByTask.get(taskId) ?? [];
      const games = buildTaskGamesFromLinks(taskLinks, liveEventsByGame);
      const liveGameCount = games.filter((g) => g.liveEvents.length > 0).length;
      return {
        taskId,
        games,
        liveGameCount,
        totalGameCount: games.length,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verwendung konnte nicht geladen werden.",
    };
  }
}

export async function getTasksDeleteStatus(
  taskIds: string[],
): Promise<ActionResult<TaskDeleteStatus[]>> {
  try {
    if (taskIds.length === 0) return { success: true, data: [] };

    const usageResult = await getTasksGameUsage(taskIds);
    if (!usageResult.success) {
      return { success: false, error: usageResult.error };
    }

    const result = usageResult.data!.map((usage) =>
      buildTaskDeleteStatus(usage.taskId, usage.games),
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Status konnte nicht geladen werden.",
    };
  }
}

export async function removeTaskFromLiveGames(
  taskId: string,
): Promise<ActionResult<{ removedLinkIds: string[] }>> {
  try {
    const statusResult = await getTasksDeleteStatus([taskId]);
    if (!statusResult.success) return { success: false, error: statusResult.error };

    const status = statusResult.data![0];
    if (!status) return { success: false, error: "Aufgabe nicht gefunden." };

    const linkIds = status.liveGameLinks.map((l) => l.linkId);
    if (linkIds.length === 0) {
      return { success: true, data: { removedLinkIds: [] } };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("studio_game_tasks").delete().in("id", linkIds);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/tasks");
    revalidatePath("/admin/games");
    return { success: true, data: { removedLinkIds: linkIds } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Entfernen fehlgeschlagen.",
    };
  }
}

async function removeAllTaskGameLinks(taskId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("studio_game_tasks").delete().eq("task_id", taskId);
  if (error) throw new Error(error.message);
}

export async function deleteTasks(taskIds: string[]): Promise<ActionResult<BulkDeleteTasksResult>> {
  try {
    if (taskIds.length === 0) {
      return { success: true, data: { deletedIds: [], failed: [] } };
    }

    const statusResult = await getTasksDeleteStatus(taskIds);
    if (!statusResult.success) {
      return { success: false, error: statusResult.error };
    }

    const supabase = createAdminClient();
    const deletedIds: string[] = [];
    const failed: BulkDeleteTasksResult["failed"] = [];

    for (const status of statusResult.data!) {
      if (!status.canDelete) {
        failed.push({ id: status.taskId, error: status.blockReason ?? "Löschen blockiert.", status });
        continue;
      }

      try {
        await removeAllTaskGameLinks(status.taskId);
        const { error } = await supabase
          .from("studio_tasks")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", status.taskId);

        if (error) throw new Error(error.message);
        deletedIds.push(status.taskId);
      } catch (err) {
        failed.push({
          id: status.taskId,
          error: err instanceof Error ? err.message : "Löschen fehlgeschlagen.",
          status,
        });
      }
    }

    revalidatePath("/admin/tasks");
    revalidatePath("/admin/games");
    return { success: true, data: { deletedIds, failed } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Aufgaben konnten nicht gelöscht werden.",
    };
  }
}

export async function removeTasksFromLiveGames(
  taskIds: string[],
): Promise<ActionResult<{ taskIds: string[]; removedCount: number }>> {
  try {
    let removedCount = 0;
    for (const taskId of taskIds) {
      const result = await removeTaskFromLiveGames(taskId);
      if (!result.success) return result;
      removedCount += result.data!.removedLinkIds.length;
    }
    return { success: true, data: { taskIds, removedCount } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Entfernen fehlgeschlagen.",
    };
  }
}
