import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PortalProfile = {
  name: string;
  email: string;
  password: string;
};

const PROFILE_PATH = path.join(process.cwd(), ".data", "portal-profile.json");

function defaults(): PortalProfile {
  return {
    name: "Dervis Kilic",
    email: process.env.GRID_PORTAL_EMAIL?.trim().toLowerCase() || "dervis@exitmania.com",
    password: process.env.GRID_PORTAL_PASSWORD ?? "",
  };
}

export async function getPortalProfile(): Promise<PortalProfile> {
  try {
    const raw = await readFile(PROFILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<PortalProfile>;
    const fallback = defaults();
    return {
      name: parsed.name?.trim() || fallback.name,
      email: parsed.email?.trim().toLowerCase() || fallback.email,
      password: parsed.password || fallback.password,
    };
  } catch {
    return defaults();
  }
}

export async function savePortalProfile(next: PortalProfile): Promise<void> {
  await mkdir(path.dirname(PROFILE_PATH), { recursive: true });
  await writeFile(PROFILE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function firstNameFrom(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}
