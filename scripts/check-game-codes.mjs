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
  };
  return async (path) => {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
      headers,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
    return response.json();
  };
}

const grid = rest(loadEnv(new URL("../.env.local", import.meta.url).pathname));
const exitmania = rest(loadEnv("/Users/dervis/Developer/exitmania/next-app/.env.local"));

const orgs = await grid("organizations?slug=eq.exitmania&select=id");
const orgId = orgs[0].id;

const gridFp = await grid(
  `studio_games?organization_id=eq.${orgId}&slug=like.fp-*&select=slug,city_slug&limit=5`,
);
const gridStable = await grid(
  `studio_games?organization_id=eq.${orgId}&is_template=eq.false&slug=eq.hew9geeus2&select=slug,name,city_slug`,
);
const gridSample = await grid(
  `studio_games?organization_id=eq.${orgId}&is_template=eq.false&city_slug=eq.wolfenbuttel&select=slug,name,city_slug`,
);
const gridCount = await fetch(
  `${loadEnv(new URL("../.env.local", import.meta.url).pathname).NEXT_PUBLIC_SUPABASE_URL}/rest/v1/studio_games?organization_id=eq.${orgId}&is_template=eq.false&select=id`,
  {
    headers: {
      apikey: loadEnv(new URL("../.env.local", import.meta.url).pathname).SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${loadEnv(new URL("../.env.local", import.meta.url).pathname).SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  },
);

const exitFp = await exitmania("games?grid_content_pack_slug=like.fp-*&select=slug,grid_content_pack_slug&limit=8");
const exitMunich = await exitmania(
  "games?or=(slug.eq.first-profiler-muenchen,slug.eq.first-profiler-munich,grid_content_pack_slug.eq.hew9geeus2)&select=slug,slug_en,grid_content_pack_slug",
);

console.log(
  JSON.stringify(
    {
      gridFp,
      gridStable,
      gridSample,
      gridContentRange: gridCount.headers.get("content-range"),
      exitFp,
      exitMunich,
    },
    null,
    2,
  ),
);
