/** One example story for every window on the landing page. All numbers must agree. */
export const EXAMPLE = {
  company: "Northwind",
  session: "Onboarding",
  game: "Vault Run",
  teamCount: 5,
  playerCount: 30,
  minutes: 30,
  code: "NW-4821",
  link: "tells.team/go/NW-4821",
  mission4: "Mission 4 · The vault",
  avgScore: 72,
  nextStep: "Re-explain the discount policy. Run Mission 4 again in 2 weeks.",
} as const;

/** Northwind content that lands in prepared slots of the game. */
export const EXAMPLE_SLOTS = {
  tile: { label: "Policy", text: "Sales may approve up to 10 % alone." },
  quiz: "Who signs off a new supplier?",
  image: "Northwind HQ",
} as const;

export const EXAMPLE_TEAMS = [
  { name: "Falcon", score: 81 },
  { name: "Lynx", score: 76 },
  { name: "Orca", score: 72 },
  { name: "Heron", score: 68 },
  { name: "Bison", score: 63 },
] as const;

/** Join order 1–6 → Alpha, then Beta / Gamma / Delta rotate. */
export const EXAMPLE_SEATS = ["Alpha", "Beta", "Gamma", "Delta", "Beta", "Gamma"] as const;

export const EXAMPLE_TELLS = [
  {
    kind: "Gap",
    tell: "Mission 4: 3 of 5 teams bought a hint on the policy tile",
    meaning: "Your discount policy did not land.",
    next: "Re-explain it. Run Mission 4 again in 2 weeks.",
  },
  {
    kind: "Bottleneck",
    tell: "Gamma role waited 48 s for input",
    meaning: "Average across 5 teams. The handoff is slow, not the people.",
    next: "Agree who passes what, and when.",
  },
  {
    kind: "Strength",
    tell: "Teams that passed tasks on solved 31 % faster",
    meaning: "Sharing beats solo work.",
    next: "Keep mixed teams for the next session.",
  },
] as const;
