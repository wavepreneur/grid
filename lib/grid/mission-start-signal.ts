"use client";

const WINDOW_MS = 20_000;
const CREEP_MS = 4500;

type MissionStartMeta = {
  at: number;
  progress: number;
  playerCount: number;
};

function storageKey(inviteCode: string, joinCode: string): string {
  return `grid:mission-starting:${inviteCode.toUpperCase()}:${joinCode.toUpperCase()}`;
}

function readMeta(inviteCode: string, joinCode: string): MissionStartMeta | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey(inviteCode, joinCode));
  if (!raw) return null;

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    if (Date.now() - asNumber >= WINDOW_MS) return null;
    return { at: asNumber, progress: 8, playerCount: 0 };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MissionStartMeta>;
    const at = Number(parsed.at ?? 0);
    if (!Number.isFinite(at) || at <= 0 || Date.now() - at >= WINDOW_MS) return null;
    return {
      at,
      progress: Math.max(8, Number(parsed.progress) || 8),
      playerCount: Math.max(0, Number(parsed.playerCount) || 0),
    };
  } catch {
    return null;
  }
}

function writeMeta(inviteCode: string, joinCode: string, meta: MissionStartMeta): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(storageKey(inviteCode, joinCode), JSON.stringify(meta));
}

/** Mark that this device is leaving the lobby. Does not reset an in-flight start clock. */
export function markMissionStarting(
  inviteCode: string,
  joinCode: string,
  playerCount?: number,
): void {
  const prev = readMeta(inviteCode, joinCode);
  writeMeta(inviteCode, joinCode, {
    at: prev?.at ?? Date.now(),
    progress: prev?.progress ?? 8,
    playerCount: playerCount && playerCount > 0 ? playerCount : (prev?.playerCount ?? 0),
  });
}

export function missionStartBegunAt(inviteCode: string, joinCode: string): number | null {
  return readMeta(inviteCode, joinCode)?.at ?? null;
}

export function missionStartPlayerCount(inviteCode: string, joinCode: string): number {
  return readMeta(inviteCode, joinCode)?.playerCount ?? 0;
}

export function persistStartProgress(
  inviteCode: string,
  joinCode: string,
  progress: number,
): number {
  const prev = readMeta(inviteCode, joinCode);
  const next = Math.min(100, Math.max(prev?.progress ?? 8, progress, 8));
  writeMeta(inviteCode, joinCode, {
    at: prev?.at ?? Date.now(),
    progress: next,
    playerCount: prev?.playerCount ?? 0,
  });
  return next;
}

/** Shared 0–100 fill so lobby overlay and play gate stay on the same bar. */
export function missionStartProgress(inviteCode: string, joinCode: string): number {
  const meta = readMeta(inviteCode, joinCode);
  const elapsed = meta ? Date.now() - meta.at : 0;
  const crept = Math.min(88, 8 + (elapsed / CREEP_MS) * 80);
  return Math.max(meta?.progress ?? 8, crept);
}

export function isMissionStarting(inviteCode: string, joinCode: string): boolean {
  return readMeta(inviteCode, joinCode) != null;
}

export function clearMissionStarting(inviteCode: string, joinCode: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(inviteCode, joinCode));
}
