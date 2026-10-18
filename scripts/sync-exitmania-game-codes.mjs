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
      signal: AbortSignal.timeout(20000),
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

const gridEnv = loadEnv(new URL("../.env.local", import.meta.url).pathname);
const exitEnv = loadEnv("/Users/dervis/Developer/exitmania/next-app/.env.local");
const grid = rest(gridEnv);
const exitmania = rest(exitEnv);

const orgId = (await grid("organizations?slug=eq.exitmania&select=id"))[0]?.id;
if (!orgId) throw new Error("Organisation exitmania fehlt.");

const gridGames = await pageAll((from, limit) =>
  grid(
    `studio_games?organization_id=eq.${orgId}&is_template=eq.false&select=slug,city_slug&order=id&offset=${from}&limit=${limit}`,
  ),
);

const byCity = new Map();
for (const game of gridGames) {
  if (!game.city_slug || !game.slug || game.slug.startsWith("fp-")) continue;
  if (game.slug === "hew9geeus2") continue;
  byCity.set(String(game.city_slug).toLowerCase(), String(game.slug).toLowerCase());
}

const exitGames = await pageAll((from, limit) =>
  exitmania(
    `games?grid_content_pack_slug=like.fp-*&select=id,slug,slug_en,grid_content_pack_slug&order=id&offset=${from}&limit=${limit}`,
  ),
);

console.log(`grid cities ${byCity.size}; exitmania fp- ${exitGames.length}`);

let updated = 0;
let skipped = 0;
const unmatched = [];

async function mapPool(items, size, worker) {
  let index = 0;
  const workers = Array.from({ length: size }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current], current);
    }
  });
  await Promise.all(workers);
}

await mapPool(exitGames, 8, async (game) => {
  const old = String(game.grid_content_pack_slug ?? "").toLowerCase();
  const city = old.startsWith("fp-")
    ? old.slice(3)
    : String(game.slug ?? "")
        .toLowerCase()
        .replace(/^first-profiler-/, "");
  const next = byCity.get(city);
  if (!next) {
    unmatched.push({ slug: game.slug, old, city });
    skipped += 1;
    return;
  }
  if (old === next) return;
  await exitmania(`games?id=eq.${game.id}`, {
    method: "PATCH",
    body: JSON.stringify({ grid_content_pack_slug: next }),
  });
  updated += 1;
  if (updated % 50 === 0) console.log(`updated ${updated}/${exitGames.length}`);
});

console.log(
  JSON.stringify(
    {
      updated,
      skipped,
      unmatchedSample: unmatched.slice(0, 8),
      wolfenbuttel: byCity.get("wolfenbuttel") ?? null,
    },
    null,
    2,
  ),
);
