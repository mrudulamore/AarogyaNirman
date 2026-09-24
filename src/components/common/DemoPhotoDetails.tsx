import type { Project, SitePhoto } from '../../types';
import { assessProjectGeoFence } from '../../lib/geo';
import { formatDateTime } from '../../lib/utils';
import { uiText } from '../../i18n/ui';

/** Seed coordinates remain visible without presenting them as a device GPS fix. */
export function DemoPhotoDetails({ photo, project }: { photo: SitePhoto; project: Project }) {
  const assessment = assessProjectGeoFence(photo, project);
  return <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 text-xs">
    <div className="grid grid-cols-2 gap-3">
      <div><p className="text-slate-500">{uiText('Location')}</p><p>{photo.location}</p></div>
      <div><p className="text-slate-500">{uiText('Captured')}</p><p>{formatDateTime(photo.capturedAt)}</p></div>
      <div><p className="text-slate-500">{uiText('Coordinates')}</p><p>Lat {photo.lat.toFixed(6)}, Long {photo.lng.toFixed(6)}</p></div>
      <div><p className="text-slate-500">{uiText('Distance from site')}</p><p>{assessment.distanceM} m</p></div>
      <div><p className="text-slate-500">{uiText('Geo-Fence')}</p><p>{uiText(assessment.status === 'INSIDE' ? 'Within Geo-Fence' : assessment.status === 'OUTSIDE' ? 'Outside Geo-Fence' : 'Location uncertain')}</p></div>
      <div><p className="text-slate-500">{uiText('Stage')}</p><p>{uiText(photo.stage)}</p></div>
    </div>
    <p>{photo.description}</p>
  </div>;
}
