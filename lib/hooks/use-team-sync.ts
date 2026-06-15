"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { getRealtimeAccessToken } from "@/app/actions/realtime";
import { cacheTeamState, loadCachedTeamState } from "@/lib/grid/offline-state";
import {
  parseTeamGameState,
  type TeamGameState,
  type TeamSyncEvent,
} from "@/lib/grid/game-state";
import type { LobbyPlayer } from "@/lib/grid/types";

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
};

export function useTeamSync({
  sessionId,
  teamId,
  playerId,
  enabled = true,
  onTeamStatusChange,
  onGameStateChange,
  onSyncEvent,
  onPlayersChange,
  onSessionSuperseded,
}: UseTeamSyncOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);

  const onTeamStatusChangeRef = useRef(onTeamStatusChange);
  const onGameStateChangeRef = useRef(onGameStateChange);
  const onSyncEventRef = useRef(onSyncEvent);
  const onPlayersChangeRef = useRef(onPlayersChange);
  const onSessionSupersededRef = useRef(onSessionSuperseded);

  onTeamStatusChangeRef.current = onTeamStatusChange;
  onGameStateChangeRef.current = onGameStateChange;
  onSyncEventRef.current = onSyncEvent;
  onPlayersChangeRef.current = onPlayersChange;
  onSessionSupersededRef.current = onSessionSuperseded;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function connect() {
      setError(null);

      const tokenResult = await getRealtimeAccessToken(sessionId);
      if (cancelled) return;

      if (!tokenResult.success) {
        setError(tokenResult.error);
        return;
      }

      const { accessToken } = tokenResult.data;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        },
      );

      await supabase.realtime.setAuth(accessToken);

      clientRef.current = supabase;

      const cached = loadCachedTeamState(teamId);
      if (cached) {
        onGameStateChangeRef.current?.(cached.gameState, cached.currentLevel);
        onTeamStatusChangeRef.current?.(cached.status);
      }

      let channelBuilder = supabase.channel(`team-sync:${teamId}`).on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "teams",
            filter: `id=eq.${teamId}`,
          },
          (payload) => {
            const row = payload.new as TeamRow;
            const gameState = parseTeamGameState(row.game_state);
            const nextState = {
              teamId: row.id,
              status: row.status,
              currentLevel: row.current_level,
              gameState,
              startedAt: row.started_at,
              lobbyAutoStartAt: row.lobby_auto_start_at,
              isCaptain: cached?.isCaptain,
            };

            cacheTeamState(nextState);
            onTeamStatusChangeRef.current?.(row.status);
            onGameStateChangeRef.current?.(gameState, row.current_level);
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
          async () => {
            const { data } = await supabase
              .from("players")
              .select("id, display_name, is_captain, joined_at, left_at")
              .eq("team_id", teamId)
              .is("left_at", null)
              .order("joined_at", { ascending: true });

            if (data) {
              onPlayersChangeRef.current?.(
                data.map((player: PlayerRow) => ({
                  id: player.id,
                  display_name: player.display_name,
                  is_captain: player.is_captain,
                  joined_at: player.joined_at,
                })),
              );
            }
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
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
          }
          if (status === "CHANNEL_ERROR") {
            setError("Realtime-Verbindung fehlgeschlagen.");
            setIsConnected(false);
          }
        });

      channelRef.current = channel;
    }

    connect();

    return () => {
      cancelled = true;
      setIsConnected(false);
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      clientRef.current = null;
    };
  }, [enabled, playerId, sessionId, teamId]);

  return { isConnected, error };
}
