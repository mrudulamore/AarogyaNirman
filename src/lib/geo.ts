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

export type GeoFenceAssessment = {
  status: 'INSIDE' | 'OUTSIDE' | 'UNCERTAIN';
  distanceM: number;
  accuracyM: number;
  radiusM: number;
};

export function pointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    const intersects = ((a.lat > point.lat) !== (b.lat > point.lat)) && point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Prevents bow-tie site polygons whose inside/outside result would be ambiguous. */
export function polygonSelfIntersects(points: { lat: number; lng: number }[]): boolean {
  const cross = (a: {lat:number;lng:number}, b: {lat:number;lng:number}, c: {lat:number;lng:number}) => (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
  const overlaps = (a: {lat:number;lng:number}, b: {lat:number;lng:number}, c: {lat:number;lng:number}, d: {lat:number;lng:number}) => {
    const abC = cross(a,b,c), abD = cross(a,b,d), cdA = cross(c,d,a), cdB = cross(c,d,b);
    if (Math.abs(abC) < 1e-12 || Math.abs(abD) < 1e-12 || Math.abs(cdA) < 1e-12 || Math.abs(cdB) < 1e-12) return false;
    return (abC > 0) !== (abD > 0) && (cdA > 0) !== (cdB > 0);
  };
  for (let i = 0; i < points.length; i++) for (let j = i + 2; j < points.length; j++) {
    if (i === 0 && j === points.length - 1) continue;
    if (overlaps(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) return true;
  }
  return false;
}

function pointToSegmentMeters(point: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const latScale = 111_000;
  const lngScale = 111_000 * Math.cos(point.lat * Math.PI / 180);
  const ax = (a.lng - point.lng) * lngScale; const ay = (a.lat - point.lat) * latScale;
  const bx = (b.lng - point.lng) * lngScale; const by = (b.lat - point.lat) * latScale;
  const dx = bx - ax; const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function assessPolygonGeoFence(point: { lat: number; lng: number; gpsAccuracyM?: number }, polygon: { lat: number; lng: number }[]): GeoFenceAssessment {
  const accuracyM = Math.max(0, Math.ceil(point.gpsAccuracyM ?? 0));
  const edgeDistance = Math.round(Math.min(...polygon.map((vertex, index) => pointToSegmentMeters(point, vertex, polygon[(index + 1) % polygon.length]))));
  const geometricallyInside = pointInPolygon(point, polygon);
  const status = edgeDistance <= accuracyM ? 'UNCERTAIN' : geometricallyInside ? 'INSIDE' : 'OUTSIDE';
  return { status, distanceM: edgeDistance, accuracyM, radiusM: 0 };
}

export function assessProjectGeoFence(point: { lat: number; lng: number; gpsAccuracyM?: number }, project: { siteLat: number; siteLng: number; siteBoundary?: { lat: number; lng: number }[]; geoFenceRadiusM?: number }): GeoFenceAssessment {
  if (!project.siteBoundary || project.siteBoundary.length < 3) return assessGeoFence(point, { lat: project.siteLat, lng: project.siteLng }, project.geoFenceRadiusM ?? GEOFENCE_RADIUS_M);
  const polygonAssessment = assessPolygonGeoFence(point, project.siteBoundary);
  return { ...polygonAssessment, distanceM: Math.round(distanceMeters(point, { lat: project.siteLat, lng: project.siteLng })) };
}

/** Accuracy-aware classification. If the GPS accuracy circle crosses the site radius,
 * the result is uncertain instead of pretending the point is definitely inside/outside. */
export function assessGeoFence(
  point: { lat: number; lng: number; gpsAccuracyM?: number },
  projectSite: { lat: number; lng: number },
  radiusM = GEOFENCE_RADIUS_M,
): GeoFenceAssessment {
  const distanceM = Math.round(distanceMeters(point, projectSite));
  const accuracyM = Math.max(0, Math.ceil(point.gpsAccuracyM ?? 0));
  const status = distanceM + accuracyM <= radiusM ? 'INSIDE'
    : distanceM - accuracyM > radiusM ? 'OUTSIDE'
    : 'UNCERTAIN';
  return { status, distanceM, accuracyM, radiusM };
}

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
