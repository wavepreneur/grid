import type { createAdminClient } from "@/lib/supabase/admin";

export const LIVE_EVENT_STATUSES = ["lobby", "active"] as const;

export type LiveEventSummary = {
  id: string;
  title: string;
  invite_code: string;
  status: string;
};

export type GameDeleteStatus = {
  gameId: string;
  liveEvents: LiveEventSummary[];
  activeTicketPools: number;
  ticketPoolCount: number;
  canDelete: boolean;
  blockReason: string | null;
};

export type TaskLiveGameLink = {
  linkId: string;
  gameId: string;
  gameName: string;
  gameStatus: "draft" | "published" | "archived";
  publishedVersionNumber: number;
  liveEvents: LiveEventSummary[];
};

export type TaskGameUsage = {
  taskId: string;
  games: TaskLiveGameLink[];
  liveGameCount: number;
  totalGameCount: number;
};

export type TaskDeleteStatus = {
  taskId: string;
  draftGameNames: string[];
  liveGameLinks: TaskLiveGameLink[];
  games: TaskLiveGameLink[];
  canDelete: boolean;
  blockReason: string | null;
};

export type BulkDeleteGamesResult = {
  deletedIds: string[];
  failed: Array<{ id: string; error: string; status?: GameDeleteStatus }>;
};

export type BulkDeleteTasksResult = {
  deletedIds: string[];
  failed: Array<{ id: string; error: string; status?: TaskDeleteStatus }>;
};

export async function fetchVersionIdsForGames(
  supabase: ReturnType<typeof createAdminClient>,
  gameIds: string[],
): Promise<Map<string, string[]>> {
  if (gameIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("studio_game_versions")
    .select("id, game_id")
    .in("game_id", gameIds);

  if (error) throw new Error(error.message);

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const gameId = row.game_id as string;
    const versionId = row.id as string;
    const list = map.get(gameId) ?? [];
    list.push(versionId);
    map.set(gameId, list);
  }
  return map;
}

export async function fetchLiveEventsByVersionIds(
  supabase: ReturnType<typeof createAdminClient>,
  versionIds: string[],
): Promise<LiveEventSummary[]> {
  if (versionIds.length === 0) return [];

  const { data, error } = await supabase
    .from("events")
    .select("id, title, invite_code, status, studio_game_version_id")
    .in("studio_game_version_id", versionIds)
    .in("status", [...LIVE_EVENT_STATUSES]);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: (row.title as string) || "Live-Event",
    invite_code: row.invite_code as string,
    status: row.status as string,
  }));
}

export function buildGameDeleteStatus(
  gameId: string,
  liveEvents: LiveEventSummary[],
  activeTicketPools: number,
  ticketPoolCount: number,
): GameDeleteStatus {
  if (liveEvents.length > 0) {
    return {
      gameId,
      liveEvents,
      activeTicketPools,
      ticketPoolCount,
      canDelete: false,
      blockReason: `Dieses Spiel hat ${liveEvents.length} laufende Live-Event(s). Stelle es zuerst offline.`,
    };
  }
  if (activeTicketPools > 0) {
    return {
      gameId,
      liveEvents,
      activeTicketPools,
      ticketPoolCount,
      canDelete: false,
      blockReason: `Dieses Spiel hat ${activeTicketPools} aktive Ticket-Pools. Stelle sie zuerst offline.`,
    };
  }
  return {
    gameId,
    liveEvents,
    activeTicketPools,
    ticketPoolCount,
    canDelete: true,
    blockReason: null,
  };
}

export function buildTaskDeleteStatus(
  taskId: string,
  games: TaskLiveGameLink[],
): TaskDeleteStatus {
  const liveGameLinks = games.filter((g) => g.liveEvents.length > 0);
  const draftGameNames = games
    .filter((g) => g.liveEvents.length === 0)
    .map((g) => g.gameName);

  if (liveGameLinks.length > 0) {
    const names = liveGameLinks.map((l) => l.gameName).join(", ");
    return {
      taskId,
      draftGameNames,
      liveGameLinks,
      games,
      canDelete: false,
      blockReason: `Diese Aufgabe ist in laufenden Spielen enthalten (${names}). Entferne sie dort zuerst.`,
    };
  }
  return {
    taskId,
    draftGameNames,
    liveGameLinks,
    games,
    canDelete: true,
    blockReason: null,
  };
}
