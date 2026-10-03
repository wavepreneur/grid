/** Authenticated GRID workspace. Same URLs for every customer; org lives in the session. */
export const APP_HOME = "/app";

export const appPaths = {
  home: APP_HOME,
  settings: `${APP_HOME}/settings`,
  tasks: `${APP_HOME}/tasks`,
  taskNew: `${APP_HOME}/tasks/new`,
  task: (id: string) => `${APP_HOME}/tasks/${id}`,
  games: `${APP_HOME}/games`,
  game: (id: string) => `${APP_HOME}/games/${id}`,
  packs: `${APP_HOME}/packs`,
  pack: (id: string) => `${APP_HOME}/packs/${id}`,
  tickets: `${APP_HOME}/tickets`,
  templates: `${APP_HOME}/games#vorlagen`,
  dev: `${APP_HOME}/dev`,
  cockpit: "/cockpit",
  data: "/data",
} as const;

const LEGACY_HOME = new Set([
  "/admin",
  "/admin/",
  "/overview",
  "/overview/",
  "/account",
  "/exitmania",
  "/exitmania/",
]);

export function isWorkspacePath(pathname: string): boolean {
  return (
    pathname === APP_HOME ||
    pathname.startsWith(`${APP_HOME}/`) ||
    pathname === "/data" ||
    pathname.startsWith("/data/") ||
    pathname === "/cockpit" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/overview" ||
    pathname.startsWith("/overview/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/exitmania" ||
    pathname.startsWith("/exitmania/")
  );
}

/** Login `next` and bookmarks: map old CMS URLs onto the workspace. */
export function canonicalizeAppPath(pathname: string): string {
  if (LEGACY_HOME.has(pathname)) return APP_HOME;
  if (pathname.startsWith("/admin/")) return `${APP_HOME}/${pathname.slice("/admin/".length)}`;
  if (pathname.startsWith("/overview/")) return `${APP_HOME}/${pathname.slice("/overview/".length)}`;
  if (pathname.startsWith("/account/")) return APP_HOME;
  if (pathname.startsWith("/exitmania/")) return APP_HOME;
  return pathname;
}

export function isSafeAppNext(pathname: string): boolean {
  return (
    pathname === APP_HOME ||
    pathname.startsWith(`${APP_HOME}/`) ||
    pathname === "/data" ||
    pathname.startsWith("/data/") ||
    pathname === "/cockpit" ||
    pathname.startsWith("/cockpit/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/overview" ||
    pathname.startsWith("/overview/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/exitmania" ||
    pathname.startsWith("/exitmania/")
  );
}
