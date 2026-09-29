/**
 * Named layer packs (city / mission / team) composed onto a thin game row.
 * Games without pack FKs keep using studio_game_tasks unchanged.
 */

import {
  hasAuthoredBonusBindings,
  parseBonusWhen,
  type BonusAudience,
  type BonusWhen,
} from "@/lib/cms/bonus-bindings";
import type { GameLinkOverrides } from "@/lib/cms/game-link-config";
import { parseLinkLayer } from "@/lib/cms/game-link-config";
import { parseGpsOverride, type GpsPin } from "@/lib/cms/gps-defaults";
import { parseStudioLanguage, type StudioLanguage } from "@/lib/cms/languages";
import type { RoleAssignment, StudioLayer } from "@/lib/cms/layer-model";
import { isStudioLayer } from "@/lib/cms/layer-model";
import { DEFAULT_TASK_CONTENT, type StudioGame, type StudioGameTaskLink, type StudioTask } from "@/lib/cms/types";

export const PACK_SLOT_MAX = 30;
export const PACK_SEARCH_LIMIT = 40;
export const COMPOSE_GAMES_MAX = 250;
export const DUPLICATE_PACKS_MAX = 100;
export const CREATE_CITIES_MAX = 100;

export type StudioLayerPack = {
  id: string;
  organization_id: string;
  layer: StudioLayer;
  slug: string;
  name: string;
  description: string;
  city_id: string | null;
  city_slug: string | null;
  language: StudioLanguage;
  translations: Record<string, unknown>;
  slot_count: number;
  created_from_pack_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StudioLayerPackItem = {
  id: string;
  pack_id: string;
  task_id: string;
  sort_order: number;
  overrides: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  task: StudioTask;
};

export type LayerPackItemOverrides = {
  location?: GpsPin;
  gps?: GpsPin;
  station?: GameLinkOverrides["station"];
  /** Layer 3: which mission slot (0-based). */
  bind_slot?: number;
  role?: RoleAssignment;
  when?: BonusWhen;
  locales?: Record<string, unknown>;
};

export function gameUsesLayerPacks(game: Pick<StudioGame, "layer1_pack_id" | "layer2_pack_id" | "layer3_pack_id">): boolean {
  return Boolean(game.layer1_pack_id || game.layer2_pack_id || game.layer3_pack_id);
}

export function packLinkId(packId: string, itemId: string): string {
  return `pack:${packId}:item:${itemId}`;
}

export function parsePackLinkId(linkId: string): { packId: string; itemId: string } | null {
  const match = /^pack:([0-9a-f-]{36}):item:([0-9a-f-]{36})$/i.exec(linkId);
  if (!match) return null;
  return { packId: match[1]!, itemId: match[2]! };
}

const GEO_OVERRIDE_KEYS = new Set([
  "location",
  "gps",
  "station",
  "unlock",
  "opener_task_id",
  "opener_points",
  "arrival_quiz",
  "geo_task_id",
  "opener_enabled",
]);

/** GPS / opener / station belong on the city pack, never on shared L2. */
export function splitOverridesForLayerPacks(overrides: Record<string, unknown>): {
  geo: Record<string, unknown>;
  mission: Record<string, unknown>;
} {
  const geo: Record<string, unknown> = {};
  const mission: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (GEO_OVERRIDE_KEYS.has(key)) geo[key] = value;
    else mission[key] = value;
  }
  return { geo, mission };
}

export function stripGeoFromMissionOverrides(
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  return splitOverridesForLayerPacks(overrides).mission;
}

export function pickGeoOverrides(overrides: Record<string, unknown>): Record<string, unknown> {
  return splitOverridesForLayerPacks(overrides).geo;
}

export function packItemToGameLink(args: {
  gameId: string;
  packId: string;
  item: StudioLayerPackItem;
  layer: StudioLayer;
}): StudioGameTaskLink {
  return virtualLink({
    gameId: args.gameId,
    packId: args.packId,
    item: args.item,
    layer: args.layer,
    overrides: { ...args.item.overrides },
  });
}

export function layerPackLabelDe(layer: StudioLayer): string {
  if (layer === 1) return "Stadt";
  if (layer === 2) return "Mission";
  return "Team";
}

export function layerPackTitleDe(layer: StudioLayer): string {
  if (layer === 1) return "Städte (Layer 1)";
  if (layer === 2) return "Missionen (Layer 2)";
  return "Teams (Layer 3)";
}

export function layerPackHintDe(layer: StudioLayer): string {
  if (layer === 1) {
    return "Die Einstiegsaufgaben dieser Stadt plus Reihenfolge und Bedingungen. Stadt aus Exitmania wählen — der Slug darf sich ändern. Duplizieren kopiert Aufgaben und Logik.";
  }
  if (layer === 2) {
    return "Die Mission. Einmal, für alle Städte. Nicht kopieren, nur andocken.";
  }
  return "Bonusaufgaben und wann sie erscheinen. Einmal, für alle Städte.";
}

export function mapStudioTaskRow(raw: Record<string, unknown>): StudioTask {
  return {
    ...(raw as StudioTask),
    content: { ...DEFAULT_TASK_CONTENT, ...((raw.content as StudioTask["content"]) ?? {}) },
    tags: (raw.tags as string[]) ?? [],
    layer: (raw.layer as StudioTask["layer"]) ?? 2,
    content_context: (raw.content_context as StudioTask["content_context"]) ?? "any",
    role_assignment: (raw.role_assignment as StudioTask["role_assignment"]) ?? "team",
  };
}

export function normalizeLayerPackRow(row: Record<string, unknown>): StudioLayerPack {
  const layerRaw = row.layer;
  const layer: StudioLayer = isStudioLayer(layerRaw) ? layerRaw : 2;
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    layer,
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    city_id: typeof row.city_id === "string" && row.city_id.trim() ? row.city_id.trim() : null,
    city_slug: typeof row.city_slug === "string" && row.city_slug.trim() ? row.city_slug.trim() : null,
    language: parseStudioLanguage(row.language),
    translations: (row.translations as Record<string, unknown>) ?? {},
    slot_count: typeof row.slot_count === "number" ? row.slot_count : 0,
    created_from_pack_id:
      typeof row.created_from_pack_id === "string" ? row.created_from_pack_id : null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function parsePackItemOverrides(raw: unknown): LayerPackItemOverrides {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const gps = parseGpsOverride(o.gps ?? o.location) ?? undefined;
  const bindRaw = o.bind_slot;
  const bind_slot =
    typeof bindRaw === "number" && Number.isInteger(bindRaw) && bindRaw >= 0 ? bindRaw : undefined;
  const roleRaw = o.role;
  const role: RoleAssignment | undefined =
    roleRaw === "alpha" ||
    roleRaw === "beta" ||
    roleRaw === "gamma" ||
    roleRaw === "team" ||
    roleRaw === "none"
      ? roleRaw
      : undefined;
  const station =
    o.station && typeof o.station === "object"
      ? (o.station as GameLinkOverrides["station"])
      : undefined;
  return {
    ...(gps ? { location: gps, gps } : {}),
    ...(station ? { station } : {}),
    ...(bind_slot !== undefined ? { bind_slot } : {}),
    ...(role ? { role } : {}),
    when: parseBonusWhen(o.when),
    locales: o.locales && typeof o.locales === "object" ? (o.locales as Record<string, unknown>) : undefined,
  };
}

function virtualLink(args: {
  gameId: string;
  packId: string;
  item: StudioLayerPackItem;
  layer: StudioLayer;
  overrides: Record<string, unknown>;
}): StudioGameTaskLink {
  return {
    id: packLinkId(args.packId, args.item.id),
    game_id: args.gameId,
    task_id: args.item.task_id,
    layer: args.layer,
    sort_order: args.item.sort_order,
    overrides: args.overrides,
    task: args.item.task,
  };
}

function bonusAudience(role: RoleAssignment | undefined): BonusAudience {
  if (role === "alpha" || role === "beta" || role === "gamma" || role === "team") return role;
  return "gamma";
}

export function mergePackLinksOntoGame(input: {
  game: StudioGame;
  legacyLinks: StudioGameTaskLink[];
  packs: Partial<Record<StudioLayer, StudioLayerPackItem[]>>;
}): StudioGameTaskLink[] {
  const gameId = input.game.id;
  const legacyByLayer = {
    1: input.legacyLinks.filter((link) => parseLinkLayer(link) === 1),
    2: input.legacyLinks.filter((link) => parseLinkLayer(link) === 2),
    3: input.legacyLinks.filter((link) => parseLinkLayer(link) === 3),
  };

  const pack1 = input.packs[1];
  const pack2 = input.packs[2];
  const pack3 = input.packs[3];

  const layer1: StudioGameTaskLink[] = pack1
    ? pack1.map((item) => {
        const parsed = parsePackItemOverrides(item.overrides);
        const overrides: Record<string, unknown> = { ...item.overrides };
        if (parsed.gps) {
          overrides.location = parsed.gps;
          overrides.gps = parsed.gps;
        }
        return virtualLink({
          gameId,
          packId: item.pack_id,
          item,
          layer: 1,
          overrides,
        });
      })
    : legacyByLayer[1];

  const layer2Base: StudioGameTaskLink[] = pack2
    ? pack2.map((item) =>
        virtualLink({
          gameId,
          packId: item.pack_id,
          item,
          layer: 2,
          overrides: { ...item.overrides },
        }),
      )
    : legacyByLayer[2];

  const layer3: StudioGameTaskLink[] = pack3
    ? pack3.map((item) => {
        const parsed = parsePackItemOverrides(item.overrides);
        const overrides: Record<string, unknown> = { ...item.overrides };
        if (parsed.role) overrides.role = parsed.role;
        return virtualLink({
          gameId,
          packId: item.pack_id,
          item,
          layer: 3,
          overrides,
        });
      })
    : legacyByLayer[3];

  const layer2 = layer2Base.map((link, index) => {
    const overrides: GameLinkOverrides = { ...(link.overrides as GameLinkOverrides) };
    const geo =
      layer1.find((item) => item.sort_order === link.sort_order) ?? layer1[index];
    if (geo) {
      overrides.geo_task_id = geo.task_id;
      const geoRaw = geo.overrides as GameLinkOverrides;
      const openerOff = geoRaw.opener_enabled === false;
      if (openerOff) {
        overrides.opener_enabled = false;
        delete overrides.opener_task_id;
        delete overrides.opener_points;
        delete overrides.arrival_quiz;
      } else {
        overrides.opener_task_id = geoRaw.opener_task_id ?? geo.task_id;
        if (geoRaw.opener_points !== undefined) overrides.opener_points = geoRaw.opener_points;
        if (geoRaw.arrival_quiz) overrides.arrival_quiz = geoRaw.arrival_quiz;
      }
      const geoOverrides = parsePackItemOverrides(geo.overrides);
      if (geoOverrides.gps) {
        overrides.location = geoOverrides.gps;
        overrides.gps = geoOverrides.gps;
      }
      if (geoOverrides.station) overrides.station = geoOverrides.station;
      if (geoRaw.unlock) overrides.unlock = geoRaw.unlock;
    }

    if (!hasAuthoredBonusBindings(overrides)) {
      const bound = layer3.filter((bonus) => {
        const parsed = parsePackItemOverrides(bonus.overrides);
        const slot = parsed.bind_slot ?? bonus.sort_order;
        return slot === (geo?.sort_order ?? index);
      });
      if (pack3 && bound.length > 0) {
        overrides.bonus_bindings = bound.map((bonus) => {
          const parsed = parsePackItemOverrides(bonus.overrides);
          return {
            task_id: bonus.task_id,
            role: bonusAudience(parsed.role),
            when: parsed.when ?? { type: "immediate" as const },
          };
        });
      }
    }

    return { ...link, overrides };
  });

  return [...layer1, ...layer2, ...layer3];
}

export function composeGameName(cityLabel: string | null | undefined, missionName: string | null | undefined): string {
  const city = (cityLabel ?? "").trim();
  const mission = (missionName ?? "").trim();
  if (city && mission) return `${city} · ${mission}`;
  return city || mission || "Neues Spiel";
}
