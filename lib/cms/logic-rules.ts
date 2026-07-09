import type { LevelDefinition, PlayerRole } from "@/lib/grid/level-types";
import type { StudioGame, StudioGameTaskLink, StudioTaskContent } from "@/lib/cms/types";
import { DEFAULT_TASK_CONTENT } from "@/lib/cms/types";

/** When → Then rule (stored on studio_games.logic_rules). */
export type LogicWhenType =
  | "game_start"
  | "task_solved"
  | "task_solved_any_team"
  | "team_points_at_least"
  | "task_gps_reached";

export type LogicThenType = "show_task" | "hide_task" | "unlock_task" | "end_game";

export type LogicGpsPin = {
  lat: number;
  lng: number;
  radius_meters: number;
};

export type StudioLogicRule = {
  id: string;
  enabled: boolean;
  when: {
    type: LogicWhenType;
    source_task_id?: string | null;
    points?: number | null;
  };
  then: {
    type: LogicThenType;
    target_task_id?: string | null;
    delay_minutes?: number | null;
    delay_meters?: number | null;
    role?: PlayerRole | null;
    gps?: LogicGpsPin | null;
  };
};

export const LOGIC_WHEN_OPTIONS: Array<{ value: LogicWhenType; labelDe: string; labelEn: string }> = [
  { value: "game_start", labelDe: "Spiel startet", labelEn: "Game starts" },
  { value: "task_solved", labelDe: "Task gelöst (dieses Team)", labelEn: "Task solved (this team)" },
  {
    value: "task_solved_any_team",
    labelDe: "Task gelöst (beliebiges Team)",
    labelEn: "Task solved (any team)",
  },
  { value: "team_points_at_least", labelDe: "Team-Punkte erreicht", labelEn: "Team points reached" },
  { value: "task_gps_reached", labelDe: "GPS-Position erreicht", labelEn: "GPS position reached" },
];

export const LOGIC_THEN_OPTIONS: Array<{ value: LogicThenType; labelDe: string; labelEn: string }> = [
  { value: "show_task", labelDe: "Task anzeigen", labelEn: "Show task" },
  { value: "unlock_task", labelDe: "Task freischalten", labelEn: "Unlock task" },
  { value: "hide_task", labelDe: "Task ausblenden (für alle)", labelEn: "Hide task (everyone)" },
  { value: "end_game", labelDe: "Spiel beenden", labelEn: "End game" },
];

export function createRuleId(): string {
  return `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
};

export function parseLogicRules(raw: unknown): StudioLogicRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const r = item as StudioLogicRule;
    if (!r.id || !r.when?.type || !r.then?.type) return [];
    return [
      {
        id: r.id,
        enabled: r.enabled !== false,
        when: {
          type: r.when.type,
          source_task_id: r.when.source_task_id ?? null,
          points: r.when.points ?? null,
        },
        then: {
          type: r.then.type,
          target_task_id: r.then.target_task_id ?? null,
          delay_minutes: r.then.delay_minutes ?? null,
          delay_meters: r.then.delay_meters ?? null,
          role: r.then.role ?? null,
          gps: r.then.gps ?? null,
        },
      },
    ];
  });
}

export function describeLogicRule(
  rule: StudioLogicRule,
  taskTitleById: Map<string, string>,
  lang: "de" | "en" = "de",
): string {
  const whenOpt = LOGIC_WHEN_OPTIONS.find((o) => o.value === rule.when.type);
  const thenOpt = LOGIC_THEN_OPTIONS.find((o) => o.value === rule.then.type);
  const whenLabel = lang === "de" ? whenOpt?.labelDe : whenOpt?.labelEn;
  const thenLabel = lang === "de" ? thenOpt?.labelDe : thenOpt?.labelEn;

  const src = rule.when.source_task_id
    ? taskTitleById.get(rule.when.source_task_id) ?? "?"
    : null;
  const tgt = rule.then.target_task_id
    ? taskTitleById.get(rule.then.target_task_id) ?? "?"
    : null;

  let whenPart = whenLabel ?? rule.when.type;
  if (src) whenPart += `: „${src}"`;
  if (rule.when.type === "team_points_at_least" && rule.when.points != null) {
    whenPart += ` (≥ ${rule.when.points})`;
  }

  let thenPart = thenLabel ?? rule.then.type;
  if (tgt) thenPart += `: „${tgt}"`;
  if (rule.then.delay_minutes) thenPart += ` (+ ${rule.then.delay_minutes} Min)`;
  if (rule.then.delay_meters) thenPart += ` (+ ${rule.then.delay_meters} m)`;
  if (rule.then.role) thenPart += ` [${rule.then.role}]`;

  return lang === "de" ? `Wenn ${whenPart} → ${thenPart}` : `When ${whenPart} → ${thenPart}`;
}

/** Preset: linear chain — each solved task unlocks the next. */
export function buildSequentialRules(links: StudioGameTaskLink[]): StudioLogicRule[] {
  if (links.length === 0) return [];
  const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
  const rules: StudioLogicRule[] = [
    {
      id: createRuleId(),
      enabled: true,
      when: { type: "game_start" },
      then: { type: "show_task", target_task_id: sorted[0].task_id },
    },
  ];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    rules.push({
      id: createRuleId(),
      enabled: true,
      when: { type: "task_solved", source_task_id: sorted[i].task_id },
      then: { type: "unlock_task", target_task_id: sorted[i + 1].task_id },
    });
  }

  return rules;
}

export function buildRogainConsumeRules(links: StudioGameTaskLink[]): StudioLogicRule[] {
  return links.map((link) => ({
    id: createRuleId(),
    enabled: true,
    when: { type: "task_solved_any_team", source_task_id: link.task_id },
    then: { type: "hide_task", target_task_id: link.task_id },
  }));
}

export type LogicFlowMode = "linear" | "rogain" | "open";

/** Rogain: all tasks visible at start, hide globally after any team solves. */
export function buildRogainFlowRules(links: StudioGameTaskLink[]): StudioLogicRule[] {
  const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
  const showRules: StudioLogicRule[] = sorted.map((link) => ({
    id: createRuleId(),
    enabled: true,
    when: { type: "game_start" },
    then: { type: "show_task", target_task_id: link.task_id },
  }));
  return [...showRules, ...buildRogainConsumeRules(sorted)];
}

/** Open: all tasks visible from game start. */
export function buildOpenFlowRules(links: StudioGameTaskLink[]): StudioLogicRule[] {
  const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
  return sorted.map((link) => ({
    id: createRuleId(),
    enabled: true,
    when: { type: "game_start" },
    then: { type: "show_task", target_task_id: link.task_id },
  }));
}

function ruleSignature(rules: StudioLogicRule[]) {
  return rules
    .filter((r) => r.enabled)
    .map((r) => ({
      when: r.when.type,
      src: r.when.source_task_id ?? null,
      pts: r.when.points ?? null,
      then: r.then.type,
      tgt: r.then.target_task_id ?? null,
    }))
    .sort((a, b) =>
      `${a.when}:${a.src}:${a.then}:${a.tgt}`.localeCompare(
        `${b.when}:${b.src}:${b.then}:${b.tgt}`,
      ),
    );
}

export function detectLogicFlowMode(
  rules: StudioLogicRule[],
  links: StudioGameTaskLink[],
): LogicFlowMode | "custom" {
  const parsed = parseLogicRules(rules);
  if (parsed.length === 0 || links.length === 0) return "linear";

  const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
  const sig = JSON.stringify(ruleSignature(parsed));

  const withoutEnd = parsed.filter((r) => r.then.type !== "end_game");
  if (JSON.stringify(ruleSignature(withoutEnd)) === JSON.stringify(ruleSignature(buildSequentialRules(sorted)))) {
    return "linear";
  }
  if (JSON.stringify(ruleSignature(withoutEnd)) === JSON.stringify(ruleSignature(buildRogainFlowRules(sorted)))) {
    return "rogain";
  }
  if (JSON.stringify(ruleSignature(withoutEnd)) === JSON.stringify(ruleSignature(buildOpenFlowRules(sorted)))) {
    return "open";
  }
  return "custom";
}

export function buildFlowRules(
  mode: LogicFlowMode,
  links: StudioGameTaskLink[],
  options?: { endTaskId?: string | null },
): StudioLogicRule[] {
  const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
  let rules: StudioLogicRule[];
  if (mode === "rogain") rules = buildRogainFlowRules(sorted);
  else if (mode === "open") rules = buildOpenFlowRules(sorted);
  else rules = buildSequentialRules(sorted);

  const endId = options?.endTaskId ?? null;
  if (endId) rules = [...rules, buildFinishRule(endId)];
  return rules;
}

export function findEndGameTaskId(rules: StudioLogicRule[]): string | null {
  const end = parseLogicRules(rules).find((r) => r.enabled && r.then.type === "end_game");
  return end?.when.source_task_id ?? null;
}

export function buildFinishRule(sourceTaskId: string): StudioLogicRule {
  return {
    id: createRuleId(),
    enabled: true,
    when: { type: "task_solved", source_task_id: sourceTaskId },
    then: { type: "end_game" },
  };
}

function taskContentToLevelType(content: StudioTaskContent, gpsEnabled: boolean): LevelDefinition["type"] {
  if (gpsEnabled && content.open_media.type === "none") return "gps";
  if (content.answer_type === "choice") return "quiz";
  return "digital";
}

function linkToLevelDefinition(
  link: StudioGameTaskLink,
  levelNumber: number,
  game: StudioGame,
  rules: StudioLogicRule[],
): LevelDefinition {
  const content = { ...DEFAULT_TASK_CONTENT, ...link.task.content };
  const overrides = link.overrides as { gps?: LogicGpsPin; location?: LogicGpsPin };

  const level: LevelDefinition = {
    level: levelNumber,
    type: taskContentToLevelType(content, game.gps_enabled),
    title: link.task.title,
    description: link.task.description,
  };

  if (content.question) level.description = content.question;
  if (content.answer) level.answer = content.answer;
  if (content.options?.length) {
    level.options = content.options;
    if (content.answer_type === "choice") {
      const match = content.options.find((o) => o.label === content.answer);
      if (match) level.correct_option_id = match.id;
    }
  }

  const tileImageUrl =
    content.tile.label_image_url?.trim() ||
    (content.tile.display === "image" ? content.tile.image_url?.trim() : undefined);
  if (tileImageUrl) {
    level.hero_image_url = tileImageUrl;
  }

  if (content.open_media.type === "iframe" && content.open_media.url) {
    level.media = { iframe_url: content.open_media.url };
  } else if (content.open_media.type === "video" && content.open_media.url) {
    level.media = { video_url: content.open_media.url };
  } else if (content.open_media.type === "audio" && content.open_media.url) {
    level.media = { audio_url: content.open_media.url };
  } else if (content.open_media.type === "image" && content.open_media.url) {
    level.media = { image_url: content.open_media.url };
  }

  const roleRule = rules.find(
    (r) =>
      r.enabled &&
      r.then.target_task_id === link.task_id &&
      r.then.role &&
      (r.then.type === "show_task" || r.then.type === "unlock_task"),
  );
  if (roleRule?.then.role) level.role_required = roleRule.then.role;

  const gpsFromRule = rules.find(
    (r) =>
      r.enabled &&
      r.then.target_task_id === link.task_id &&
      r.then.gps &&
      (r.when.type === "game_start" || r.when.type === "task_gps_reached"),
  )?.then.gps;

  const gps = gpsFromRule ?? overrides.gps ?? overrides.location;
  if (gps && game.gps_enabled) {
    level.location = {
      lat: gps.lat,
      lng: gps.lng,
      radius_meters: gps.radius_meters,
    };
  }

  const triggerRules = rules.filter(
    (r) =>
      r.enabled &&
      r.then.target_task_id === link.task_id &&
      (r.then.type === "show_task" || r.then.type === "unlock_task"),
  );

  for (const rule of triggerRules) {
    if (rule.when.type === "task_solved" && rule.when.source_task_id) {
      const sourceLink = link;
      void sourceLink;
      level.triggers = {
        type: "logic",
        after_level: undefined,
      };
      const srcIndex = link.task_id; // resolved below via taskToLevel
      void srcIndex;
    }
    if (rule.then.delay_minutes) {
      level.triggers = {
        ...(level.triggers ?? {}),
        type: "time",
        after_minutes: rule.then.delay_minutes,
      };
    }
    if (rule.then.delay_meters) {
      level.triggers = {
        ...(level.triggers ?? {}),
        type: "distance",
        after_meters: rule.then.delay_meters,
      };
    }
  }

  return level;
}

/** Compile CMS game + rules → runtime LevelDefinition[] (stored in publish snapshot). */
export function compileStudioGameToLevels(input: {
  game: StudioGame;
  links: StudioGameTaskLink[];
  rules: StudioLogicRule[];
}): LevelDefinition[] {
  const sorted = [...input.links].sort((a, b) => a.sort_order - b.sort_order);
  const taskToLevel = new Map<string, number>();
  sorted.forEach((link, index) => taskToLevel.set(link.task_id, index + 1));

  const levels = sorted.map((link, index) => {
    const level = linkToLevelDefinition(link, index + 1, input.game, input.rules);

    const unlockRule = input.rules.find(
      (r) =>
        r.enabled &&
        r.then.target_task_id === link.task_id &&
        r.when.type === "task_solved" &&
        r.when.source_task_id,
    );

    if (unlockRule?.when.source_task_id) {
      const afterLevel = taskToLevel.get(unlockRule.when.source_task_id);
      if (afterLevel) {
        level.triggers = {
          ...(level.triggers ?? {}),
          type: level.triggers?.type ?? "sequential",
          after_level: afterLevel,
        };
      }
    }

    if (index === 0) {
      const startRule = input.rules.find(
        (r) => r.enabled && r.when.type === "game_start" && r.then.target_task_id === link.task_id,
      );
      if (startRule || index === 0) {
        level.triggers = { ...(level.triggers ?? {}), type: "sequential" };
      }
    }

    return level;
  });

  return levels;
}

export type CompiledGameLogic = {
  rules: StudioLogicRule[];
  levels: LevelDefinition[];
  end_game_on_task_ids: string[];
  hide_on_any_solve_task_ids: string[];
  points_gates: Array<{ points: number; unlock_task_id: string }>;
};

export function compileGameLogic(input: {
  game: StudioGame;
  links: StudioGameTaskLink[];
  rules: StudioLogicRule[];
}): CompiledGameLogic {
  const rules = input.rules.filter((r) => r.enabled);
  const levels = compileStudioGameToLevels({ ...input, rules });

  return {
    rules,
    levels,
    end_game_on_task_ids: rules
      .filter((r) => r.then.type === "end_game" && r.when.source_task_id)
      .map((r) => r.when.source_task_id!),
    hide_on_any_solve_task_ids: rules
      .filter(
        (r) =>
          r.when.type === "task_solved_any_team" &&
          r.then.type === "hide_task" &&
          r.then.target_task_id,
      )
      .map((r) => r.then.target_task_id!),
    points_gates: rules
      .filter((r) => r.when.type === "team_points_at_least" && r.then.target_task_id)
      .map((r) => ({
        points: r.when.points ?? 0,
        unlock_task_id: r.then.target_task_id!,
      })),
  };
}
