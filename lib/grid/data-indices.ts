/**
 * Workforce indices from existing audit_logs — no play writes.
 * Decision Speed = time-to-solve, Stress Resilience = recovery after fails/hints,
 * Team Agility = role split + parallel vs serial solves.
 */

export type AuditAttemptRow = {
  action: string;
  team_id: string | null;
  player_id: string | null;
  created_at: string;
  payload: Record<string, unknown>;
};

export type TeamIndexScores = {
  decisionSpeed: number | null;
  stressResilience: number | null;
  teamAgility: number | null;
  attemptsOk: number;
  attemptsFailed: number;
  hints: number;
  medianSolveMs: number | null;
  distinctSolverRoles: number;
};

/** Honest pilot baseline — not a published industry cut. */
export const GRID_FIELD_BASELINE = {
  decisionSpeed: 62,
  stressResilience: 58,
  teamAgility: 55,
} as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function computeTeamIndices(rows: AuditAttemptRow[]): TeamIndexScores {
  const ok = rows.filter((row) => row.action === "play_attempt_ok");
  const failed = rows.filter((row) => row.action === "play_attempt_failed");
  const hints = rows.filter((row) => row.action === "hint_purchased");

  const solveDurations = ok
    .map((row) => asNumber(row.payload.duration_ms))
    .filter((ms): ms is number => ms !== null && ms > 0)
    .sort((a, b) => a - b);

  const medianSolveMs =
    solveDurations.length === 0
      ? null
      : solveDurations[Math.floor(solveDurations.length / 2)] ?? null;

  // 90s median → 100; 6 min median → ~25.
  const decisionSpeed =
    medianSolveMs === null ? (ok.length > 0 ? 70 : null) : clampScore((90_000 / medianSolveMs) * 100);

  const attempts = ok.length + failed.length;
  const accuracy = attempts === 0 ? null : ok.length / attempts;
  const hintPenalty = Math.min(0.35, hints.length * 0.05);
  let recovered = 0;
  let recoverable = 0;
  const failedByLevel = new Map<number, string[]>();
  for (const row of failed) {
    const level = asNumber(row.payload.level);
    if (level === null) continue;
    const list = failedByLevel.get(level) ?? [];
    list.push(row.created_at);
    failedByLevel.set(level, list);
  }
  for (const row of ok) {
    const level = asNumber(row.payload.level);
    if (level === null) continue;
    const fails = failedByLevel.get(level);
    if (!fails?.length) continue;
    recoverable += 1;
    if (fails.some((at) => at < row.created_at)) recovered += 1;
  }
  const recovery = recoverable === 0 ? 1 : recovered / recoverable;
  const stressResilience =
    accuracy === null ? null : clampScore((accuracy * 0.7 + recovery * 0.3) * (1 - hintPenalty) * 100);

  const roles = new Set<string>();
  for (const row of ok) {
    const role = asString(row.payload.player_role);
    if (role) roles.add(role);
  }
  const distinctSolverRoles = roles.size;
  const roleSpread = clampScore((distinctSolverRoles / 3) * 100);

  const okTimes = ok
    .map((row) => new Date(row.created_at).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  let parallelScore = 55;
  if (okTimes.length >= 3) {
    const span = okTimes[okTimes.length - 1]! - okTimes[0]!;
    const gaps: number[] = [];
    for (let i = 1; i < okTimes.length; i += 1) {
      gaps.push(okTimes[i]! - okTimes[i - 1]!);
    }
    const meanGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    // Tight clusters after a wait → serial; overlapping solves → parallel.
    parallelScore = span <= 0 ? 50 : clampScore(100 - Math.min(80, meanGap / 1000));
  }
  const teamAgility =
    ok.length === 0 && failed.length === 0
      ? null
      : clampScore(roleSpread * 0.55 + parallelScore * 0.45);

  return {
    decisionSpeed,
    stressResilience,
    teamAgility,
    attemptsOk: ok.length,
    attemptsFailed: failed.length,
    hints: hints.length,
    medianSolveMs,
    distinctSolverRoles,
  };
}

export function averageIndex(
  values: Array<number | null>,
): number | null {
  const nums = values.filter((value): value is number => value !== null);
  if (nums.length === 0) return null;
  return clampScore(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

export const PERFORMANCE_INDEXES = [
  {
    key: "stressResilience" as const,
    label: "Stress-Resilienz",
    text: "Stabilität unter Zeitdruck — Recovery nach Fehlern, wenig Tipp-Abhängigkeit.",
  },
  {
    key: "decisionSpeed" as const,
    label: "Decision Speed",
    text: "Zeit vom Öffnen der Aufgabe bis zur belastbaren Entscheidung.",
  },
  {
    key: "teamAgility" as const,
    label: "Team-Agilität",
    text: "Rollenverteilung und parallele statt serielle Lösungen.",
  },
] as const;

export type ReportSignal = {
  key: string;
  label: string;
  value: number;
  hint: string;
};

export function compositeTeamScore(scores: TeamIndexScores): number | null {
  return averageIndex([scores.decisionSpeed, scores.stressResilience, scores.teamAgility]);
}

export function deriveReportSignals(scores: TeamIndexScores): ReportSignal[] {
  const attempts = scores.attemptsOk + scores.attemptsFailed;
  const accuracy =
    attempts === 0 ? 50 : clampScore((scores.attemptsOk / attempts) * 100);
  const roleBalance = clampScore((scores.distinctSolverRoles / 3) * 100);
  const help = clampScore(100 - Math.min(80, scores.hints * 18));
  const tempo = scores.decisionSpeed ?? 0;
  const endurance = scores.stressResilience ?? accuracy;

  return [
    {
      key: "tempo",
      label: "Entscheidungstempo",
      value: tempo,
      hint:
        scores.medianSolveMs !== null
          ? `Median ${Math.round(scores.medianSolveMs / 1000)} s bis Solve`
          : "Noch keine Lösungszeiten im Log",
    },
    {
      key: "verteilung",
      label: "Rollenbalance",
      value: roleBalance,
      hint:
        scores.distinctSolverRoles >= 3
          ? "Alle drei Rollen liefern Eingaben"
          : scores.distinctSolverRoles === 0
            ? "Keine Rollen in den Solve-Events"
            : `${scores.distinctSolverRoles} Rolle${scores.distinctSolverRoles === 1 ? "" : "n"} in den Lösungen`,
    },
    {
      key: "fehler",
      label: "Fehlertoleranz",
      value: accuracy,
      hint:
        scores.attemptsFailed === 0
          ? "Keine Fehlversuche im Log"
          : `${scores.attemptsFailed} Fehlversuche · ${scores.attemptsOk} gelöst`,
    },
    {
      key: "hilfe",
      label: "Hilfe annehmen",
      value: help,
      hint:
        scores.hints === 0
          ? "Keine Tipps gekauft"
          : `${scores.hints} Tipp${scores.hints === 1 ? "" : "s"} — gezielt statt panisch, wenn der Wert hoch bleibt`,
    },
    {
      key: "ausdauer",
      label: "Ausdauer",
      value: endurance,
      hint: "Annäherung aus Recovery und Trefferquote bis Spielende",
    },
  ];
}

export function deriveStrengthBlindspot(scores: TeamIndexScores): {
  strength: string;
  blindspot: string;
} {
  const signals = deriveReportSignals(scores);
  const best = [...signals].sort((a, b) => b.value - a.value)[0];
  const worst = [...signals].sort((a, b) => a.value - b.value)[0];

  const strength =
    best?.key === "verteilung"
      ? "Saubere Aufgabenteilung — mehrere Rollen tauchen in den Lösungen auf."
      : best?.key === "tempo"
        ? "Schnelle, klare Beschlüsse — die Lösungszeiten liegen klar über dem GRID-Feld."
        : best?.key === "hilfe"
          ? "Tipps werden gezielt eingesetzt, nicht als Dauer-Krücke."
          : best?.key === "fehler"
            ? "Wenig Wiederholfehler — das Team kommt nach einem Fail wieder in die Spur."
            : "Die Leistung bleibt über den Lauf hinweg lesbar und belastbar.";

  const blindspot =
    worst?.key === "verteilung"
      ? "Unter Druck konzentrieren sich die Lösungen auf zu wenige Rollen."
      : worst?.key === "tempo"
        ? "Vom Öffnen bis zur Entscheidung dauert es länger als im GRID-Feld."
        : worst?.key === "hilfe"
          ? "Viele Tipps — das Team kauft Hilfe, statt selbst nachzusteuern."
          : worst?.key === "fehler"
            ? "Fehlversuche häufen sich, bevor eine belastbare Lösung steht."
            : "Die Kurve wird gegen Ende unruhiger — Ausdauer ist der Engpass.";

  if (scores.attemptsOk === 0 && scores.attemptsFailed === 0) {
    return {
      strength: "Noch zu wenig Telemetrie für eine Stärke.",
      blindspot: "Sobald Solve-Events da sind, erscheint hier der Blind Spot.",
    };
  }

  return { strength, blindspot };
}
