"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { getCockpitRealtimeAccessToken } from "@/app/actions/realtime";

type UseCockpitSyncOptions = {
  inviteCode: string;
  enabled?: boolean;
  onUpdate?: () => void;
};

export function useCockpitSync({
  inviteCode,
  enabled = true,
  onUpdate,
}: UseCockpitSyncOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    function scheduleUpdate() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdateRef.current?.();
      }, 300);
    }

    async function connect() {
      setError(null);

      const tokenResult = await getCockpitRealtimeAccessToken(inviteCode);
      if (cancelled) return;

      if (!tokenResult.success) {
        setError(tokenResult.error);
        return;
      }

      const { accessToken, eventId } = tokenResult.data;

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

      const channel = supabase
        .channel(`cockpit-sync:${eventId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teams",
            filter: `event_id=eq.${eventId}`,
          },
          () => scheduleUpdate(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
          },
          () => scheduleUpdate(),
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
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setIsConnected(false);
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      clientRef.current = null;
    };
  }, [enabled, inviteCode]);

  return { isConnected, error };
}
