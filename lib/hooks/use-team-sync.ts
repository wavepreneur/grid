"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { getRealtimeAccessToken } from "@/app/actions/realtime";
import { cacheTeamState } from "@/lib/grid/offline-state";
import {
  parseTeamGameState,
  type TeamGameState,
  type TeamSyncEvent,
} from "@/lib/grid/game-state";
import type { LobbyPlayer } from "@/lib/grid/types";
import { getPlayRealtimeClient } from "@/lib/supabase/realtime-browser";

type UseTeamSyncOptions = {
  sessionId: string;
  teamId: string;
  playerId?: string;
  enabled?: boolean;
  onTeamStatusChange?: (status: string) => void;
  onGameStateChange?: (gameState: TeamGameState, currentLevel: number) => void;
  onSyncEvent?: (event: TeamSyncEvent) => void;
  onPlayersChange?: (players: LobbyPlayer[]) => void;
  onSessionSuperseded?: () => void;
  /** Fired after Realtime is SUBSCRIBED again (e.g. after phone wake) — pull fresh state. */
  onResynced?: () => void;
  /** Lobby-only: show or drop the start overlay before the team is playing. */
  onStartOverlay?: (action: "show" | "hide") => void;
  /** Live walk meters from the tracking device — not a full game_state pull. */
  onWalkMeters?: (level: number, walkedMeters: number) => void;
  /** Live GPS pin from the team-lead device — teammates mirror, no server poll. */
  onGpsFix?: (fix: GpsFixPayload) => void;
  /**
   * lobby: status + start/lead only (do not parse game_state).
   * play: live solves. Default play so a missing flag cannot mute in-game sync.
   */
  surface?: "lobby" | "play";
};

export type TeamBroadcastPayload = {
  type:
    | TeamSyncEvent["event_type"]
    | "game_started"
    | "game_starting"
    | "start_aborted"
    | "captain_transferred"
    | "walk_meters"
    | "gps_fix";
  new_captain_id?: string;
  previous_captain_id?: string;
  started_at?: string;
  seq?: number;
  player_count?: number;
  level?: number;
  walked_meters?: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  distance_m?: number;
  within_radius?: boolean;
  health_radius_bonus_m?: number;
};

export type GpsFixPayload = {
  level: number;
  lat: number;
  lng: number;
  accuracy?: number | null;
  distance_m: number;
  within_radius: boolean;
  health_radius_bonus_m?: number;
};

type TeamRow = {
  id: string;
  status: string;
  current_level: number;
  game_state: unknown;
  started_at: string | null;
  lobby_auto_start_at: string | null;
};

type PlayerRow = {
  id: string;
  display_name: string;
  is_captain: boolean;
  joined_at: string;
  left_at: string | null;
  session_id?: string;
  role?: string | null;
};

type TeamRoleRow = {
  beta_player_id: string | null;
  navigator_player_id: string | null;
  captain_player_id: string | null;
};

function toLobbyPlayers(rows: PlayerRow[], team: TeamRoleRow | null): LobbyPlayer[] {
  return rows.map((player) => {
    const role = player.role ?? null;
    const isAlpha = team?.captain_player_id
      ? team.captain_player_id === player.id
      : player.is_captain || role === "alpha";
    const isBeta = !isAlpha && (role === "beta" || team?.beta_player_id === player.id);
    const archetype_role = isAlpha ? "alpha" : isBeta ? "beta" : "gamma";

    return {
      id: player.id,
      display_name: player.display_name,
      is_captain: isAlpha,
      joined_at: player.joined_at,
      role: (role as LobbyPlayer["role"]) ?? undefined,
      is_navigator: isAlpha || team?.navigator_player_id === player.id,
      is_alpha: isAlpha,
      is_beta: isBeta,
      is_gamma: archetype_role === "gamma",
      archetype_role,
    };
  });
}

async function loadActiveLobbyPlayers(
  supabase: SupabaseClient,
  teamId: string,
): Promise<LobbyPlayer[]> {
  const [{ data: team }, { data: players }] = await Promise.all([
    supabase
      .from("teams")
      .select("beta_player_id, navigator_player_id, captain_player_id")
      .eq("id", teamId)
      .maybeSingle(),
    supabase
      .from("players")
      .select("id, display_name, is_captain, joined_at, left_at, role")
      .eq("team_id", teamId)
      .is("left_at", null)
      .order("joined_at", { ascending: true }),
  ]);

  if (!players) return [];
  return toLobbyPlayers(players as PlayerRow[], (team as TeamRoleRow | null) ?? null);
}

/**
 * Team Realtime sync with wake/reconnect.
 * Phone sleep often drops the socket — we reconnect quietly; play actions still work via REST.
 */
export function useTeamSync({
  sessionId,
  teamId,
  playerId,
  enabled = true,
  surface = "play",
  onTeamStatusChange,
  onGameStateChange,
  onSyncEvent,
  onPlayersChange,
  onSessionSuperseded,
  onResynced,
  onStartOverlay,
  onWalkMeters,
  onGpsFix,
}: UseTeamSyncOptions) {
  const [isConnected, setIsConnected] = useState(false);
  /** Soft status for wake/reconnect — not a hard failure. */
  const [statusHint, setStatusHint] = useState<string | null>(null);
  /** Hard failures (auth/token) that need attention. */
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);

  const onTeamStatusChangeRef = useRef(onTeamStatusChange);
  const onGameStateChangeRef = useRef(onGameStateChange);
  const onSyncEventRef = useRef(onSyncEvent);
  const onPlayersChangeRef = useRef(onPlayersChange);
  const onSessionSupersededRef = useRef(onSessionSuperseded);
  const onResyncedRef = useRef(onResynced);
  const onStartOverlayRef = useRef(onStartOverlay);
  const onWalkMetersRef = useRef(onWalkMeters);
  const onGpsFixRef = useRef(onGpsFix);

  onTeamStatusChangeRef.current = onTeamStatusChange;
  onGameStateChangeRef.current = onGameStateChange;
  onSyncEventRef.current = onSyncEvent;
  onPlayersChangeRef.current = onPlayersChange;
  onSessionSupersededRef.current = onSessionSuperseded;
  onResyncedRef.current = onResynced;
  onStartOverlayRef.current = onStartOverlay;
  onWalkMetersRef.current = onWalkMeters;
  onGpsFixRef.current = onGpsFix;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let playerReloadTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let connecting = false;
    let subscribed = false;

    async function teardown() {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      subscribed = false;
      if (playerReloadTimer) {
        clearTimeout(playerReloadTimer);
        playerReloadTimer = null;
      }
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) {
        try {
          await channel.unsubscribe();
        } catch {
          /* ignore */
        }
      }
      clientRef.current = null;
    }

    function scheduleRetry() {
      if (cancelled) return;
      attempt += 1;
      subscribed = false;
      const delayMs = Math.min(1000 * 2 ** Math.min(attempt - 1, 4), 12_000);
      setIsConnected(false);
      setStatusHint(
        attempt <= 2
          ? "Verbindung wird wiederhergestellt…"
          : "Team-Sync kurz unterbrochen — du kannst weiterspielen.",
      );
      setError(null);
      retryTimer = setTimeout(() => {
        void connect();
      }, delayMs);
    }

    async function connect() {
      if (cancelled || connecting) return;
      connecting = true;

      await teardown();
      if (cancelled) {
        connecting = false;
        return;
      }

      setError(null);
      if (attempt > 0) {
        setStatusHint("Verbindung wird wiederhergestellt…");
      }

      const tokenResult = await getRealtimeAccessToken(sessionId);
      if (cancelled) {
        connecting = false;
        return;
      }

      if (!tokenResult.success) {
        if (/Session ungültig/i.test(tokenResult.error ?? "")) {
          onSessionSupersededRef.current?.();
          connecting = false;
          return;
        }
        setError(tokenResult.error);
        setIsConnected(false);
        connecting = false;
        scheduleRetry();
        return;
      }

      const { accessToken } = tokenResult.data;

      const supabase = getPlayRealtimeClient({
        sessionId,
        accessToken,
      });
      if (cancelled) {
        connecting = false;
        return;
      }

      clientRef.current = supabase;

      const reloadPlayersSoon = () => {
        if (playerReloadTimer) clearTimeout(playerReloadTimer);
        playerReloadTimer = setTimeout(() => {
          void loadActiveLobbyPlayers(supabase, teamId).then((players) => {
            if (!cancelled) onPlayersChangeRef.current?.(players);
          });
        }, 80);
      };

      let channelBuilder = supabase
        .channel(`grid-team:${teamId}`, {
          config: { broadcast: { ack: true, self: false } },
        })
        .on("broadcast", { event: "grid" }, (msg) => {
          const payload = (msg.payload ?? {}) as TeamBroadcastPayload;
          if (payload.type === "walk_meters") {
            if (
              typeof payload.level === "number" &&
              typeof payload.walked_meters === "number"
            ) {
              onWalkMetersRef.current?.(payload.level, payload.walked_meters);
            }
            return;
          }
          if (payload.type === "gps_fix") {
            if (
              typeof payload.level === "number" &&
              typeof payload.lat === "number" &&
              typeof payload.lng === "number" &&
              typeof payload.distance_m === "number"
            ) {
              onGpsFixRef.current?.({
                level: payload.level,
                lat: payload.lat,
                lng: payload.lng,
                accuracy: payload.accuracy,
                distance_m: payload.distance_m,
                within_radius: Boolean(payload.within_radius),
                health_radius_bonus_m:
                  typeof payload.health_radius_bonus_m === "number"
                    ? payload.health_radius_bonus_m
                    : undefined,
              });
            }
            return;
          }
          if (payload.type === "game_starting") {
            onStartOverlayRef.current?.("show");
            return;
          }
          if (payload.type === "start_aborted") {
            onStartOverlayRef.current?.("hide");
            return;
          }
          if (payload.type === "game_started" || payload.type === "game_finished") {
            onSyncEventRef.current?.({
              id: "broadcast",
              team_id: teamId,
              sequence: 0,
              event_type: payload.type,
              level: null,
              payload: {
                started_at: payload.started_at ?? null,
                player_count: payload.player_count ?? null,
              },
              actor_player_id: null,
              created_at: new Date().toISOString(),
            });
            return;
          }
          if (payload.type === "captain_transferred") {
            onSyncEventRef.current?.({
              id: "broadcast",
              team_id: teamId,
              sequence: 0,
              event_type: "captain_transferred",
              level: null,
              payload: {
                new_captain_id: payload.new_captain_id,
                previous_captain_id: payload.previous_captain_id,
                seq: payload.seq ?? null,
              },
              actor_player_id: null,
              created_at: new Date().toISOString(),
            });
          }
        })
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "teams",
            filter: `id=eq.${teamId}`,
          },
        (payload) => {
          const row = payload.new as TeamRow;
          onTeamStatusChangeRef.current?.(row.status);
          if (surface === "lobby") return;

          // Incomplete Realtime payloads must not become a fresh level-1 stub.
          const rawState = row.game_state;
          const rawVersion =
            rawState && typeof rawState === "object" && !Array.isArray(rawState)
              ? (rawState as { version?: unknown }).version
              : undefined;
          if (
            !rawState ||
            typeof rawState !== "object" ||
            Array.isArray(rawState) ||
            !("levels" in rawState) ||
            typeof row.current_level !== "number" ||
            typeof rawVersion !== "number"
          ) {
            onResyncedRef.current?.();
            return;
          }

          const gameState = parseTeamGameState(rawState);
          const nextState = {
            teamId: row.id,
            status: row.status,
            currentLevel: row.current_level,
            gameState,
            startedAt: row.started_at,
            lobbyAutoStartAt: row.lobby_auto_start_at,
          };

          cacheTeamState(nextState);
          onGameStateChangeRef.current?.(gameState, row.current_level);
          reloadPlayersSoon();
        },
      );

      if (playerId) {
        channelBuilder = channelBuilder.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "players",
            filter: `id=eq.${playerId}`,
          },
          (payload) => {
            const row = payload.new as PlayerRow;
            if (row.session_id && row.session_id !== sessionId) {
              onSessionSupersededRef.current?.();
            }
          },
        );
      }

      const channel = channelBuilder
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `team_id=eq.${teamId}`,
          },
          () => {
            reloadPlayersSoon();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "team_sync_events",
            filter: `team_id=eq.${teamId}`,
          },
          (payload) => {
            onSyncEventRef.current?.(payload.new as TeamSyncEvent);
          },
        )
        .subscribe((status) => {
          if (cancelled) return;

          if (status === "SUBSCRIBED") {
            attempt = 0;
            subscribed = true;
            setIsConnected(true);
            setStatusHint(null);
            setError(null);
            connecting = false;
            void loadActiveLobbyPlayers(supabase, teamId).then((players) => {
              if (!cancelled) onPlayersChangeRef.current?.(players);
            });
            onResyncedRef.current?.();
            return;
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            subscribed = false;
            connecting = false;
            setIsConnected(false);
            scheduleRetry();
          }
        });

      channelRef.current = channel;
      connecting = false;
    }

    function resumeIfNeeded() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      // Healthy channel: soft pull only — full reconnect was thrashing desktop UI.
      if (subscribed && channelRef.current) {
        onResyncedRef.current?.();
        return;
      }
      attempt = 0;
      void connect();
    }

    void connect();

    document.addEventListener("visibilitychange", resumeIfNeeded);
    window.addEventListener("online", resumeIfNeeded);
    window.addEventListener("pageshow", resumeIfNeeded);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", resumeIfNeeded);
      window.removeEventListener("online", resumeIfNeeded);
      window.removeEventListener("pageshow", resumeIfNeeded);
      void teardown();
      setIsConnected(false);
    };
  }, [enabled, playerId, sessionId, surface, teamId]);

  const broadcast = useCallback((payload: TeamBroadcastPayload) => {
    const channel = channelRef.current;
    if (!channel) return Promise.resolve("error" as const);
    return channel.send({ type: "broadcast", event: "grid", payload });
  }, []);

  return { isConnected, statusHint, error, broadcast };
}
