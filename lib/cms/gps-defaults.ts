export type GpsPin = {
  lat: number;
  lng: number;
  radius_meters: number;
};

export const DEFAULT_GPS_RADIUS_METERS = 15;

export const CITY_COORDINATES: Record<string, GpsPin> = {
  berlin: { lat: 52.520008, lng: 13.404954, radius_meters: DEFAULT_GPS_RADIUS_METERS },
  munich: { lat: 48.137154, lng: 11.576124, radius_meters: DEFAULT_GPS_RADIUS_METERS },
  hamburg: { lat: 53.551086, lng: 9.993682, radius_meters: DEFAULT_GPS_RADIUS_METERS },
  cologne: { lat: 50.937531, lng: 6.960279, radius_meters: DEFAULT_GPS_RADIUS_METERS },
  vienna: { lat: 48.208174, lng: 16.373819, radius_meters: DEFAULT_GPS_RADIUS_METERS },
  zurich: { lat: 47.376888, lng: 8.541694, radius_meters: DEFAULT_GPS_RADIUS_METERS },
};

export function defaultMapCenter(citySlug?: string | null): GpsPin {
  if (citySlug && CITY_COORDINATES[citySlug.toLowerCase()]) {
    return CITY_COORDINATES[citySlug.toLowerCase()];
  }
  return CITY_COORDINATES.berlin;
}

export function parseGpsOverride(raw: unknown): GpsPin | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  const radius = Number(o.radius_meters ?? o.radiusMeters);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    radius_meters: Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_GPS_RADIUS_METERS,
  };
}
