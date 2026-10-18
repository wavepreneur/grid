import type { ReportTask, ReportTeam } from "@/components/report/example-data";
import { MIN_GROUP_SIZE } from "@/components/report/report-tiers";

/**
 * Teams below MIN_GROUP_SIZE stay out of every total. Otherwise a hidden team's
 * result could be worked out from the totals and the visible teams.
 */
export function splitTeams(teams: readonly ReportTeam[]) {
  const counted = teams.filter((team) => team.players >= MIN_GROUP_SIZE);
  return { counted, excluded: teams.length - counted.length };
}

export type TaskResult = { id: string; title: string; correct: number; total: number; pct: number };

export function taskResults(tasks: readonly ReportTask[], counted: readonly ReportTeam[]): TaskResult[] {
  const names = new Set(counted.map((team) => team.name));
  const total = counted.length;
  return tasks.map((task) => {
    const correct = task.solvedBy.filter((name) => names.has(name)).length;
    return { id: task.id, title: task.title, correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
  });
}

export function weakestTask(results: readonly TaskResult[]): TaskResult {
  return results.reduce((low, task) => (task.pct < low.pct ? task : low));
}

export function hintTotals(counted: readonly ReportTeam[], taskId: string) {
  let total = 0;
  let onTask = 0;
  for (const team of counted) {
    for (const [id, count] of Object.entries(team.hints)) {
      total += count ?? 0;
      if (id === taskId) onTask += count ?? 0;
    }
  }
  return { total, onTask };
}
