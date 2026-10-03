import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PortalAccount = {
  name: string;
  email: string;
  password: string;
  orgSlug: string;
};

/** @deprecated Use PortalAccount — kept so existing imports keep compiling. */
export type PortalProfile = PortalAccount;

const PROFILE_PATH = path.join(process.cwd(), ".data", "portal-profile.json");

function defaultAccount(): PortalAccount {
  return {
    name: "Dervis Kilic",
    email: process.env.GRID_PORTAL_EMAIL?.trim().toLowerCase() || "dervis@exitmania.com",
    password: process.env.GRID_PORTAL_PASSWORD ?? "",
    orgSlug: process.env.GRID_PORTAL_ORG_SLUG?.trim() || "exitmania",
  };
}

function normalizeAccount(raw: Partial<PortalAccount>, fallback: PortalAccount): PortalAccount {
  return {
    name: raw.name?.trim() || fallback.name,
    email: raw.email?.trim().toLowerCase() || fallback.email,
    password: raw.password || fallback.password,
    orgSlug: raw.orgSlug?.trim() || fallback.orgSlug,
  };
}

export async function listPortalAccounts(): Promise<PortalAccount[]> {
  const fallback = defaultAccount();
  try {
    const raw = await readFile(PROFILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as
      | Partial<PortalAccount>
      | { accounts?: Partial<PortalAccount>[] };

    if (parsed && "accounts" in parsed && Array.isArray(parsed.accounts)) {
      const accounts = parsed.accounts
        .map((item) => normalizeAccount(item, fallback))
        .filter((item) => item.email && item.password);
      return accounts.length > 0 ? accounts : [fallback];
    }

    return [normalizeAccount(parsed as Partial<PortalAccount>, fallback)];
  } catch {
    return [fallback];
  }
}

export async function getPortalProfile(): Promise<PortalAccount> {
  const accounts = await listPortalAccounts();
  return accounts[0] ?? defaultAccount();
}

export async function findPortalAccountByEmail(email: string): Promise<PortalAccount | null> {
  const needle = email.trim().toLowerCase();
  const accounts = await listPortalAccounts();
  return accounts.find((account) => account.email === needle) ?? null;
}

export async function savePortalProfile(next: PortalAccount, previousEmail?: string): Promise<void> {
  const accounts = await listPortalAccounts();
  const index = accounts.findIndex(
    (account) => account.email === previousEmail || account.email === next.email,
  );
  if (index >= 0) {
    accounts[index] = next;
  } else if (accounts.length === 1) {
    accounts[0] = next;
  } else {
    accounts.push(next);
  }

  await mkdir(path.dirname(PROFILE_PATH), { recursive: true });
  await writeFile(PROFILE_PATH, `${JSON.stringify({ accounts }, null, 2)}\n`, "utf8");
}

export function firstNameFrom(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}
