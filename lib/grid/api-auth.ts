/** Shared API-key auth for GRID external integrations (bookings, pulse, status). */
export function authorizeGridApi(request: Request): boolean {
  const apiKey = request.headers.get("x-grid-api-key");
  const expectedKey = process.env.GRID_BOOKING_API_KEY;
  return Boolean(expectedKey && apiKey === expectedKey);
}
