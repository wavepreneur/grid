/** Stable booking_reference for one Studio playtest session per game. */
export function studioTestBookingReference(gameId: string): string {
  return `studio:test:${gameId}`;
}

export function isStudioTestBookingReference(ref: string | null | undefined): boolean {
  return typeof ref === "string" && ref.startsWith("studio:test:");
}

export function isStudioTestEvent(event: {
  booking_reference?: string | null;
  content_config?: unknown;
}): boolean {
  if (isStudioTestBookingReference(event.booking_reference)) return true;
  if (event.content_config && typeof event.content_config === "object") {
    return Boolean(
      (event.content_config as { is_studio_test?: boolean }).is_studio_test,
    );
  }
  return false;
}

export const STUDIO_TEST_MAX_PLAYERS = 3;
