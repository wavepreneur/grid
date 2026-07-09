import type { BlueprintDefinition } from "@/lib/grid/blueprints";
import type { PlayerSession } from "@/lib/grid/types";

export const ARCHETYPE_ROLES = ["alpha", "beta", "gamma"] as const;
export type ArchetypeRole = (typeof ARCHETYPE_ROLES)[number];

export type TeamRoleRefs = {
  captainPlayerId: string | null;
  navigatorPlayerId: string | null;
  betaPlayerId: string | null;
};

export type ArchetypeRoleFlags = {
  archetypeRole: ArchetypeRole;
  isAlpha: boolean;
  isBeta: boolean;
  isGamma: boolean;
  /** Alpha absorbs Beta UI when solo (1 player, no dedicated Beta). */
  effectiveBeta: boolean;
  canManageTeam: boolean;
  canUnlockGps: boolean;
};

export function normalizeArchetypeRole(role: string | null | undefined): ArchetypeRole {
  if (role === "alpha" || role === "captain") return "alpha";
  if (role === "beta") return "beta";
  return "gamma";
}

export function resolveArchetypeRoleForPlayer(
  playerId: string,
  playerRole: string,
  isCaptain: boolean,
  team: TeamRoleRefs,
): ArchetypeRole {
  if (isCaptain || playerRole === "alpha" || team.captainPlayerId === playerId) {
    return "alpha";
  }
  if (playerRole === "beta" || team.betaPlayerId === playerId) {
    return "beta";
  }
  return "gamma";
}

export function resolveArchetypeRoleFlags(input: {
  playerId: string;
  playerRole: string;
  isCaptain: boolean;
  team: TeamRoleRefs;
  activePlayerCount: number;
  gpsEnabled: boolean;
}): ArchetypeRoleFlags {
  const archetypeRole = resolveArchetypeRoleForPlayer(
    input.playerId,
    input.playerRole,
    input.isCaptain,
    input.team,
  );
  const isAlpha = archetypeRole === "alpha";
  const isBeta = archetypeRole === "beta";
  const isGamma = archetypeRole === "gamma";
  const hasDedicatedBeta = Boolean(input.team.betaPlayerId) && input.activePlayerCount >= 2;
  const effectiveBeta = isBeta || (isAlpha && input.activePlayerCount === 1 && !hasDedicatedBeta);

  return {
    archetypeRole,
    isAlpha,
    isBeta,
    isGamma,
    effectiveBeta,
    canManageTeam: isAlpha,
    canUnlockGps: isAlpha && input.gpsEnabled,
  };
}

export function buildArchetypeSessionFields(input: {
  playerId: string;
  playerRole: string;
  isCaptain: boolean;
  team: TeamRoleRefs;
  activePlayerCount: number;
  gpsEnabled: boolean;
}): Pick<
  PlayerSession,
  | "archetypeRole"
  | "isAlpha"
  | "isBeta"
  | "isGamma"
  | "effectiveBeta"
  | "canManageTeam"
  | "canUnlockGps"
> {
  const flags = resolveArchetypeRoleFlags(input);
  return {
    archetypeRole: flags.archetypeRole,
    isAlpha: flags.isAlpha,
    isBeta: flags.isBeta,
    isGamma: flags.isGamma,
    effectiveBeta: flags.effectiveBeta,
    canManageTeam: flags.canManageTeam,
    canUnlockGps: flags.canUnlockGps,
  };
}

/** Which role to assign to the Nth active player (1-indexed join order). */
export function archetypeRoleForJoinOrder(joinOrder: number): ArchetypeRole {
  if (joinOrder <= 1) return "alpha";
  if (joinOrder === 2) return "beta";
  return "gamma";
}

export function minPlayersToStart(blueprint: BlueprintDefinition): number {
  return blueprint.minPlayersToStart ?? 1;
}

export function canStartTeamGame(input: {
  activePlayerCount: number;
  blueprint: BlueprintDefinition;
}): { ok: true } | { ok: false; error: string } {
  const min = minPlayersToStart(input.blueprint);
  if (input.activePlayerCount >= min) {
    return { ok: true };
  }
  if (input.activePlayerCount === 0) {
    return {
      ok: false,
      error: "Mindestens ein Spieler muss im Team sein, bevor die Mission startet.",
    };
  }
  return {
    ok: false,
    error: `Mindestens ${min} Spieler nötig, bevor die Mission startet.`,
  };
}

export function archetypeRoleLabel(role: ArchetypeRole): string {
  switch (role) {
    case "alpha":
      return "Alpha";
    case "beta":
      return "Beta";
    case "gamma":
      return "Gamma";
  }
}
