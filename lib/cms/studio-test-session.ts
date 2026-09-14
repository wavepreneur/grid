/** Stable booking_reference for one Studio playtest session per game. */
export function studioTestBookingReference(gameId: string): string {
  return `studio:test:${gameId}`;
}

export function isStudioTestBookingReference(ref: string | null | undefined): boolean {
  return typeof ref === "string" && ref.startsWith("studio:test:");
}

export function isPilotBookingReference(ref: string | null | undefined): boolean {
  return typeof ref === "string" && ref.startsWith("exitmania:pilot:");
}

export function isStudioTestEvent(event: {
  booking_reference?: string | null;
  content_config?: unknown;
  title?: string | null;
}): boolean {
  if (isStudioTestBookingReference(event.booking_reference)) return true;
  if (typeof event.title === "string" && event.title.startsWith("[Test]")) return true;
  if (event.content_config && typeof event.content_config === "object") {
    return Boolean(
      (event.content_config as { is_studio_test?: boolean }).is_studio_test,
    );
  }
  return false;
}

/**
 * Studio tests and Exitmania GRID pilots: briefing + Start, no auto-start.
 * Live booked events keep their roster timer.
 */
export function needsBriefingBeforePlay(event: {
  booking_reference?: string | null;
  content_config?: unknown;
  title?: string | null;
}): boolean {
  return isStudioTestEvent(event) || isPilotBookingReference(event.booking_reference);
}

/** Hold on the start room until Alpha taps Start. */
export function studioNeedsBriefing(input: {
  event: Parameters<typeof needsBriefingBeforePlay>[0];
  teamStatus?: string | null;
  briefingConfirmed?: boolean;
}): boolean {
  if (!needsBriefingBeforePlay(input.event)) return false;
  if (input.teamStatus === "finished") return false;
  if (input.teamStatus === "playing" && input.briefingConfirmed) return false;
  return true;
}

export const STUDIO_TEST_MAX_PLAYERS = 3;

/** Studio playtests always have 3 seats. GRID pilots / live bookings keep their booked size. */
export function effectiveTeamSeatCap(
  event: Parameters<typeof isStudioTestEvent>[0],
  teamMaxSize: number,
): number {
  const size = Math.max(1, teamMaxSize);
  if (isStudioTestEvent(event)) return Math.max(STUDIO_TEST_MAX_PLAYERS, size);
  return size;
}
