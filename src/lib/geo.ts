// Approximate real-world coordinates for Maharashtra districts (district HQ town, WGS84).
// Used to seed each project's registered site coordinates and to plot real map markers —
// distinct from Project.lat/lng, which remain 0-100 percentage coordinates for the
// schematic SVG map fallback.
export const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  Pune: { lat: 18.5204, lng: 73.8567 },
  Satara: { lat: 17.6805, lng: 74.0183 },
  Kolhapur: { lat: 16.7050, lng: 74.2433 },
  Solapur: { lat: 17.6599, lng: 75.9064 },
  Nashik: { lat: 19.9975, lng: 73.7898 },
  Nandurbar: { lat: 21.3667, lng: 74.2417 },
  Dhule: { lat: 20.9042, lng: 74.7749 },
  Ahmednagar: { lat: 19.0948, lng: 74.7480 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  Gadchiroli: { lat: 20.1809, lng: 80.0021 },
  Chandrapur: { lat: 19.9615, lng: 79.2961 },
  Wardha: { lat: 20.7453, lng: 78.6022 },
  'Chhatrapati Sambhajinagar': { lat: 19.8762, lng: 75.3433 },
  Jalna: { lat: 19.8410, lng: 75.8864 },
  Beed: { lat: 18.9894, lng: 75.7601 },
  Amravati: { lat: 20.9374, lng: 77.7796 },
  Akola: { lat: 20.7002, lng: 77.0082 },
  Yavatmal: { lat: 20.3888, lng: 78.1204 },
  Thane: { lat: 19.2183, lng: 72.9781 },
  Raigad: { lat: 18.5158, lng: 73.1822 },
  Ratnagiri: { lat: 16.9902, lng: 73.3120 },
};

const MAHARASHTRA_FALLBACK = { lat: 19.5, lng: 76.0 }; // rough state centroid

/** Deterministic small jitter so multiple projects in one district don't stack on the same point. */
function jitter(seed: number, spread = 0.06): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * spread;
}

export function districtCoords(district: string, jitterSeed: number): { lat: number; lng: number } {
  const base = DISTRICT_COORDS[district] ?? MAHARASHTRA_FALLBACK;
  return { lat: base.lat + jitter(jitterSeed), lng: base.lng + jitter(jitterSeed + 1) };
}

/** Haversine distance in meters between two real lat/lng points. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Registered project geo-fence radius — evidence captured beyond this is flagged for review. */
export const GEOFENCE_RADIUS_M = 400;

export function isWithinGeofence(point: { lat: number; lng: number }, projectSite: { lat: number; lng: number }): boolean {
  return distanceMeters(point, projectSite) <= GEOFENCE_RADIUS_M;
}

const DEVICE_POOL = ['Android 14 · Samsung Galaxy A54 · Camera GPS', 'Android 13 · Xiaomi Redmi Note 12 · Camera GPS', 'iOS 17 · iPhone 13 · Camera GPS'];

/** Simulates an in-app "Capture Photo" action: a device GPS fix close to the project's
 * registered site, the way a real field app would produce one. Used by interactive upload
 * flows (as opposed to seed data, which also generates a few deliberately-flagged outliers). */
export function simulateCapture(project: { siteLat: number; siteLng: number }) {
  const metersToDegrees = (m: number) => m / 111000;
  const jitter = (meters: number) => (Math.random() - 0.5) * 2 * metersToDegrees(meters);
  const now = new Date().toISOString();
  return {
    lat: project.siteLat + jitter(15 + Math.random() * 150),
    lng: project.siteLng + jitter(15 + Math.random() * 150),
    locationSource: 'CAPTURED' as const,
    gpsAccuracyM: Math.round(4 + Math.random() * 16),
    deviceInfo: DEVICE_POOL[Math.floor(Math.random() * DEVICE_POOL.length)],
    capturedAt: now,
    uploadedAt: now,
  };
}
