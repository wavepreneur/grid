/** Stable booking_reference for one Studio playtest session per game. */
export function studioTestBookingReference(gameId: string): string {
  return `studio:test:${gameId}`;
}

export function isStudioTestBookingReference(ref: string | null | undefined): boolean {
  return typeof ref === "string" && ref.startsWith("studio:test:");
}

export const STUDIO_TEST_MAX_PLAYERS = 3;
