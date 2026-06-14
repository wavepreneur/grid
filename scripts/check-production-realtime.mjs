/**
 * Production Realtime smoke test for gridos.vercel.app
 * Run: node scripts/check-production-realtime.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import ws from "ws";

const PRODUCTION_URL = "https://gridos.vercel.app";
const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  },
);

function randomCode(length) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

async function callServerAction(actionId, args, referer) {
  const response = await fetch(`${PRODUCTION_URL}${referer}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "Next-Action": actionId,
      Accept: "text/x-component",
    },
    body: JSON.stringify(args),
  });

  const text = await response.text();
  return { status: response.status, text };
}

async function getActionId(exportedName) {
  const manifest = JSON.parse(
    readFileSync(
      resolve(process.cwd(), ".next/server/server-reference-manifest.json"),
      "utf8",
    ),
  );

  for (const [id, entry] of Object.entries(manifest.node ?? {})) {
    if (entry.exportedName === exportedName) {
      return id;
    }
  }

  throw new Error(`Action ${exportedName} not found in manifest`);
}

async function main() {
  const results = [];

  results.push({
    check: "Production homepage",
    ok: (await fetch(PRODUCTION_URL)).status === 200,
  });

  const inviteCode = randomCode(8);
  const joinCode = randomCode(6);
  const sessionId = crypto.randomUUID();

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .insert({
      title: "Realtime Smoke Test",
      invite_code: inviteCode,
      status: "lobby",
    })
    .select("id")
    .single();

  if (eventError) throw eventError;

  const { data: team, error: teamError } = await supabaseAdmin
    .from("teams")
    .insert({
      event_id: event.id,
      join_code: joinCode,
      name: "Smoke Team",
      max_size: 4,
      department: "Engineering",
      region: "DACH",
      status: "lobby",
      lobby_opened_at: new Date().toISOString(),
      lobby_auto_start_at: new Date(Date.now() + 180000).toISOString(),
    })
    .select("id")
    .single();

  if (teamError) throw teamError;

  const { data: player, error: playerError } = await supabaseAdmin
    .from("players")
    .insert({
      team_id: team.id,
      session_id: sessionId,
      display_name: "SmokeBot",
      is_captain: true,
    })
    .select("id")
    .single();

  if (playerError) throw playerError;

  await supabaseAdmin
    .from("teams")
    .update({ captain_player_id: player.id })
    .eq("id", team.id);

  const tokenActionId = await getActionId("getRealtimeAccessToken");
  const tokenResponse = await callServerAction(
    tokenActionId,
    [sessionId],
    `/join/${inviteCode}/lobby/${joinCode}`,
  );

  const tokenPayloadMatch = tokenResponse.text.match(
    /"accessToken":"([^"]+)"/,
  );
  const tokenErrorMatch = tokenResponse.text.match(/"error":"([^"]+)"/);

  const hasJwtSecretError =
    tokenResponse.text.includes("SUPABASE_JWT_SECRET") ||
    tokenResponse.text.includes("Missing NEXT_PUBLIC_SUPABASE_URL");

  results.push({
    check: "Production getRealtimeAccessToken",
    ok: Boolean(tokenPayloadMatch) && !hasJwtSecretError,
    detail: tokenPayloadMatch
      ? "Token erhalten"
      : tokenErrorMatch?.[1] ?? tokenResponse.text.slice(0, 180),
  });

  if (!tokenPayloadMatch) {
    printResults(results);
    await cleanup(event.id, team.id);
    process.exit(1);
  }

  const accessToken = tokenPayloadMatch[1];
  const supabaseRealtime = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      realtime: { transport: ws },
    },
  );

  const realtimeResult = await new Promise((resolvePromise) => {
    let received = false;
    const timeout = setTimeout(() => {
      channel.unsubscribe();
      resolvePromise({ ok: false, detail: "Timeout nach 8s" });
    }, 8000);

    const channel = supabaseRealtime
      .channel(`smoke:${team.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teams",
          filter: `id=eq.${team.id}`,
        },
        () => {
          received = true;
          clearTimeout(timeout);
          channel.unsubscribe();
          resolvePromise({ ok: true, detail: "UPDATE empfangen" });
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await supabaseAdmin
            .from("teams")
            .update({ game_state: { version: 99, smoke: true } })
            .eq("id", team.id);
        }
        if (status === "CHANNEL_ERROR") {
          clearTimeout(timeout);
          channel.unsubscribe();
          resolvePromise({
            ok: false,
            detail: "CHANNEL_ERROR — RLS oder Realtime-Publication prüfen",
          });
        }
      });
  });

  results.push({
    check: "Supabase Realtime postgres_changes",
    ok: realtimeResult.ok,
    detail: realtimeResult.detail,
  });

  const lobbyActionId = await getActionId("getLobbySnapshot");
  const lobbyResponse = await callServerAction(
    lobbyActionId,
    [{ inviteCode, joinCode, sessionId }],
    `/join/${inviteCode}/lobby/${joinCode}`,
  );

  results.push({
    check: "Production getLobbySnapshot (service role server action)",
    ok: lobbyResponse.text.includes("Smoke Team"),
    detail: lobbyResponse.text.includes("Smoke Team")
      ? "Lobby-Daten OK"
      : lobbyResponse.text.slice(0, 180),
  });

  await cleanup(event.id, team.id);
  printResults(results);

  if (!results.every((item) => item.ok)) {
    process.exit(1);
  }
}

async function cleanup(eventId, teamId) {
  await supabaseAdmin.from("teams").delete().eq("id", teamId);
  await supabaseAdmin.from("events").delete().eq("id", eventId);
}

function printResults(results) {
  console.log("\n=== GRID Production Realtime Check ===\n");
  for (const item of results) {
    console.log(`${item.ok ? "✓" : "✗"} ${item.check}`);
    if (item.detail) console.log(`  → ${item.detail}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
