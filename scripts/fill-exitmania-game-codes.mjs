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

const STABLE = /^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/;
const grid = rest(loadEnv(new URL("../.env.local", import.meta.url).pathname));
const exitmania = rest(loadEnv("/Users/dervis/Developer/exitmania/next-app/.env.local"));

const orgId = (await grid("organizations?slug=eq.exitmania&select=id"))[0].id;
const gridGames = await pageAll((from, limit) =>
  grid(
    `studio_games?organization_id=eq.${orgId}&is_template=eq.false&select=slug,city_slug&order=id&offset=${from}&limit=${limit}`,
  ),
);
const byCity = new Map();
for (const game of gridGames) {
  if (!game.city_slug || !STABLE.test(game.slug)) continue;
  byCity.set(String(game.city_slug).toLowerCase(), String(game.slug).toLowerCase());
}

const exitGames = await pageAll((from, limit) =>
  exitmania(
    `games?or=(slug.like.first-profiler-*,slug_en.like.first-profiler-*)&select=id,slug,slug_en,grid_content_pack_slug&order=id&offset=${from}&limit=${limit}`,
  ),
);

let already = 0;
let updated = 0;
let unmatched = 0;
const unmatchedSample = [];

async function mapPool(items, size, worker) {
  let index = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (index < items.length) {
        const current = index;
        index += 1;
        await worker(items[current]);
      }
    }),
  );
}

await mapPool(exitGames, 8, async (game) => {
  const current = String(game.grid_content_pack_slug ?? "").toLowerCase();
  if (STABLE.test(current)) {
    already += 1;
    return;
  }
  const slug = String(game.slug ?? "").toLowerCase();
  const slugEn = String(game.slug_en ?? "").toLowerCase();
  const city = (slug.startsWith("first-profiler-") ? slug.slice(15) : null)
    || (slugEn.startsWith("first-profiler-") ? slugEn.slice(15) : null);
  const next = city ? byCity.get(city) : null;
  if (!next) {
    unmatched += 1;
    if (unmatchedSample.length < 8) unmatchedSample.push({ slug: game.slug, current, city });
    return;
  }
  await exitmania(`games?id=eq.${game.id}`, {
    method: "PATCH",
    body: JSON.stringify({ grid_content_pack_slug: next }),
  });
  updated += 1;
  if (updated % 100 === 0) console.log(`filled ${updated}`);
});

const leftover = await exitmania("games?grid_content_pack_slug=like.fp-*&select=id&limit=3");
const wolf = await exitmania(
  "games?or=(slug.eq.first-profiler-wolfenbuettel,slug.eq.first-profiler-wolfenbuttel)&select=slug,grid_content_pack_slug",
);

console.log(
  JSON.stringify(
    {
      exitFirstProfiler: exitGames.length,
      alreadyStable: already,
      filled: updated,
      unmatched,
      unmatchedSample,
      leftoverFp: leftover.length,
      wolfenbuttel: wolf,
    },
    null,
    2,
  ),
);
