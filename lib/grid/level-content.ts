import type { LevelContentTile, LevelTileType } from "@/lib/grid/level-types";

const TILE_TYPES: LevelTileType[] = [
  "image",
  "video",
  "audio",
  "panorama_360",
  "minigame",
  "iframe",
  "pdf",
];

export function parseLevelTiles(value: unknown): LevelContentTile[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const tiles: LevelContentTile[] = [];

  for (const item of value.slice(0, 10)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = row.type;
    const url = row.url;
    const id = row.id;

    if (typeof type !== "string" || !TILE_TYPES.includes(type as LevelTileType)) continue;
    if (typeof url !== "string" || !url.trim()) continue;
    if (typeof id !== "string" || !id.trim()) continue;

    const tile: LevelContentTile = {
      id: id.trim(),
      type: type as LevelTileType,
      url: url.trim(),
      label: typeof row.label === "string" ? row.label.trim() : undefined,
    };

    if (row.hint && typeof row.hint === "object") {
      const hintRow = row.hint as Record<string, unknown>;
      const hintText = hintRow.text;
      if (typeof hintText === "string" && hintText.trim()) {
        tile.hint = {
          text: hintText.trim(),
          point_cost:
            typeof hintRow.point_cost === "number" && hintRow.point_cost > 0
              ? hintRow.point_cost
              : undefined,
        };
      }
    }

    tiles.push(tile);
  }

  return tiles.length > 0 ? tiles : undefined;
}

export function tileTypeLabel(type: LevelTileType): string {
  switch (type) {
    case "image":
      return "Bild";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "panorama_360":
      return "360°";
    case "minigame":
      return "Mini-Spiel";
    case "pdf":
      return "PDF";
    default:
      return "Inhalt";
  }
}

export function tileTypeIcon(type: LevelTileType): string {
  switch (type) {
    case "image":
      return "🖼";
    case "video":
      return "▶";
    case "audio":
      return "🔊";
    case "panorama_360":
      return "360";
    case "minigame":
      return "🎮";
    case "pdf":
      return "PDF";
    default:
      return "↗";
  }
}
