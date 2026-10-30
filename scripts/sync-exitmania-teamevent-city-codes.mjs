/**
 * Ensure Mad Infection + AI Hacker have cities_events rows + tells codes for ALL Exitmania cities.
 * Inserts missing city links (so later auto-provision can resolve every city).
 *
 * Requires migration 20261030150000_cities_events_tells_content_pack_slug.sql applied.
 *
 *   node scripts/sync-exitmania-teamevent-city-codes.mjs
 *   node scripts/sync-exitmania-teamevent-city-codes.mjs --apply
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

const PRODUCTS = [
  { eventSlug: "mad-infection", recipeName: "Mad Infection Standard Game" },
  { eventSlug: "ai-hacker", recipeName: "AI Hacker Standard Game" },
];

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
    const text = await response.text();
    if (!text) return [];
    return JSON.parse(text);
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

const cities = await pageAll((from, limit) =>
  exitmania(`cities?select=id,slug&order=slug&offset=${from}&limit=${limit}`),
);

const summary = [];

for (const product of PRODUCTS) {
  const recipe = (
    await grid(
      `studio_compose_recipes?name=eq.${encodeURIComponent(product.recipeName)}&select=id,name&limit=1`,
    )
  )[0];
  if (!recipe) throw new Error(`Recipe fehlt: ${product.recipeName}`);

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

  const event = (
    await exitmania(`remote_events?slug=eq.${product.eventSlug}&select=id,slug&limit=1`)
  )[0];
  if (!event) throw new Error(`remote_events fehlt: ${product.eventSlug}`);

  const links = await pageAll((from, limit) =>
    exitmania(
      `cities_events?event_id=eq.${event.id}&select=id,city_id,event_id,tells_content_pack_slug&offset=${from}&limit=${limit}`,
    ),
  );
  const linkByCity = new Map(links.map((l) => [l.city_id, l]));

  function resolveCode(emSlug) {
    const direct = byTellsCity.get(emSlug);
    if (direct) return { code: direct, via: emSlug };
    const alias = CITY_ALIASES[emSlug];
    if (alias && byTellsCity.has(alias)) return { code: byTellsCity.get(alias), via: alias };
    return null;
  }

  const plan = { already: 0, fill: [], change: [], create: [], unmatched: [] };

  for (const city of cities) {
    const emSlug = String(city.slug ?? "").toLowerCase();
    const resolved = resolveCode(emSlug);
    if (!resolved) {
      plan.unmatched.push({ city: emSlug, city_id: city.id });
      continue;
    }
    const link = linkByCity.get(city.id);
    if (!link) {
      plan.create.push({
        city_id: city.id,
        event_id: event.id,
        city: emSlug,
        to: resolved.code,
        tellsCity: resolved.via,
      });
      continue;
    }
    const current = (link.tells_content_pack_slug ?? "").trim().toLowerCase();
    if (current === resolved.code) {
      plan.already += 1;
      continue;
    }
    const row = {
      id: link.id,
      city: emSlug,
      from: current || null,
      to: resolved.code,
      tellsCity: resolved.via,
    };
    if (!current) plan.fill.push(row);
    else plan.change.push(row);
  }

  summary.push({
    event: product.eventSlug,
    recipe: recipe.name,
    tellsGames: tellsGames.length,
    exitCities: cities.length,
    existingLinks: links.length,
    alreadyOk: plan.already,
    wouldFill: plan.fill.length,
    wouldChange: plan.change.length,
    wouldCreate: plan.create.length,
    unmatched: plan.unmatched.length,
    createSample: plan.create.slice(0, 8),
    unmatchedSample: plan.unmatched.slice(0, 10),
    _creates: plan.create,
    _patches: [...plan.fill, ...plan.change],
  });
}

console.log(
  JSON.stringify(
    {
      dryRun: !apply,
      products: summary.map(({ _creates, _patches, ...rest }) => rest),
    },
    null,
    2,
  ),
);

if (!apply) {
  console.error("\nDry-run only. Re-run with --apply to write.");
  process.exit(0);
}

let created = 0;
let patched = 0;

for (const product of summary) {
  // batch inserts of 100
  for (let i = 0; i < product._creates.length; i += 100) {
    const batch = product._creates.slice(i, i + 100).map((row) => ({
      city_id: row.city_id,
      event_id: row.event_id,
      tells_content_pack_slug: row.to,
    }));
    await exitmania("cities_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(batch),
    });
    created += batch.length;
    console.error(`created ${created}`);
  }
  for (const row of product._patches) {
    await exitmania(`cities_events?id=eq.${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ tells_content_pack_slug: row.to }),
    });
    patched += 1;
    if (patched % 100 === 0) console.error(`patched ${patched}`);
  }
}

console.log(JSON.stringify({ created, patched }, null, 2));
