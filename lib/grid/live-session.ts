import type { LobbyPlayer, PlayerSession } from "@/lib/grid/types";

/** Apply a live roster row onto the local player session (lead transfer, roles). */
export function applyRosterToSession(
  current: PlayerSession,
  me: LobbyPlayer,
): PlayerSession {
  const liveIsAlpha = Boolean(me.is_alpha || me.is_captain);
  const liveCanManage = liveIsAlpha;
  const liveRole =
    me.archetype_role ??
    (liveIsAlpha ? "alpha" : me.is_beta ? "beta" : "gamma");

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
    isGamma: Boolean(me.is_gamma) || liveRole === "gamma",
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
  const liveRole =
    me.archetype_role ??
    (liveIsAlpha ? "alpha" : me.is_beta ? "beta" : "gamma");

  return (
    current.canManageTeam !== liveIsAlpha ||
    current.isCaptain !== Boolean(me.is_captain) ||
    current.isAlpha !== liveIsAlpha ||
    current.isNavigator !== Boolean(me.is_navigator) ||
    current.archetypeRole !== liveRole
  );
}
