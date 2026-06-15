const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  return generateCode(length);
}

export function generateJoinCode(length = 6): string {
  return generateCode(length);
}

function generateCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join(
    "",
  );
}

export function buildTeamInviteUrl(
  origin: string,
  inviteCode: string,
  joinCode: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/e/${normalizeCode(inviteCode)}/team/${normalizeCode(joinCode)}`;
}

export function buildEventInviteUrl(origin: string, inviteCode: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/e/${normalizeCode(inviteCode)}`;
}

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidDisplayName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 32;
}
