import type { Milestone, Project, SitePhoto } from '../types';
import { assessProjectGeoFence } from './geo';

/** Validate capture metadata and compute the boundary result rather than trusting the caller. */
export function validateMilestonePhoto(photo: Omit<SitePhoto, 'id'>, project: Project, milestones: Milestone[]) {
  if (!milestones.some(m => m.id === photo.milestoneId && m.projectId === project.id)) throw new Error('Milestone does not belong to this project.');
  if (photo.locationSource !== 'CAPTURED' || !photo.mediaKey || !photo.dataUrl) throw new Error('Capture a new milestone photo with GPS first.');
  if (!Number.isFinite(photo.lat) || Math.abs(photo.lat) > 90 || !Number.isFinite(photo.lng) || Math.abs(photo.lng) > 180 || !Number.isFinite(photo.gpsAccuracyM) || photo.gpsAccuracyM! < 0) throw new Error('Valid GPS coordinates and accuracy are required.');
  const captured = Date.parse(photo.capturedAt);
  const fix = Date.parse(photo.gpsCapturedAt ?? '');
  const age = captured - fix;
  if (!Number.isFinite(age) || age < 0 || age > 30_000 || captured > Date.now() + 5000) throw new Error('A fresh GPS fix at photo capture is required.');
  const result = assessProjectGeoFence({ lat: photo.lat, lng: photo.lng, gpsAccuracyM: photo.gpsAccuracyM! }, project);
  const status = project.siteLocationConfirmedAt ? result.status : 'UNCERTAIN';
  if (status !== 'INSIDE' && (photo.remarks?.trim().length ?? 0) < 10) throw new Error('Explain why this outside or uncertain location should be submitted.');
  return { ...photo, gpsAgeMs: age, geoFenceStatus: status, distanceFromSiteM: result.distanceM, geoFenceRadiusM: result.radiusM, geoFenceShape: project.siteBoundary?.length ? 'POLYGON' as const : 'CIRCLE' as const, geoFenceBoundaryUpdatedAt: project.boundaryUpdatedAt };
}
