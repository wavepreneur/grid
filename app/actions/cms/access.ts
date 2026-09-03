"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import {
  appendTeamAccessCodes,
  effectiveAccessStatus,
  provisionStudioAccessBatch,
  type AccessKind,
  type AccessStatus,
} from "@/lib/grid/access";
import { splitTeamSeats } from "@/lib/grid/team-seats";
import type { ActionResult } from "@/lib/grid/types";

export type StudioAccessCodeView = {
  id: string;
  code: string;
  kind: AccessKind;
  status: AccessStatus;
  team_id: string | null;
  team_name: string | null;
  redeemed_at: string | null;
  last_joined_at: string | null;
  revoked_at: string | null;
  valid_until: string | null;
  player_count: number;
  seat_count: number;
};

export type StudioAccessBatchView = {
  id: string;
  name: string;
  kind: AccessKind;
  game_id: string | null;
  game_name: string | null;
  event_id: string | null;
  invite_code: string | null;
  max_activations: number | null;
  used_activations: number;
  players_per_team: number;
  seat_sizes: number[];
  valid_until: string | null;
  created_at: string;
  codes: StudioAccessCodeView[];
};

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((id): id is string => Boolean(id)))];
}

export async function listAccessBatches(): Promise<ActionResult<StudioAccessBatchView[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: batches, error } = await supabase
      .from("studio_access_batches")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!batches || batches.length === 0) return { success: true, data: [] };

    const batchIds = batches.map((b) => b.id as string);
    const gameIds = uniqueIds(batches.map((b) => b.game_id as string | null));
    const eventIds = uniqueIds(batches.map((b) => b.event_id as string | null));

    const [{ data: codeRows, error: codeError }, { data: games }, { data: events }] =
      await Promise.all([
        supabase
          .from("studio_access_codes")
          .select("*")
          .in("batch_id", batchIds)
          .order("created_at", { ascending: true }),
        gameIds.length > 0
          ? supabase.from("studio_games").select("id, name").in("id", gameIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        eventIds.length > 0
          ? supabase.from("events").select("id, invite_code").in("id", eventIds)
          : Promise.resolve({ data: [] as { id: string; invite_code: string }[] }),
      ]);

    if (codeError) throw new Error(codeError.message);

    const gameNameById = new Map<string, string>();
    for (const game of games ?? []) {
      gameNameById.set(game.id as string, game.name as string);
    }
    const inviteByEventId = new Map<string, string>();
    for (const event of events ?? []) {
      inviteByEventId.set(event.id as string, event.invite_code as string);
    }

    const teamIds = uniqueIds((codeRows ?? []).map((c) => c.team_id as string | null));

    const teamNameById = new Map<string, string>();
    const seatCountByTeam = new Map<string, number>();
    const playerCountByTeam = new Map<string, number>();
    if (teamIds.length > 0) {
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, max_size")
        .in("id", teamIds);
      for (const team of teams ?? []) {
        teamNameById.set(team.id as string, team.name as string);
        seatCountByTeam.set(team.id as string, Number(team.max_size ?? 0));
      }
      const { data: players } = await supabase
        .from("players")
        .select("team_id")
        .in("team_id", teamIds)
        .is("left_at", null);
      for (const player of players ?? []) {
        const id = player.team_id as string;
        playerCountByTeam.set(id, (playerCountByTeam.get(id) ?? 0) + 1);
      }
    }

    const codesByBatch = new Map<string, StudioAccessCodeView[]>();
    for (const row of codeRows ?? []) {
      const status = effectiveAccessStatus({
        status: row.status as AccessStatus,
        valid_from: row.valid_from,
        valid_until: row.valid_until,
      });
      const view: StudioAccessCodeView = {
        id: row.id as string,
        code: row.code as string,
        kind: row.kind as AccessKind,
        status,
        team_id: (row.team_id as string | null) ?? null,
        team_name: row.team_id ? (teamNameById.get(row.team_id as string) ?? null) : null,
        redeemed_at: (row.redeemed_at as string | null) ?? null,
        last_joined_at: (row.last_joined_at as string | null) ?? null,
        revoked_at: (row.revoked_at as string | null) ?? null,
        valid_until: (row.valid_until as string | null) ?? null,
        player_count: row.team_id ? (playerCountByTeam.get(row.team_id as string) ?? 0) : 0,
        seat_count: row.team_id ? (seatCountByTeam.get(row.team_id as string) ?? 0) : 0,
      };
      const list = codesByBatch.get(row.batch_id as string) ?? [];
      list.push(view);
      codesByBatch.set(row.batch_id as string, list);
    }

    const data: StudioAccessBatchView[] = batches.map((batch) => {
      const codes = codesByBatch.get(batch.id as string) ?? [];
      const seatSizes = codes
        .filter((code) => code.kind === "team")
        .map((code) => code.seat_count)
        .filter((seats) => seats > 0);
      const eventId = (batch.event_id as string | null) ?? null;
      return {
        id: batch.id as string,
        name: batch.name as string,
        kind: batch.kind as AccessKind,
        game_id: (batch.game_id as string | null) ?? null,
        game_name: batch.game_id ? (gameNameById.get(batch.game_id as string) ?? null) : null,
        event_id: eventId,
        invite_code: eventId ? (inviteByEventId.get(eventId) ?? null) : null,
        max_activations: batch.max_activations != null ? Number(batch.max_activations) : null,
        used_activations: Number(batch.used_activations ?? 0),
        players_per_team: Number(batch.players_per_team ?? 5),
        seat_sizes: seatSizes,
        valid_until: (batch.valid_until as string | null) ?? null,
        created_at: batch.created_at as string,
        codes,
      };
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tickets konnten nicht geladen werden.",
    };
  }
}

export type CreateAccessBatchForm = {
  game_id: string;
  name: string;
  kind: AccessKind;
  player_count?: number;
  team_count?: number;
  max_activations?: number | null;
  valid_until?: string | null;
};

export async function createAccessBatch(
  input: CreateAccessBatchForm,
): Promise<ActionResult<{ batchId: string }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data: game, error: gameError } = await supabase
      .from("studio_games")
      .select("*")
      .eq("id", input.game_id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (gameError) throw new Error(gameError.message);
    if (!game) return { success: false, error: "Spiel nicht gefunden." };
    if (game.status !== "published" || game.published_version_number < 1) {
      return { success: false, error: "Nur veröffentlichte Spiele können Tickets bekommen." };
    }

    const { data: version } = await supabase
      .from("studio_game_versions")
      .select("id")
      .eq("game_id", game.id)
      .eq("version_number", game.published_version_number)
      .maybeSingle();

    if (!version) {
      return { success: false, error: "Keine veröffentlichte Version gefunden." };
    }

    let teamSeats: number[] = [];
    let maxAct: number | null = null;
    if (input.kind === "team") {
      const split = splitTeamSeats(input.player_count ?? 0, input.team_count ?? 0);
      if (!split.ok) return { success: false, error: split.error };
      teamSeats = split.seats;
    } else {
      maxAct = Math.max(1, Math.floor(input.max_activations ?? input.player_count ?? 1));
    }

    const result = await provisionStudioAccessBatch({
      organizationId: orgId,
      name: input.name,
      kind: input.kind,
      game: game as import("@/lib/cms/types").StudioGame,
      versionId: version.id as string,
      teamSeats,
      maxActivations: maxAct,
      validFrom: null,
      validUntil: input.valid_until?.trim() || null,
    });

    revalidatePath("/admin/tickets");
    return { success: true, data: { batchId: result.batchId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tickets konnten nicht erzeugt werden.",
    };
  }
}

export async function appendAccessCodes(
  batchId: string,
  quantity: number,
): Promise<ActionResult<{ codes: string[] }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const qty = Math.max(1, Math.min(200, Math.floor(quantity)));
    const codes = await appendTeamAccessCodes({
      organizationId: orgId,
      batchId,
      quantity: qty,
    });
    revalidatePath("/admin/tickets");
    return { success: true, data: { codes } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Weitere Codes fehlgeschlagen.",
    };
  }
}

export async function revokeAccessCode(codeId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("studio_access_codes")
      .update({ status: "revoked", revoked_at: now })
      .eq("id", codeId)
      .eq("organization_id", orgId)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: "Code nicht gefunden." };
    revalidatePath("/admin/tickets");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Code konnte nicht gelöscht werden.",
    };
  }
}
