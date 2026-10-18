/**
 * One report, three depths. Sections never change shape between tiers —
 * a tier either fills a section or explains what it would show.
 *
 * light   – Exitmania teamevent, standard game
 * session – one-off Tells session with the customer's own content
 * year    – yearly plan: context over time, breakdowns, raw export
 */
export const REPORT_TIERS = ["light", "session", "year"] as const;
export type ReportTier = (typeof REPORT_TIERS)[number];

export type ReportSection =
  | "summary"
  | "nextSteps"
  | "understanding"
  | "collaboration"
  | "comparison"
  | "overTime"
  | "method";

const AVAILABLE_FROM: Record<ReportSection, ReportTier> = {
  summary: "light",
  nextSteps: "light",
  understanding: "session",
  collaboration: "light",
  comparison: "light",
  overTime: "year",
  method: "light",
};

export function tierIncludes(tier: ReportTier, section: ReportSection): boolean {
  return REPORT_TIERS.indexOf(tier) >= REPORT_TIERS.indexOf(AVAILABLE_FROM[section]);
}

export function parseTier(value: string | string[] | undefined): ReportTier {
  return REPORT_TIERS.includes(value as ReportTier) ? (value as ReportTier) : "session";
}

/** Below this many people, a breakdown is hidden. */
export const MIN_GROUP_SIZE = 5;
