import assert from 'node:assert/strict';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { localStorage };
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });

try {
  const { assessGeoFence, assessProjectGeoFence, GEOFENCE_RADIUS_M } = await server.ssrLoadModule('/src/lib/geo.ts');
  const { useStore } = await server.ssrLoadModule('/src/store/useStore.ts');
  const site = { lat: 18.5204, lng: 73.8567 };
  assert.equal(assessGeoFence({ ...site, gpsAccuracyM: 12 }, site).status, 'INSIDE');
  assert.equal(assessGeoFence({ lat: site.lat + 390 / 111000, lng: site.lng, gpsAccuracyM: 30 }, site).status, 'UNCERTAIN');
  assert.equal(assessGeoFence({ lat: site.lat + 700 / 111000, lng: site.lng, gpsAccuracyM: 20 }, site).status, 'OUTSIDE');
  assert.equal(GEOFENCE_RADIUS_M, 400);

  const boundary = [
    { lat: site.lat - 0.001, lng: site.lng - 0.001 },
    { lat: site.lat - 0.001, lng: site.lng + 0.001 },
    { lat: site.lat + 0.001, lng: site.lng + 0.001 },
    { lat: site.lat + 0.001, lng: site.lng - 0.001 },
  ];
  const boundedProject = { siteLat: site.lat, siteLng: site.lng, siteBoundary: boundary, geoFenceRadiusM: 400 };
  assert.equal(assessProjectGeoFence({ ...site, gpsAccuracyM: 5 }, boundedProject).status, 'INSIDE');
  assert.equal(assessProjectGeoFence({ lat: site.lat, lng: site.lng + 0.00098, gpsAccuracyM: 10 }, boundedProject).status, 'UNCERTAIN');
  assert.equal(assessProjectGeoFence({ lat: site.lat, lng: site.lng + 0.002, gpsAccuracyM: 5 }, boundedProject).status, 'OUTSIDE');

  useStore.getState().login('DEPUTY_ENGINEER');
  const state = useStore.getState();
  const project = state.projects.find(item => state.currentUser.assignedProjectIds.includes(item.id));
  const projectBoundary = boundary.map(point => ({ lat: point.lat - site.lat + project.siteLat, lng: point.lng - site.lng + project.siteLng }));
  state.updateSiteBoundary(project.id, projectBoundary, 350);
  const updatedProject = useStore.getState().projects.find(item => item.id === project.id);
  assert.deepEqual(updatedProject.siteBoundary, projectBoundary);
  assert.equal(updatedProject.geoFenceRadiusM, 350);
  assert.equal(updatedProject.boundaryUpdatedBy, state.currentUser.id);
  assert.throws(() => state.updateSiteBoundary(project.id, projectBoundary.map(point => ({ ...point, lat: point.lat + 1 })), 350), /must contain/);
  state.updateSiteBoundary(project.id, [], 500);
  const radiusProject = useStore.getState().projects.find(item => item.id === project.id);
  assert.equal(radiusProject.siteBoundary, undefined);
  assert.equal(radiusProject.geoFenceRadiusM, 500);

  useStore.getState().login('CONTRACTOR');
  assert.throws(() => useStore.getState().updateSiteBoundary(project.id, projectBoundary, 350), /authorized user/);
  useStore.getState().login('DEPUTY_ENGINEER');
  const authorizedState = useStore.getState();
  const capturedAt = new Date().toISOString();
  const saved = authorizedState.addPhoto({
    projectId: project.id, stage: 'Structure', type: 'PROGRESS', date: capturedAt.slice(0, 10), location: project.name,
    uploadedBy: 'ignored', uploadedByRole: 'CONTRACTOR', description: 'Accuracy-aware test evidence', seed: 0,
    dataUrl: 'data:image/jpeg;base64,/9j/2Q==', mediaKey: 'test-media', lat: site.lat, lng: site.lng,
    gpsAccuracyM: 12, gpsCapturedAt: capturedAt, gpsAgeMs: 800, geoFenceStatus: 'INSIDE', distanceFromSiteM: 0,
    geoFenceRadiusM: 400, locationSource: 'CAPTURED', capturedAt, uploadedAt: capturedAt,
  });
  assert.equal(saved.geoFenceStatus, 'INSIDE');
  assert.equal(saved.gpsAgeMs, 800);
  assert.equal(saved.mediaKey, 'test-media');
  assert.equal(saved.uploadedById, authorizedState.currentUser.id);
  console.log('PASS circle/polygon geofences, boundary authorization and persisted evidence metadata');
} finally { await server.close(); }
