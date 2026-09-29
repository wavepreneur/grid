import type { GrowthSurface } from "@/lib/grid/growth-pack";
import { playUiLang } from "@/lib/grid/play-ui";

export const DEFAULT_HR_RECAP_EMAIL = "dervis@exitmania.com";
export const EXITMANIA_NEXT_TEAMEVENT_URL = "https://exitmania.com/next/teamevent";
export const EXITMANIA_NEXT_TEAMEVENT_URL_EN = "https://exitmania.com/en/next/teamevent";

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
  language?: string | null;
}): string {
  const english = playUiLang(input.language) === "en";
  const params = new URLSearchParams();
  if (input.teamName.trim()) params.set("team", input.teamName.trim());
  params.set("score", String(input.score));
  if (input.resultsUrl) params.set("results", input.resultsUrl);
  if (english) params.set("lang", "en");
  const query = params.toString();
  if (input.kind === "grid-abo") {
    return `${input.origin.replace(/\/$/, "")}/next/abo?${query}`;
  }
  const base = english ? EXITMANIA_NEXT_TEAMEVENT_URL_EN : EXITMANIA_NEXT_TEAMEVENT_URL;
  return `${base}?${query}`;
}
