/**
 * Sync First Profiler Tells studio_games.slug → Exitmania games.tells_content_pack_slug
 *
 * Exitmania storefront currently sells ~1916 FP city games. Mad/AI/KIRA exist on Tells
 * but have no Exitmania storefront rows yet — this script only fills FP.
 *
 * Usage (from Tells repo root):
 *   node scripts/sync-exitmania-game-codes.mjs          # dry-run
 *   node scripts/sync-exitmania-game-codes.mjs --apply  # write
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

/** Exitmania first-profiler-{key} → Tells studio_games.city_slug */
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

const apply = process.argv.includes("--apply");
const gridEnv = loadEnv(new URL("../.env.local", import.meta.url).pathname);
const exitEnv = loadEnv("/Users/dervis/Developer/exitmania/next-app/.env.local");
const grid = rest(gridEnv);
const exitmania = rest(exitEnv);

const recipe = (
  await grid("studio_compose_recipes?name=ilike.*First%20Profiler*&select=id,name&archived_at=is.null&limit=1")
)[0];
if (!recipe) throw new Error("First Profiler compose recipe fehlt.");

const tellsGames = await pageAll((from, limit) =>
  grid(
    `studio_games?compose_recipe_id=eq.${recipe.id}&select=slug,name,city_slug&order=city_slug&offset=${from}&limit=${limit}`,
  ),
);

const byTellsCity = new Map();
for (const game of tellsGames) {
  if (!game.city_slug || !game.slug) continue;
  byTellsCity.set(String(game.city_slug).toLowerCase(), String(game.slug).toLowerCase());
}

const exitGames = await pageAll((from, limit) =>
  exitmania(
    `games?slug=like.first-profiler-*&select=id,slug,slug_en,title,tells_content_pack_slug&order=slug&offset=${from}&limit=${limit}`,
  ),
);

function resolveCode(emCity) {
  const direct = byTellsCity.get(emCity);
  if (direct) return { code: direct, via: emCity };
  const alias = CITY_ALIASES[emCity];
  if (alias && byTellsCity.has(alias)) return { code: byTellsCity.get(alias), via: alias };
  return null;
}

/** Codes already claimed by another Exitmania row (unique index). */
const claimedBy = new Map();
for (const game of exitGames) {
  const code = (game.tells_content_pack_slug ?? "").trim().toLowerCase();
  if (code) claimedBy.set(code, game.slug);
}

const plan = { already: 0, fill: [], change: [], twinCovered: [], unmatched: [] };

for (const game of exitGames) {
  const emCity = String(game.slug ?? "")
    .toLowerCase()
    .replace(/^first-profiler-/, "");
  const resolved = resolveCode(emCity);
  const current = (game.tells_content_pack_slug ?? "").trim().toLowerCase();
  if (!resolved) {
    plan.unmatched.push({ slug: game.slug, city: emCity, current: current || null });
    continue;
  }
  if (current === resolved.code) {
    plan.already += 1;
    continue;
  }
  const holder = claimedBy.get(resolved.code);
  if (holder && holder !== game.slug) {
    plan.twinCovered.push({
      slug: game.slug,
      code: resolved.code,
      heldBy: holder,
    });
    continue;
  }
  const row = {
    id: game.id,
    slug: game.slug,
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
      tellsFp: tellsGames.length,
      exitFp: exitGames.length,
      alreadyOk: plan.already,
      wouldFill: plan.fill.length,
      wouldChange: plan.change.length,
      twinCovered: plan.twinCovered.length,
      unmatched: plan.unmatched.length,
      fillSample: plan.fill,
      twinSample: plan.twinCovered,
      changeSample: plan.change.slice(0, 10),
      unmatchedSample: plan.unmatched.slice(0, 20),
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
  await exitmania(`games?id=eq.${row.id}`, {
    method: "PATCH",
    body: JSON.stringify({ tells_content_pack_slug: row.to }),
  });
  updated += 1;
  if (updated % 25 === 0) console.error(`updated ${updated}/${writes.length}`);
}

console.log(JSON.stringify({ applied: updated }, null, 2));
