"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import { HEALTH_NEAR_STUCK_MS } from "@/lib/grid/cockpit-health";
import { parseTeamGameState } from "@/lib/grid/game-state";
import type { ActionResult } from "@/lib/grid/types";

const HEALING_ACTIONS = [
  "outdoor_force_unlock",
  "outdoor_hub_arrive",
  "session_recovered",
  "session_handoff",
  "session_handover",
  "session_device_switch",
  "session_takeover",
] as const;

const HUMAN_ACTIONS = [
  "operator_gps_disabled",
  "operator_gps_enabled",
  "operator_navigator_set",
] as const;

const TELEMETRY_ACTIONS = ["play_attempt_ok", "play_attempt_failed"] as const;

export type CockpitHealthFlag = "ok" | "haengt" | "hilfe";

export type CockpitOverviewPlayer = {
  name: string;
  isCaptain: boolean;
  isNavigator: boolean;
};

export type CockpitOverviewSession = {
  teamId: string;
  teamName: string;
  joinCode: string;
  inviteCode: string;
  eventTitle: string;
  status: string;
  currentLevel: number;
  currentPhase: string | null;
  score: number;
  flag: CockpitHealthFlag;
  players: CockpitOverviewPlayer[];
};

export type CockpitHealingRow = {
  id: string;
  at: string;
  teamName: string;
  eventTitle: string;
  rule: string;
  signal: string;
  intervention: string;
  status: "geloest" | "aktiv";
};

export type CockpitTelemetryRow = {
  id: string;
  at: string;
  ok: boolean;
  teamName: string;
  playerName: string;
  role: string | null;
  stage: string;
  input: string;
};

export type OrgCockpitOverview = {
  liveSessionCount: number;
  humanInterventions: number;
  autoInterventions: number;
  autoHealed: number;
  autoActive: number;
  selfHealingPct: number | null;
  sessions: CockpitOverviewSession[];
  healing: CockpitHealingRow[];
  telemetry: CockpitTelemetryRow[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roleLabel(role: string | null): string | null {
  if (!role) return null;
  const lower = role.toLowerCase();
  if (lower.includes("alpha")) return "Alpha";
  if (lower.includes("beta")) return "Beta";
  if (lower.includes("gamma")) return "Gamma";
  return role;
}

function describeHealing(action: string, payload: Record<string, unknown>): {
  rule: string;
  signal: string;
  intervention: string;
} {
  const level = asNumber(payload.level);
  const bonus = asNumber(payload.health_radius_bonus_m) ?? 0;

  if (action === "outdoor_hub_arrive" && bonus > 0) {
    return {
      rule: "GPS-Signal fällt aus",
      signal: `Lead-Gerät knapp außerhalb · Aufgabe ${level ?? "—"}`,
      intervention: `Radius automatisch um ${bonus} m erweitert`,
    };
  }
  if (action === "outdoor_force_unlock") {
    return {
      rule: "Aufgabe blockiert (kein Fortschritt)",
      signal: `Hub hängt · Aufgabe ${level ?? "—"} · ${asString(payload.mode) ?? "Unlock"}`,
      intervention: "Fallback-Unlock ausgelöst",
    };
  }
  if (action === "session_recovered") {
    return {
      rule: "Netzstörung / Reconnect",
      signal: "Session war unterbrochen",
      intervention: "Offline-Puffer / Restore geladen",
    };
  }
  if (
    action === "session_handoff" ||
    action === "session_handover" ||
    action === "session_takeover" ||
    action === "session_device_switch"
  ) {
    return {
      rule: "Netzstörung / Reconnect",
      signal: "Gerätewechsel oder Handoff",
      intervention: "Session ohne Operator weitergeführt",
    };
  }
  return {
    rule: action,
    signal: "System-Signal",
    intervention: "automatisch verarbeitet",
  };
}

function sessionFlag(input: {
  status: string;
  currentPhase: string | null;
  levelStartedAt: string | null;
  recentForceUnlock: boolean;
  recentRadiusHeal: boolean;
}): CockpitHealthFlag {
  if (input.status !== "playing") return "ok";
  const started = input.levelStartedAt ? Date.parse(input.levelStartedAt) : Number.NaN;
  const hangingHub =
    input.currentPhase === "hub" &&
    Number.isFinite(started) &&
    Date.now() - started > HEALTH_NEAR_STUCK_MS;
  if (hangingHub) return "haengt";
  if (input.recentForceUnlock || input.recentRadiusHeal) return "hilfe";
  return "ok";
}

export async function getOrgCockpitOverview(): Promise<ActionResult<OrgCockpitOverview>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, invite_code, status, updated_at")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(40);

    if (eventsError) throw new Error(eventsError.message);

    const eventRows = events ?? [];
    const eventById = new Map(eventRows.map((event) => [event.id as string, event]));
    const eventIds = eventRows.map((event) => event.id as string);

    if (eventIds.length === 0) {
      return {
        success: true,
        data: {
          liveSessionCount: 0,
          humanInterventions: 0,
          autoInterventions: 0,
          autoHealed: 0,
          autoActive: 0,
          selfHealingPct: null,
          sessions: [],
          healing: [],
          telemetry: [],
        },
      };
    }

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select(
        "id, name, event_id, join_code, status, current_level, game_state, navigator_player_id, captain_player_id, updated_at",
      )
      .in("event_id", eventIds)
      .in("status", ["lobby", "playing", "finished"])
      .order("updated_at", { ascending: false })
      .limit(80);

    if (teamsError) throw new Error(teamsError.message);

    const teamRows = teams ?? [];
    const teamIds = teamRows.map((team) => team.id as string);
    const teamById = new Map(teamRows.map((team) => [team.id as string, team]));

    const { data: players } = teamIds.length
      ? await supabase
          .from("players")
          .select("id, team_id, display_name, is_captain, left_at")
          .in("team_id", teamIds)
          .is("left_at", null)
      : { data: [] };

    type PlayerRow = {
      id: string;
      team_id: string;
      display_name: string;
      is_captain: boolean;
      left_at: string | null;
    };
    const playersByTeam = new Map<string, PlayerRow[]>();
    for (const player of (players ?? []) as PlayerRow[]) {
      const list = playersByTeam.get(player.team_id) ?? [];
      list.push(player);
      playersByTeam.set(player.team_id, list);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs, error: logsError } = await supabase
      .from("audit_logs")
      .select("id, action, team_id, event_id, created_at, payload")
      .eq("organization_id", orgId)
      .in("action", [...HEALING_ACTIONS, ...HUMAN_ACTIONS, ...TELEMETRY_ACTIONS])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(120);

    if (logsError) throw new Error(logsError.message);

    const logRows = logs ?? [];
    const forceUnlockTeams = new Set<string>();
    const radiusHealTeams = new Set<string>();
    const healing: CockpitHealingRow[] = [];

    for (const row of logRows) {
      const action = row.action as string;
      const payload = asRecord(row.payload);
      const team = teamById.get((row.team_id as string) ?? "");
      const event =
        eventById.get((row.event_id as string) ?? "") ??
        (team ? eventById.get(team.event_id as string) : undefined);

      if (action === "outdoor_force_unlock" && row.team_id) {
        forceUnlockTeams.add(row.team_id as string);
      }
      if (
        action === "outdoor_hub_arrive" &&
        (asNumber(payload.health_radius_bonus_m) ?? 0) > 0 &&
        row.team_id
      ) {
        radiusHealTeams.add(row.team_id as string);
      }

      const isHeal =
        HEALING_ACTIONS.includes(action as (typeof HEALING_ACTIONS)[number]) &&
        (action !== "outdoor_hub_arrive" || (asNumber(payload.health_radius_bonus_m) ?? 0) > 0);
      if (!isHeal || healing.length >= 12) continue;

      const described = describeHealing(action, payload);
      healing.push({
        id: String(row.id),
        at: row.created_at as string,
        teamName: (team?.name as string) || "Team",
        eventTitle: (event?.title as string) || "Event",
        rule: described.rule,
        signal: described.signal,
        intervention: described.intervention,
        status: "geloest",
      });
    }

    const liveTeams = teamRows.filter(
      (team) => team.status === "playing" || team.status === "lobby",
    );
    const sessions: CockpitOverviewSession[] = liveTeams.map((team) => {
      const event = eventById.get(team.event_id as string);
      const gameState = parseTeamGameState(team.game_state);
      const teamPlayers = playersByTeam.get(team.id as string) ?? [];
      const flag = sessionFlag({
        status: team.status as string,
        currentPhase: gameState.current_phase ?? null,
        levelStartedAt: gameState.levels[String(team.current_level ?? 0)]?.started_at ?? null,
        recentForceUnlock: forceUnlockTeams.has(team.id as string),
        recentRadiusHeal: radiusHealTeams.has(team.id as string),
      });

      return {
        teamId: team.id as string,
        teamName: (team.name as string) || "Team",
        joinCode: team.join_code as string,
        inviteCode: (event?.invite_code as string) ?? "",
        eventTitle: (event?.title as string) || "Event",
        status: team.status as string,
        currentLevel: (team.current_level as number) ?? 0,
        currentPhase: gameState.current_phase ?? null,
        score: gameState.score ?? 0,
        flag,
        players: teamPlayers.map((player) => ({
          name: player.display_name || "Spieler",
          isCaptain: Boolean(player.is_captain),
          isNavigator: player.id === team.navigator_player_id,
        })),
      };
    });

    const telemetry: CockpitTelemetryRow[] = [];
    for (const row of logRows) {
      if (telemetry.length >= 8) break;
      const action = row.action as string;
      if (action !== "play_attempt_ok" && action !== "play_attempt_failed") continue;
      const payload = asRecord(row.payload);
      const team = teamById.get((row.team_id as string) ?? "");
      const level = asNumber(payload.level);
      const title = asString(payload.level_title);
      const phase = asString(payload.phase);
      const stage = title
        ? `Aufgabe ${level ?? "—"} · ${title}`
        : phase
          ? `${phase} · Aufgabe ${level ?? "—"}`
          : `Aufgabe ${level ?? "—"}`;
      telemetry.push({
        id: String(row.id),
        at: row.created_at as string,
        ok: action === "play_attempt_ok",
        teamName: (team?.name as string) || "Team",
        playerName: asString(payload.player_name) ?? "Spieler",
        role: roleLabel(asString(payload.player_role)),
        stage,
        input: asString(payload.answer) ?? asString(payload.selected_option_id) ?? "—",
      });
    }

    const humanInterventions = logRows.filter((row) =>
      HUMAN_ACTIONS.includes(row.action as (typeof HUMAN_ACTIONS)[number]),
    ).length;
    const autoInterventions = healing.length;
    const autoActive = sessions.filter((session) => session.flag !== "ok").length;
    const autoHealed = Math.max(0, autoInterventions);
    const liveSessionCount = sessions.filter((session) => session.status === "playing").length;
    const denom = humanInterventions + autoHealed + liveSessionCount;
    const selfHealingPct =
      denom === 0
        ? null
        : humanInterventions === 0
          ? 100
          : Math.max(0, Math.min(100, Math.round((1 - humanInterventions / denom) * 10000) / 100));

    return {
      success: true,
      data: {
        liveSessionCount,
        humanInterventions,
        autoInterventions,
        autoHealed,
        autoActive,
        selfHealingPct,
        sessions,
        healing,
        telemetry,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Cockpit konnte nicht geladen werden.",
    };
  }
}
