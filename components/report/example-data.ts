/** Shared mock data for report, dashboard and end screen. Source: Tells design brief, part 6. */

/**
 * Team-level facts only. Never role data per team: a team has 1–2 people per role,
 * so a per-team role figure would describe a person.
 */
export type TeamDriver =
  | { kind: "solvedTask" | "missedTask"; task: string }
  | { kind: "mostHandoffs" | "fewestHandoffs" | "noHints" }
  | { kind: "hints"; count: number };
export type ReportTeam = {
  name: string;
  score: number;
  players: number;
  /** Hints bought, by task id. */
  hints: Partial<Record<string, number>>;
  drivers: TeamDriver[];
};
export type ReportTask = { id: string; title: string; solvedBy: readonly string[] };
/** `people`: everyone who held the role across all teams. Below MIN_GROUP_SIZE the row is hidden. */
export type RoleWait = { role: "Alpha" | "Beta" | "Gamma"; seconds: number; people: number };
export type Handoff = { from: "Alpha" | "Beta" | "Gamma"; to: "Alpha" | "Beta" | "Gamma"; avg: number };
export type TrendPoint = { session: number; score: number; note?: "reorg" };

export const EXAMPLE_REPORT = {
  company: "Northwind",
  session: "Onboarding Q4",
  /** Exitmania teamevent: the customer names the event at booking (→ `events.title`). */
  teameventTitle: "Teamevent Northwind",
  /** Not in the brief. Placeholder until real sessions exist. */
  date: "2026-10-14",
  /** Not in the brief. Same game name as the landing page. */
  game: "Vault Run",
  minutes: 30,
  teams: [
    // Per-team hints and drivers are not in the brief. Derived so the totals match it:
    // 11 hints, 7 on T4; 3 of 5 teams missed T4.
    {
      name: "Falcon",
      score: 81,
      players: 6,
      hints: {},
      drivers: [{ kind: "solvedTask", task: "T4" }, { kind: "mostHandoffs" }, { kind: "noHints" }],
    },
    {
      name: "Lynx",
      score: 76,
      players: 6,
      hints: { T2: 1 },
      drivers: [{ kind: "solvedTask", task: "T4" }, { kind: "hints", count: 1 }],
    },
    {
      name: "Orca",
      score: 72,
      players: 6,
      hints: { T3: 1, T4: 2 },
      drivers: [{ kind: "missedTask", task: "T4" }, { kind: "hints", count: 3 }],
    },
    {
      name: "Heron",
      score: 68,
      players: 6,
      hints: { T4: 2, T5: 1 },
      drivers: [{ kind: "missedTask", task: "T4" }, { kind: "fewestHandoffs" }],
    },
    {
      name: "Bison",
      score: 63,
      players: 6,
      hints: { T2: 1, T4: 3 },
      drivers: [{ kind: "missedTask", task: "T4" }, { kind: "hints", count: 4 }],
    },
  ] satisfies ReportTeam[],
  averageScore: 72,
  // Brief gives % of teams correct (100/80/80/40/80/100). Which teams solved what is derived.
  tasks: [
    { id: "T1", title: "Our values", solvedBy: ["Falcon", "Lynx", "Orca", "Heron", "Bison"] },
    { id: "T2", title: "Product basics", solvedBy: ["Falcon", "Lynx", "Orca", "Heron"] },
    { id: "T3", title: "Who to ask", solvedBy: ["Falcon", "Lynx", "Orca", "Bison"] },
    { id: "T4", title: "Discount policy", solvedBy: ["Falcon", "Lynx"] },
    { id: "T5", title: "Tools", solvedBy: ["Falcon", "Lynx", "Heron", "Bison"] },
    { id: "T6", title: "First week", solvedBy: ["Falcon", "Lynx", "Orca", "Heron", "Bison"] },
  ] satisfies ReportTask[],
  roleWait: [
    // People per role: 6-seat teams fill Alpha, Beta, Gamma, Delta, Beta, Gamma.
    { role: "Alpha", seconds: 12, people: 5 },
    { role: "Beta", seconds: 18, people: 10 },
    { role: "Gamma", seconds: 48, people: 10 },
  ] satisfies RoleWait[],
  teamAvgWait: 27,
  handoffs: [
    { from: "Alpha", to: "Beta", avg: 14 },
    { from: "Beta", to: "Gamma", avg: 3 },
    { from: "Gamma", to: "Alpha", avg: 9 },
  ] satisfies Handoff[],
  trend: {
    team: "Orca",
    points: [
      { session: 1, score: 61 },
      { session: 2, score: 64 },
      { session: 3, score: 58, note: "reorg" },
      { session: 4, score: 66 },
      { session: 5, score: 72 },
      { session: 6, score: 78 },
    ] satisfies TrendPoint[],
  },
  benchmark: { yours: 72, tellsAverage: 64 },
} as const;