import type { BlueprintDefinition } from "@/lib/tells/blueprints";
import type { PlayerSession } from "@/lib/tells/types";

export const ARCHETYPE_ROLES = ["alpha", "beta", "gamma", "delta"] as const;
export type ArchetypeRole = (typeof ARCHETYPE_ROLES)[number];

/** After Alpha, seats rotate Beta → Gamma → Delta. Alpha is never repeated. */
const ROTATING_ROLES = ["beta", "gamma", "delta"] as const;

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
  isDelta: boolean;
  /** Alpha absorbs Beta UI when solo (1 player, no dedicated Beta). */
  effectiveBeta: boolean;
  canManageTeam: boolean;
  canUnlockGps: boolean;
};

export function normalizeArchetypeRole(role: string | null | undefined): ArchetypeRole {
  if (role === "alpha" || role === "captain" || role === "navigator") return "alpha";
  if (role === "beta") return "beta";
  if (role === "delta") return "delta";
  return "gamma";
}

export function archetypeRoleFromPlayerFields(input: {
  role?: string | null;
  isCaptain?: boolean;
  isAlpha?: boolean;
  isBeta?: boolean;
  isGamma?: boolean;
  isDelta?: boolean;
}): ArchetypeRole {
  if (input.isCaptain || input.isAlpha) return "alpha";
  if (input.isBeta) return "beta";
  if (input.isDelta) return "delta";
  if (input.role) return normalizeArchetypeRole(input.role);
  if (input.isGamma) return "gamma";
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
  if (playerRole === "beta") return "beta";
  if (playerRole === "delta") return "delta";
  if (playerRole === "gamma") return "gamma";
  if (team.betaPlayerId === playerId) return "beta";
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
  const isDelta = archetypeRole === "delta";
  // If nobody else is Beta (missing assignment / solo), Alpha still sees notes & tiles.
  const hasDedicatedBeta =
    Boolean(input.team.betaPlayerId) &&
    input.team.betaPlayerId !== input.playerId &&
    input.activePlayerCount >= 2;
  const effectiveBeta = isBeta || (isAlpha && !hasDedicatedBeta);

  return {
    archetypeRole,
    isAlpha,
    isBeta,
    isGamma,
    isDelta,
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
  | "isDelta"
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
    isDelta: flags.isDelta,
    effectiveBeta: flags.effectiveBeta,
    canManageTeam: flags.canManageTeam,
    canUnlockGps: flags.canUnlockGps,
  };
}

/** Which role to assign to the Nth active player (1-indexed join order). */
export function archetypeRoleForJoinOrder(joinOrder: number): ArchetypeRole {
  if (joinOrder <= 1) return "alpha";
  return ROTATING_ROLES[(joinOrder - 2) % ROTATING_ROLES.length]!;
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
    case "delta":
      return "Delta";
  }
}
