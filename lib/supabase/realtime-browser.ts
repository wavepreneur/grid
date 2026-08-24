import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * One browser Realtime client for the play session.
 * Creating a new GoTrueClient per reconnect floods the console and can drop
 * postgres_changes (lobby stuck after start, roles not updating).
 */
let realtimeClient: SupabaseClient | null = null;
let realtimeSessionKey: string | null = null;

export function getPlayRealtimeClient(input: {
  sessionId: string;
  accessToken: string;
}): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase-Env fehlt (URL / Anon-Key).");
  }

  const sessionKey = input.sessionId;
  if (realtimeClient && realtimeSessionKey === sessionKey) {
    void realtimeClient.realtime.setAuth(input.accessToken);
    return realtimeClient;
  }

  // Session changed — drop the previous client so auth storage does not collide.
  realtimeClient = null;
  realtimeSessionKey = sessionKey;

  realtimeClient = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `grid-play-realtime:${sessionKey}`,
    },
    global: {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  });

  void realtimeClient.realtime.setAuth(input.accessToken);
  return realtimeClient;
}

export async function disposePlayRealtimeClient(): Promise<void> {
  const client = realtimeClient;
  realtimeClient = null;
  realtimeSessionKey = null;
  if (!client) return;
  try {
    await client.removeAllChannels();
  } catch {
    /* ignore */
  }
}
