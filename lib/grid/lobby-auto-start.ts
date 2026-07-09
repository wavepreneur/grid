import { DEFAULT_LOBBY_AUTO_START_SECONDS } from "@/lib/grid/constants";

/** Countdown when roster is full (solo or last player joined). */
export const FULL_ROSTER_AUTO_START_SECONDS = 3;

export function computeLobbyAutoStartAt(input: {
  autoStartSeconds?: number;
  maxSize: number;
  activePlayerCount: number;
  from?: Date;
}): Date {
  const base = input.from ?? new Date();
  const delaySeconds =
    input.activePlayerCount >= input.maxSize
      ? FULL_ROSTER_AUTO_START_SECONDS
      : input.autoStartSeconds ?? DEFAULT_LOBBY_AUTO_START_SECONDS;
  return new Date(base.getTime() + delaySeconds * 1000);
}

export function isLobbyRosterFull(snapshot: {
  active_player_count: number;
  max_size: number;
}): boolean {
  return snapshot.active_player_count >= snapshot.max_size;
}
