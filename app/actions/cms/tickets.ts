"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioOrganizationId } from "@/app/actions/cms/organizations";
import type { StudioTicketPool } from "@/lib/cms/types";
import type { ActionResult } from "@/lib/grid/types";

export async function listTicketPools(): Promise<ActionResult<StudioTicketPool[]>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("studio_ticket_pools")
      .select("*, studio_games(name, slug)")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []) as StudioTicketPool[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ticket-Pools konnten nicht geladen werden.",
    };
  }
}

export type CreateTicketPoolInput = {
  game_id: string;
  name: string;
  mode: "single" | "pool";
  max_activations?: number | null;
  max_players_per_activation?: number;
};

export async function createTicketPool(
  input: CreateTicketPoolInput,
): Promise<ActionResult<StudioTicketPool>> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const { data: game, error: gameError } = await supabase
      .from("studio_games")
      .select("id, published_version_number")
      .eq("id", input.game_id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (gameError) throw new Error(gameError.message);
    if (!game) return { success: false, error: "Game nicht gefunden." };

    let gameVersionId: string | null = null;
    if (game.published_version_number > 0) {
      const { data: version } = await supabase
        .from("studio_game_versions")
        .select("id")
        .eq("game_id", input.game_id)
        .eq("version_number", game.published_version_number)
        .maybeSingle();
      gameVersionId = version?.id ?? null;
    }

    const { data, error } = await supabase
      .from("studio_ticket_pools")
      .insert({
        organization_id: orgId,
        game_id: input.game_id,
        game_version_id: gameVersionId,
        name: input.name.trim(),
        mode: input.mode,
        max_activations: input.max_activations ?? null,
        max_players_per_activation: input.max_players_per_activation ?? 5,
        status: "draft",
      })
      .select("*, studio_games(name, slug)")
      .single();

    if (error) throw new Error(error.message);
    revalidatePath("/admin/tickets");
    return { success: true, data: data as StudioTicketPool };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ticket-Pool konnte nicht erstellt werden.",
    };
  }
}

export async function activateTicketPool(poolId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("studio_ticket_pools")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", poolId);

    if (error) throw new Error(error.message);
    revalidatePath("/admin/tickets");
    return { success: true, data: { id: poolId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Pool konnte nicht aktiviert werden.",
    };
  }
}

export async function getStudioDashboardStats(): Promise<
  ActionResult<{
    tasks: number;
    games: number;
    templates: number;
    activePools: number;
    totalActivations: number;
  }>
> {
  try {
    const orgId = await getStudioOrganizationId();
    const supabase = createAdminClient();

    const [tasks, games, templates, pools] = await Promise.all([
      supabase
        .from("studio_tasks")
        .select("id", { count: "exact", head: true })
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .eq("is_active", true),
      supabase
        .from("studio_games")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("is_template", false),
      supabase
        .from("studio_games")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("is_template", true),
      supabase
        .from("studio_ticket_pools")
        .select("id, used_activations, status")
        .eq("organization_id", orgId),
    ]);

    const poolRows = pools.data ?? [];
    const activePools = poolRows.filter((p) => p.status === "active").length;
    const totalActivations = poolRows.reduce(
      (sum, p) => sum + Number(p.used_activations ?? 0),
      0,
    );

    return {
      success: true,
      data: {
        tasks: tasks.count ?? 0,
        games: games.count ?? 0,
        templates: templates.count ?? 0,
        activePools,
        totalActivations,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Dashboard-Statistiken fehlgeschlagen.",
    };
  }
}
