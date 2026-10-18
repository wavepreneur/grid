import { archetypeRoleFromPlayerFields } from "@/lib/tells/archetype-roles";
import type { LobbyPlayer, PlayerSession } from "@/lib/tells/types";

/** Apply a live roster row onto the local player session (lead transfer, roles). */
export function applyRosterToSession(
  current: PlayerSession,
  me: LobbyPlayer,
): PlayerSession {
  const liveIsAlpha = Boolean(me.is_alpha || me.is_captain);
  const liveCanManage = liveIsAlpha;
  const liveRole = archetypeRoleFromPlayerFields({
    role: me.archetype_role ?? me.role,
    isCaptain: liveIsAlpha,
    isAlpha: liveIsAlpha,
    isBeta: me.is_beta,
    isGamma: me.is_gamma,
    isDelta: me.is_delta,
  });

  if (
    current.canManageTeam === liveCanManage &&
    current.isCaptain === Boolean(me.is_captain) &&
    current.isAlpha === liveIsAlpha &&
    current.isNavigator === Boolean(me.is_navigator) &&
    current.archetypeRole === liveRole
  ) {
    return current;
  }

  return {
    ...current,
    isCaptain: Boolean(me.is_captain),
    isAlpha: liveIsAlpha,
    isBeta: Boolean(me.is_beta),
    isGamma: liveRole === "gamma",
    isDelta: liveRole === "delta",
    isNavigator: Boolean(me.is_navigator),
    canManageTeam: liveCanManage,
    canUnlockGps: Boolean(me.is_navigator),
    archetypeRole: liveRole,
    effectiveBeta: Boolean(me.is_beta) || liveCanManage,
  };
}

export function rosterNeedsSessionSync(
  current: PlayerSession,
  me: LobbyPlayer,
): boolean {
  const liveIsAlpha = Boolean(me.is_alpha || me.is_captain);
  const liveRole = archetypeRoleFromPlayerFields({
    role: me.archetype_role ?? me.role,
    isCaptain: liveIsAlpha,
    isAlpha: liveIsAlpha,
    isBeta: me.is_beta,
    isGamma: me.is_gamma,
    isDelta: me.is_delta,
  });

  return (
    current.canManageTeam !== liveIsAlpha ||
    current.isCaptain !== Boolean(me.is_captain) ||
    current.isAlpha !== liveIsAlpha ||
    current.isNavigator !== Boolean(me.is_navigator) ||
    current.archetypeRole !== liveRole
  );
}

/** Instant roster flip for lead transfer — same shape on every device. */
export function applyCaptainTransferToPlayers(
  players: LobbyPlayer[],
  newCaptainId: string,
): LobbyPlayer[] {
  return players.map((player) => {
    const isLead = player.id === newCaptainId;
    if (isLead) {
      return {
        ...player,
        is_captain: true,
        is_alpha: true,
        is_beta: false,
        is_gamma: false,
        is_delta: false,
        is_navigator: true,
        archetype_role: "alpha" as const,
        role: "alpha",
      };
    }
    if (player.is_captain || player.is_alpha) {
      return {
        ...player,
        is_captain: false,
        is_alpha: false,
        is_beta: true,
        is_gamma: false,
        is_delta: false,
        is_navigator: false,
        archetype_role: "beta" as const,
        role: "beta",
      };
    }
    return player;
  });
}

export function sessionAfterCaptainTransfer(
  current: PlayerSession,
  newCaptainId: string,
): PlayerSession {
  const isLead = current.playerId === newCaptainId;
  if (isLead) {
    return applyRosterToSession(current, {
      id: current.playerId,
      display_name: current.displayName,
      is_captain: true,
      is_alpha: true,
      is_beta: false,
      is_gamma: false,
      is_delta: false,
      is_navigator: true,
      archetype_role: "alpha",
      joined_at: "",
    });
  }
  if (current.isAlpha || current.isCaptain) {
    return applyRosterToSession(current, {
      id: current.playerId,
      display_name: current.displayName,
      is_captain: false,
      is_alpha: false,
      is_beta: true,
      is_gamma: false,
      is_delta: false,
      is_navigator: false,
      archetype_role: "beta",
      joined_at: "",
    });
  }
  return current;
}

/** Ignore stale roster snapshots while a just-broadcast lead transfer is in flight. */
export function rosterHonorsHeldCaptain(
  players: LobbyPlayer[],
  holdCaptainId: string | null,
): boolean {
  if (!holdCaptainId) return true;
  return players.some(
    (player) => player.id === holdCaptainId && (player.is_captain || player.is_alpha),
  );
}

export function rosterWithHeldCaptain(
  players: LobbyPlayer[],
  holdCaptainId: string | null,
): LobbyPlayer[] {
  if (rosterHonorsHeldCaptain(players, holdCaptainId) || !holdCaptainId) {
    return players;
  }
  return applyCaptainTransferToPlayers(players, holdCaptainId);
}
