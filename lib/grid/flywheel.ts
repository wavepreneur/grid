import type { GrowthSurface } from "@/lib/grid/growth-pack";

export const DEFAULT_HR_RECAP_EMAIL = "dervis@exitmania.com";
export const EXITMANIA_NEXT_TEAMEVENT_URL = "https://exitmania.com/next/teamevent";

export type FlywheelKind = "teamevent" | "grid-abo";

export function flywheelKindForSurface(
  surface: GrowthSurface | string | null | undefined,
): FlywheelKind {
  return surface === "exitmania_teamevent" ? "grid-abo" : "teamevent";
}

export function flywheelPageUrl(input: {
  kind: FlywheelKind;
  origin: string;
  teamName: string;
  score: number;
  resultsUrl?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.teamName.trim()) params.set("team", input.teamName.trim());
  params.set("score", String(input.score));
  if (input.resultsUrl) params.set("results", input.resultsUrl);
  const query = params.toString();
  if (input.kind === "grid-abo") {
    return `${input.origin.replace(/\/$/, "")}/next/abo?${query}`;
  }
  return `${EXITMANIA_NEXT_TEAMEVENT_URL}?${query}`;
}
