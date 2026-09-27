import assert from 'node:assert/strict';
import { createServer } from 'vite';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = { localStorage };
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { useStore } = await server.ssrLoadModule('/src/store/useStore.ts');
  const { validateMilestonePhoto } = await server.ssrLoadModule('/src/lib/milestonePhoto.ts');
  const s = () => useStore.getState();
  const project = s().projects[0];
  const milestone = s().milestones.find(m => m.projectId === project.id);
  s().login('DEPUTY_ENGINEER', project.siteEngineerId);
  const now = new Date().toISOString();
  const input = { ...s().photos.find(p => p.projectId === project.id), milestoneId: milestone.id,
    dataUrl: 'data:image/jpeg;base64,test', mediaKey: 'test-media', locationSource: 'CAPTURED',
    lat: project.siteLat, lng: project.siteLng, gpsAccuracyM: 5, capturedAt: now, gpsCapturedAt: now,
    remarks: 'Site location requires confirmation', geoFenceStatus: 'INSIDE' };
  const photo = s().addPhoto(input);
  assert.equal(photo.milestoneId, milestone.id);
  assert.equal(photo.gpsAgeMs, 0);
  assert.equal(photo.geoFenceStatus, project.siteLocationConfirmedAt ? 'INSIDE' : 'UNCERTAIN');
  const confirmed = { ...project, siteBoundary: undefined, geoFenceRadiusM: 100, siteLocationConfirmedAt: now };
  assert.equal(validateMilestonePhoto(input, confirmed, [milestone]).geoFenceStatus, 'INSIDE');
  assert.equal(validateMilestonePhoto({ ...input, gpsAccuracyM: 200 }, confirmed, [milestone]).geoFenceStatus, 'UNCERTAIN');
  assert.equal(validateMilestonePhoto({ ...input, lat: 0, lng: 0 }, confirmed, [milestone]).geoFenceStatus, 'OUTSIDE');
  assert.throws(() => s().addPhoto({ ...input, milestoneId: 'wrong-project' }), /Milestone/);
  assert.throws(() => s().addPhoto({ ...input, locationSource: 'MANUAL' }), /GPS/);
  assert.throws(() => s().addPhoto({ ...input, mediaKey: undefined }), /GPS/);
  assert.throws(() => s().addPhoto({ ...input, lat: NaN }), /coordinates/);
  assert.throws(() => s().addPhoto({ ...input, gpsAccuracyM: -1 }), /accuracy/);
  assert.throws(() => s().addPhoto({ ...input, gpsCapturedAt: new Date(Date.now() - 60000).toISOString() }), /fresh/);
  assert.throws(() => s().addPhoto({ ...input, gpsCapturedAt: new Date(Date.now() + 60000).toISOString() }), /fresh/);
  assert.throws(() => s().addPhoto({ ...input, lat: 0, lng: 0, remarks: '' }), /Explain/);
  s().deletePhoto(photo.id);
  assert.ok(!s().photos.some(p => p.id === photo.id));
  console.log('Milestone linking, GPS validation, boundary checks and deletion passed.');
} finally { await server.close(); }
