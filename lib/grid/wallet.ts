import type { TeamGameState } from "@/lib/grid/game-state";
import type { LevelDefinition } from "@/lib/grid/level-types";

export const WALLET_UNLOCK_COST = 250;

export type WalletNote = {
  id: string;
  level: number;
  title: string;
  body: string;
  collected_at: string;
  locked?: boolean;
  purchased_by?: string;
  purchased_by_player_id?: string;
  purchased_at?: string;
};

export function parseWalletNotes(value: unknown): WalletNote[] {
  if (!Array.isArray(value)) return [];
  const notes: WalletNote[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Partial<WalletNote>;
    const level = Number(row.level);
    if (!Number.isFinite(level) || level < 1) continue;
    const locked = row.locked === true;
    const body = typeof row.body === "string" ? row.body.trim() : "";
    if (!locked && !body) continue;
    notes.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `${locked ? "locked" : "wallet"}-L${level}-${notes.length + 1}`,
      level,
      title:
        typeof row.title === "string" && row.title.trim()
          ? row.title.trim()
          : "Hinweis",
      body,
      collected_at:
        typeof row.collected_at === "string" ? row.collected_at : "",
      locked: locked || undefined,
      purchased_by:
        typeof row.purchased_by === "string" && row.purchased_by.trim()
          ? row.purchased_by.trim()
          : undefined,
      purchased_by_player_id:
        typeof row.purchased_by_player_id === "string" &&
        row.purchased_by_player_id.trim()
          ? row.purchased_by_player_id.trim()
          : undefined,
      purchased_at:
        typeof row.purchased_at === "string" ? row.purchased_at : undefined,
    });
  }
  return notes;
}

export function upsertWalletNote(
  wallet: WalletNote[] | undefined,
  note: { level: number; title?: string | null; body?: string | null },
): WalletNote[] {
  const body = note.body?.trim() ?? "";
  if (!body) return wallet ?? [];
  const list = (wallet ?? []).filter(
    (item) => !(item.level === note.level && item.locked),
  );
  if (list.some((item) => item.level === note.level && item.body === body)) {
    return list;
  }
  return [
    ...list,
    {
      id: `wallet-L${note.level}-${list.length + 1}`,
      level: note.level,
      title: note.title?.trim() || "Hinweis",
      body,
      collected_at: new Date().toISOString(),
    },
  ];
}

/** After skip / reveal: keep the slot, hide the text until someone pays. */
export function upsertLockedWalletNote(
  wallet: WalletNote[] | undefined,
  note: { level: number; title?: string | null; hasInfo?: boolean },
): WalletNote[] {
  if (!note.hasInfo) return wallet ?? [];
  const list = wallet ?? [];
  if (list.some((item) => item.level === note.level && !item.locked && item.body)) {
    return list;
  }
  if (list.some((item) => item.level === note.level && item.locked)) {
    return list;
  }
  return [
    ...list,
    {
      id: `locked-L${note.level}`,
      level: note.level,
      title: note.title?.trim() || "Hinweis",
      body: "",
      collected_at: "",
      locked: true,
    },
  ];
}

export function unlockWalletNote(
  wallet: WalletNote[] | undefined,
  note: {
    level: number;
    title?: string | null;
    body: string;
    purchasedBy: string;
    purchasedByPlayerId: string;
  },
): WalletNote[] {
  const body = note.body.trim();
  if (!body) return wallet ?? [];
  const list = wallet ?? [];
  const now = new Date().toISOString();
  const unlocked: WalletNote = {
    id: `wallet-L${note.level}-bought`,
    level: note.level,
    title: note.title?.trim() || "Hinweis",
    body,
    collected_at: now,
    purchased_by: note.purchasedBy,
    purchased_by_player_id: note.purchasedByPlayerId,
    purchased_at: now,
  };
  if (list.some((item) => item.level === note.level)) {
    return list.map((item) => (item.level === note.level ? { ...unlocked, id: item.id } : item));
  }
  return [...list, unlocked];
}

function notesFromCompletedLevels(
  levels: LevelDefinition[],
  statuses: TeamGameState["levels"],
): WalletNote[] {
  const notes: WalletNote[] = [];
  for (const level of levels) {
    const entry = statuses[String(level.level)];
    if (entry?.status !== "completed") continue;
    const body = level.success_info?.trim();
    if (!body) continue;
    if (entry.revealed) {
      notes.push({
        id: `locked-L${level.level}`,
        level: level.level,
        title: level.success_title?.trim() || "Hinweis",
        body: "",
        collected_at: "",
        locked: true,
      });
      continue;
    }
    notes.push({
      id: `content-L${level.level}`,
      level: level.level,
      title: level.success_title?.trim() || "Hinweis",
      body,
      collected_at: entry.completed_at ?? "",
    });
  }
  return notes;
}

/** Stored notes plus already-solved / skipped Studio infos. */
export function visibleWalletNotes(
  stored: WalletNote[] | undefined,
  levels: LevelDefinition[],
  statuses: TeamGameState["levels"],
  options?: { revealLocked?: boolean },
): WalletNote[] {
  const merged = [...(stored ?? [])];
  for (const note of notesFromCompletedLevels(levels, statuses)) {
    const existing = merged.find((item) => item.level === note.level);
    if (existing) {
      if (!existing.locked && existing.body) continue;
      if (existing.locked && note.locked) continue;
      if (existing.locked && !note.locked) {
        merged.splice(merged.indexOf(existing), 1, note);
      }
      continue;
    }
    merged.push(note);
  }
  const sorted = merged.sort((a, b) => a.level - b.level);
  if (!options?.revealLocked) return sorted;
  return sorted.map((note) => {
    if (!note.locked) return note;
    const level = levels.find((item) => item.level === note.level);
    const body = level?.success_info?.trim() ?? note.body;
    return body ? { ...note, body } : note;
  });
}

export function walletMenuHint(notes: WalletNote[]): string {
  const locked = notes.filter((note) => note.locked).length;
  const open = notes.length - locked;
  if (notes.length === 0) return "Gesammelte Hinweise aus den Leveln";
  if (locked && open) return `${open} gesammelt · ${locked} kaufbar`;
  if (locked) {
    return `${locked} ${locked === 1 ? "Hinweis" : "Hinweise"} kaufbar`;
  }
  return `${open} ${open === 1 ? "Hinweis" : "Hinweise"} gesammelt`;
}
