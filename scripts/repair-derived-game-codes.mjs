import { readFileSync } from "node:fs";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

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
    if (!response.ok) {
      throw new Error(`${path}: ${response.status} ${await response.text()}`);
    }
    if (response.status === 204) return [];
    return response.json();
  };
}

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

function mint(taken) {
  for (let i = 0; i < 40; i += 1) {
    const candidate = generateCode();
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  throw new Error("Spiel-Code konnte nicht erzeugt werden.");
}

const gridEnv = loadEnv(new URL("../.env.local", import.meta.url).pathname);
const exitEnv = loadEnv("/Users/dervis/Developer/exitmania/next-app/.env.local");
if (!gridEnv.NEXT_PUBLIC_SUPABASE_URL || !gridEnv.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("GRID env fehlt.");
}
if (!exitEnv.NEXT_PUBLIC_SUPABASE_URL || !exitEnv.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Exitmania env fehlt.");
}
console.log("start");
const grid = rest(gridEnv);
const exitmania = rest(exitEnv);

const orgs = await grid("organizations?slug=eq.exitmania&select=id");
const orgId = orgs[0]?.id;
if (!orgId) throw new Error("Organisation exitmania fehlt.");
console.log("org ok");

const taken = new Set();
const derived = [];
for (let from = 0; ; from += 1000) {
  const to = from + 999;
  const rows = await grid(
    `studio_games?organization_id=eq.${orgId}&is_template=eq.false&select=id,slug,city_slug&order=id&offset=${from}&limit=1000`,
    { headers: { Range: `${from}-${to}` } },
  );
  for (const row of rows) {
    const slug = typeof row.slug === "string" ? row.slug : "";
    if (slug) taken.add(slug);
    if (slug.startsWith("fp-")) {
      derived.push({
        id: row.id,
        slug,
        city_slug: typeof row.city_slug === "string" ? row.city_slug : null,
      });
    }
  }
  if (rows.length < 1000) break;
}
console.log(`found ${derived.length} derived`);

const remaps = [];
const now = new Date().toISOString();
for (const game of derived) {
  const next = mint(taken);
  await grid(`studio_games?id=eq.${game.id}&organization_id=eq.${orgId}`, {
    method: "PATCH",
    body: JSON.stringify({ slug: next, updated_at: now }),
  });
  remaps.push({ from: game.slug, to: next, city_slug: game.city_slug });
  if (remaps.length % 25 === 0) console.log(`grid ${remaps.length}/${derived.length}`);
}
console.log(`grid done ${remaps.length}`);

let eventsUpdated = 0;
const remapByOld = new Map(remaps.map((row) => [row.from, row.to]));
const events = await grid("events?select=id,content_config&content_config->>content_pack_slug=like.fp-*");
for (const event of events) {
  const current = event.content_config && typeof event.content_config === "object" ? event.content_config : {};
  const next = remapByOld.get(current.content_pack_slug);
  if (!next) continue;
  await grid(`events?id=eq.${event.id}`, {
    method: "PATCH",
    body: JSON.stringify({ content_config: { ...current, content_pack_slug: next } }),
  });
  eventsUpdated += 1;
}

let exitmaniaUpdated = 0;
for (const remap of remaps) {
  const byCode = await exitmania(`games?grid_content_pack_slug=eq.${encodeURIComponent(remap.from)}`, {
    method: "PATCH",
    body: JSON.stringify({ grid_content_pack_slug: remap.to }),
  });
  exitmaniaUpdated += byCode.length;

  if (!remap.city_slug) continue;
  const storefront = `first-profiler-${remap.city_slug}`;
  const bySlug = await exitmania(
    `games?grid_content_pack_slug=is.null&or=(slug.eq.${storefront},slug_en.eq.${storefront})`,
    {
      method: "PATCH",
      body: JSON.stringify({ grid_content_pack_slug: remap.to }),
    },
  );
  exitmaniaUpdated += bySlug.length;
}

console.log(
  JSON.stringify(
    {
      repaired: remaps.length,
      eventsUpdated,
      exitmaniaUpdated,
      sample: remaps.slice(0, 5),
      munichKept: taken.has("hew9geeus2"),
    },
    null,
    2,
  ),
);
