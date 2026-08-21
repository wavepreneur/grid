import {
  DEFAULT_TASK_CONTENT,
  type StudioTaskContent,
  type TaskAnswerType,
  type TaskContentTile,
  type TaskNumberFieldCount,
  type TaskScoring,
  type TaskTileMediaType,
} from "@/lib/cms/types";

export function createTaskTileId(): string {
  return `tile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createTaskOptionId(): string {
  return `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createEmptyTile(): TaskContentTile {
  return {
    id: createTaskTileId(),
    media_type: "image",
    media_url: "",
    cover_image_url: "",
  };
}

export function defaultTaskScoring(): TaskScoring {
  return {
    points: 100,
    countdown_seconds: null,
    decay_enabled: false,
    decay_floor: 0,
    allow_reveal_solution: false,
  };
}

function parseMediaType(raw: unknown): TaskTileMediaType {
  if (raw === "image" || raw === "audio" || raw === "video" || raw === "iframe") return raw;
  return "image";
}

function parseTileHint(row: Record<string, unknown>): Pick<TaskContentTile, "hint_text" | "hint_point_cost"> {
  if (row.hint && typeof row.hint === "object") {
    const hint = row.hint as Record<string, unknown>;
    const text = typeof hint.text === "string" ? hint.text.trim() : "";
    if (!text) return {};
    return {
      hint_text: text,
      hint_point_cost:
        typeof hint.point_cost === "number" && hint.point_cost >= 0
          ? Math.round(hint.point_cost)
          : 50,
    };
  }

  const text = typeof row.hint_text === "string" ? row.hint_text.trim() : "";
  if (!text) return {};
  return {
    hint_text: text,
    hint_point_cost:
      typeof row.hint_point_cost === "number" && row.hint_point_cost >= 0
        ? Math.round(row.hint_point_cost)
        : 50,
  };
}

function parseLegacyTaskHints(raw: Record<string, unknown>): Array<{ text: string; point_cost: number }> {
  if (!Array.isArray(raw.hints)) return [];
  return raw.hints.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { text?: string; point_cost?: number };
    if (!row.text?.trim()) return [];
    return [
      {
        text: row.text.trim(),
        point_cost:
          typeof row.point_cost === "number" && row.point_cost >= 0
            ? Math.round(row.point_cost)
            : 50,
      },
    ];
  });
}

function migrateLegacyTiles(raw: Record<string, unknown>): TaskContentTile[] {
  const tiles = raw.tiles;
  if (Array.isArray(tiles) && tiles.length > 0) {
    return tiles.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : createTaskTileId();
      const mediaUrl =
        (typeof row.media_url === "string" ? row.media_url : "") ||
        (typeof row.url === "string" ? row.url : "");
      if (!mediaUrl.trim()) return [];
      return [
        {
          id,
          media_type: parseMediaType(row.media_type ?? row.type),
          media_url: mediaUrl.trim(),
          cover_image_url:
            typeof row.cover_image_url === "string" ? row.cover_image_url.trim() : undefined,
          label: typeof row.label === "string" ? row.label.trim() : undefined,
          ...parseTileHint(row),
        },
      ];
    });
  }

  const openMedia = raw.open_media as { type?: string; url?: string } | undefined;
  const tile = raw.tile as
    | {
        label_image_url?: string;
        image_url?: string;
        display?: string;
      }
    | undefined;

  const cover =
    tile?.label_image_url?.trim() || (tile?.display === "image" ? tile?.image_url?.trim() : "");

  if (openMedia?.type && openMedia.type !== "none" && openMedia.url?.trim()) {
    return [
      {
        id: createTaskTileId(),
        media_type: parseMediaType(openMedia.type),
        media_url: openMedia.url.trim(),
        cover_image_url: cover || undefined,
      },
    ];
  }

  return [];
}

function attachLegacyHintsToTiles(
  tiles: TaskContentTile[],
  legacyHints: Array<{ text: string; point_cost: number }>
): TaskContentTile[] {
  if (!legacyHints.length) return tiles;
  return tiles.map((tile, index) => {
    if (tile.hint_text?.trim()) return tile;
    const hint = legacyHints[index];
    if (!hint) return tile;
    return {
      ...tile,
      hint_text: hint.text,
      hint_point_cost: hint.point_cost,
    };
  });
}

function migrateAnswerType(raw: unknown): TaskAnswerType {
  // Legacy "number" → freitext + code_boxes (handled in normalize).
  if (raw === "number") return "text";
  if (raw === "choice" || raw === "multi_choice" || raw === "text" || raw === "confirm") {
    return raw;
  }
  return "text";
}

function migrateNumberFields(raw: unknown): TaskNumberFieldCount | undefined {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return undefined;
}

/** Alphanumeric chars for code boxes (max 4). */
export function codeBoxChars(answer: string | undefined): string {
  return (answer ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4);
}

/**
 * From typed code (e.g. "A3b4" / "0364") → stored answer + field count.
 * Empty → 1 empty box in the player UI.
 */
export function charsToCodeBoxAnswer(raw: string): {
  answer: string;
  number_fields: TaskNumberFieldCount;
} {
  const chars = codeBoxChars(raw);
  const number_fields = (chars.length === 0
    ? 1
    : Math.min(4, chars.length)) as TaskNumberFieldCount;
  return {
    answer: chars,
    number_fields,
  };
}

/** @deprecated Use codeBoxChars / charsToCodeBoxAnswer */
export function numberAnswerToDigits(answer: string | undefined): string {
  return codeBoxChars(answer).replace(/[^0-9]/g, "");
}

/** @deprecated Use charsToCodeBoxAnswer */
export function digitsToNumberAnswer(raw: string): {
  answer: string;
  number_fields: TaskNumberFieldCount;
} {
  return charsToCodeBoxAnswer(raw.replace(/[^0-9]/g, ""));
}

export function joinNumberAnswerParts(parts: string[]): string {
  return parts.map((p) => p.trim()).join("");
}

export function splitNumberAnswerParts(
  answer: string | undefined,
  fieldCount: number,
): string[] {
  const count = Math.min(4, Math.max(1, fieldCount));
  const chars = codeBoxChars(answer);
  if (chars.length > 0) {
    return Array.from({ length: count }, (_, i) => chars[i] ?? "");
  }
  const parts = (answer ?? "").trim() === "" ? [] : (answer ?? "").trim().split(/\s+/);
  return Array.from({ length: count }, (_, i) => parts[i] ?? "");
}

function deriveCodeBoxFields(
  answer: string | undefined,
  fallback: unknown,
): TaskNumberFieldCount {
  const chars = codeBoxChars(answer);
  if (chars.length >= 1 && chars.length <= 4) {
    return chars.length as TaskNumberFieldCount;
  }
  return migrateNumberFields(fallback) ?? 1;
}

/** Normalize persisted JSON + migrate legacy tile/open_media shape. */
export function normalizeTaskContent(raw: unknown): StudioTaskContent {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TASK_CONTENT, scoring: defaultTaskScoring(), tiles: [] };
  }

  const source = raw as Record<string, unknown>;
  const legacyTile = source.tile as
    | {
        label_image_url?: string;
        image_url?: string;
        display?: string;
      }
    | undefined;
  const heroFromLegacy =
    legacyTile?.label_image_url?.trim() ||
    (legacyTile?.display === "image" ? legacyTile?.image_url?.trim() : "");

  const scoringRaw = source.scoring as TaskScoring | undefined;
  const scoring: TaskScoring = {
    points: typeof scoringRaw?.points === "number" ? scoringRaw.points : defaultTaskScoring().points,
    countdown_seconds:
      scoringRaw?.countdown_seconds === null || scoringRaw?.countdown_seconds === undefined
        ? null
        : Math.max(0, Number(scoringRaw.countdown_seconds) || 0),
    decay_enabled: Boolean(scoringRaw?.decay_enabled),
    decay_floor:
      typeof scoringRaw?.decay_floor === "number"
        ? Math.max(0, scoringRaw.decay_floor)
        : defaultTaskScoring().decay_floor,
    allow_reveal_solution: Boolean(scoringRaw?.allow_reveal_solution),
  };

  const options = Array.isArray(source.options)
    ? source.options.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as { id?: string; label?: string; correct?: boolean };
        if (!row.label?.trim()) return [];
        return [
          {
            id: row.id?.trim() || createTaskOptionId(),
            label: row.label.trim(),
            correct: Boolean(row.correct),
          },
        ];
      })
    : undefined;

  const legacyHints = parseLegacyTaskHints(source);
  const tiles = attachLegacyHintsToTiles(migrateLegacyTiles(source), legacyHints);

  const answer_type = migrateAnswerType(source.answer_type);
  const legacyNumberType = source.answer_type === "number";
  const code_boxes = Boolean(source.code_boxes) || legacyNumberType;
  const rawAnswer = typeof source.answer === "string" ? source.answer : undefined;
  const boxed = code_boxes && answer_type === "text" ? charsToCodeBoxAnswer(rawAnswer ?? "") : null;

  return {
    hero_image_url:
      (typeof source.hero_image_url === "string" ? source.hero_image_url.trim() : "") ||
      heroFromLegacy ||
      undefined,
    question: typeof source.question === "string" ? source.question : undefined,
    answer: boxed ? boxed.answer || undefined : rawAnswer,
    answer_type,
    code_boxes: answer_type === "text" ? code_boxes : undefined,
    number_fields: boxed
      ? boxed.number_fields
      : code_boxes
        ? deriveCodeBoxFields(rawAnswer, source.number_fields)
        : undefined,
    options,
    tiles,
    scoring,
    success_title:
      typeof source.success_title === "string" && source.success_title.trim()
        ? source.success_title.trim()
        : undefined,
    success_info:
      typeof source.success_info === "string" && source.success_info.trim()
        ? source.success_info.trim()
        : undefined,
  };
}

export function correctOptionIds(content: StudioTaskContent): string[] {
  return (content.options ?? []).filter((o) => o.correct).map((o) => o.id);
}
