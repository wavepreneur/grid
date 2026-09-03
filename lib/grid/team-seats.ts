export const MAX_PLAYERS_PER_TEAM = 8;

export type TeamSeatSplit =
  | { ok: true; seats: number[] }
  | { ok: false; error: string };

/** Spread people across teams as evenly as possible (14 / 3 → 5, 5, 4). */
export function splitTeamSeats(
  playerCount: number,
  teamCount: number,
  maxPerTeam = MAX_PLAYERS_PER_TEAM,
): TeamSeatSplit {
  const players = Math.floor(Number(playerCount));
  const teams = Math.floor(Number(teamCount));
  if (!Number.isFinite(players) || players < 1) {
    return { ok: false, error: "Teilnehmerzahl muss mindestens 1 sein." };
  }
  if (!Number.isFinite(teams) || teams < 1) {
    return { ok: false, error: "Es braucht mindestens ein Team." };
  }
  if (players < teams) {
    return { ok: false, error: "Jedes Team braucht mindestens eine Person." };
  }
  if (players > teams * maxPerTeam) {
    return {
      ok: false,
      error: `Höchstens ${maxPerTeam} Personen pro Team. Bei ${teams} Teams sind das maximal ${teams * maxPerTeam} Teilnehmer.`,
    };
  }
  const base = Math.floor(players / teams);
  const extra = players % teams;
  return {
    ok: true,
    seats: Array.from({ length: teams }, (_, index) => base + (index < extra ? 1 : 0)),
  };
}

export function formatTeamSeatPreview(seats: number[]): string {
  return seats
    .map((size, index) => `Team ${index + 1}: ${size} ${size === 1 ? "Platz" : "Plätze"}`)
    .join(" · ");
}
