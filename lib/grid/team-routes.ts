import type { GridTeamStatus } from "@/lib/grid/types";

export function teamEntryPath(
  inviteCode: string,
  joinCode: string,
  teamStatus: GridTeamStatus,
): string {
  if (teamStatus === "playing" || teamStatus === "finished") {
    return `/play/${inviteCode}/${joinCode}`;
  }
  return `/join/${inviteCode}/lobby/${joinCode}`;
}
