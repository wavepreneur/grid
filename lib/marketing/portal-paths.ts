import {
  APP_HOME,
  canonicalizeAppPath,
  isSafeAppNext,
  isWorkspacePath,
} from "@/lib/platform/app-paths";

export const PORTAL_HOME = APP_HOME;

export function isPortalAppPath(pathname: string): boolean {
  return isWorkspacePath(pathname);
}

/** Login `next` — only internal app paths, never an open redirect. */
export function safePortalNext(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    typeof raw === "string" &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("://") &&
    isSafeAppNext(raw)
  ) {
    return canonicalizeAppPath(raw);
  }
  return PORTAL_HOME;
}
