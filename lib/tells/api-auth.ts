/** Shared API-key auth for Tells external integrations (bookings, pulse, status). */
export function authorizeGridApi(request: Request): boolean {
  const apiKey = request.headers.get("x-tells-api-key") ?? request.headers.get("x-grid-api-key");
  const expectedKey = process.env.TELLS_BOOKING_API_KEY || process.env.GRID_BOOKING_API_KEY;
  return Boolean(expectedKey && apiKey === expectedKey);
}
