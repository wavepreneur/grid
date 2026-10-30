/**
 * Fill Exitmania cities_games.tells_content_pack_slug for KIRA (GPS city packs).
 * Does NOT touch games.tells_content_pack_slug on kira-signal (Signal page = later).
 *
 * Requires migration 20261030140000_cities_games_tells_content_pack_slug.sql applied.
 *
 *   node scripts/sync-exitmania-kira-city-codes.mjs
 *   node scripts/sync-exitmania-kira-city-codes.mjs --apply
 */
import { readFileSync } from "node:fs";

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const CITY_ALIASES = {
  athens: "athen",
  berlin: "berlin-2aceb00e",
  bruges: "bruegge",
  constana: "constanta",
  dusseldorf: "duesseldorf",
  firenze: "florenz",
  geneva: "genf",
  koln: "koeln",
  lisbon: "lissabon",
  lubeck: "luebeck",
  malaga: "mlaga",
  milano: "mailand",
  munster: "muenster",
  napoli: "neapel",
  neuchtel: "neuchatel",
  torino: "turin",
  venezia: "venedig",
  venice: "venedig",
  zurich: "zuerich",
};

function rest(env) {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  return async (path, init = {}) => {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      signal: AbortSignal.timeout(30000),
      headers: { ...headers, ...init.headers },
    });
    if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
    if (response.status === 204) return [];
    return response.json();
  };
}

async function pageAll(query, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const batch = await query(from, pageSize);
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

const apply = process.argv.includes("--apply");
const grid = rest(loadEnv(new URL("../.env.local", import.meta.url).pathname));
const exitmania = rest(loadEnv("/Users/dervis/Developer/exitmania/next-app/.env.local"));

const recipe = (
  await grid("studio_compose_recipes?name=eq.KIRA%20Standard%20Game&select=id,name&limit=1")
)[0];
if (!recipe) throw new Error("KIRA Standard Game recipe fehlt.");

const tellsGames = await pageAll((from, limit) =>
  grid(
    `studio_games?compose_recipe_id=eq.${recipe.id}&select=slug,city_slug&order=city_slug&offset=${from}&limit=${limit}`,
  ),
);
const byTellsCity = new Map();
for (const game of tellsGames) {
  if (!game.city_slug || !game.slug) continue;
  byTellsCity.set(String(game.city_slug).toLowerCase(), String(game.slug).toLowerCase());
}

const kiraGame = (
  await exitmania("games?slug=eq.kira-signal&select=id,slug,tells_content_pack_slug&limit=1")
)[0];
if (!kiraGame) throw new Error("Exitmania game kira-signal fehlt.");

const links = await pageAll((from, limit) =>
  exitmania(
    `cities_games?game_id=eq.${kiraGame.id}&select=city_id,game_id,tells_content_pack_slug&offset=${from}&limit=${limit}`,
  ),
);
const cities = await pageAll((from, limit) =>
  exitmania(`cities?select=id,slug&order=slug&offset=${from}&limit=${limit}`),
);
const cityById = new Map(cities.map((c) => [c.id, c]));

function resolveCode(emSlug) {
  const direct = byTellsCity.get(emSlug);
  if (direct) return { code: direct, via: emSlug };
  const alias = CITY_ALIASES[emSlug];
  if (alias && byTellsCity.has(alias)) return { code: byTellsCity.get(alias), via: alias };
  return null;
}

const plan = { already: 0, fill: [], change: [], unmatched: [] };

for (const link of links) {
  const city = cityById.get(link.city_id);
  const emSlug = String(city?.slug ?? "").toLowerCase();
  const resolved = resolveCode(emSlug);
  const current = (link.tells_content_pack_slug ?? "").trim().toLowerCase();
  if (!resolved) {
    plan.unmatched.push({ city: emSlug || link.city_id, current: current || null });
    continue;
  }
  if (current === resolved.code) {
    plan.already += 1;
    continue;
  }
  const row = {
    city_id: link.city_id,
    game_id: link.game_id,
    city: emSlug,
    from: current || null,
    to: resolved.code,
    tellsCity: resolved.via,
  };
  if (!current) plan.fill.push(row);
  else plan.change.push(row);
}

console.log(
  JSON.stringify(
    {
      dryRun: !apply,
      recipe: recipe.name,
      kiraGame: kiraGame.slug,
      gameLevelCode: kiraGame.tells_content_pack_slug,
      tellsKira: tellsGames.length,
      cityLinks: links.length,
      alreadyOk: plan.already,
      wouldFill: plan.fill.length,
      wouldChange: plan.change.length,
      unmatched: plan.unmatched.length,
      fillSample: plan.fill.slice(0, 8),
      unmatchedSample: plan.unmatched.slice(0, 15),
    },
    null,
    2,
  ),
);

if (!apply) {
  console.error("\nDry-run only. Re-run with --apply to write.");
  process.exit(0);
}

const writes = [...plan.fill, ...plan.change];
let updated = 0;
for (const row of writes) {
  await exitmania(`cities_games?city_id=eq.${row.city_id}&game_id=eq.${row.game_id}`, {
    method: "PATCH",
    body: JSON.stringify({ tells_content_pack_slug: row.to }),
  });
  updated += 1;
  if (updated % 100 === 0) console.error(`updated ${updated}/${writes.length}`);
}

console.log(JSON.stringify({ applied: updated }, null, 2));
