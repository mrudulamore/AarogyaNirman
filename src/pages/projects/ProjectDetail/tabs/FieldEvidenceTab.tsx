import { PhotoLocationMap } from '../../../../components/common/PhotoLocationMap';
import { PhotoReview } from '../../../../components/common/PhotoReview';
import { ROLE_LABELS } from '../../../../lib/constants';
import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { useMemo, useState } from 'react';
import { MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Project, SitePhoto } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, StatusBadge, EmptyState, Button } from '../../../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Dialog, DialogContent } from '../../../../components/ui/overlays';
import { GeoPhoto } from '../../../../components/common/GeoPhoto';
import { photoSrc, formatDateTime } from '../../../../lib/utils';
import { distanceMeters, isWithinGeofence, GEOFENCE_RADIUS_M } from '../../../../lib/geo';

type FenceFilter = 'ALL' | 'WITHIN' | 'OUTSIDE' | 'MANUAL';

export function FieldEvidenceTab({ project }: { project: Project }) {
  useUiLanguage();
  const photos = useStore((s) => s.photos).filter((p) => p.projectId === project.id);
  const [filter, setFilter] = useState<FenceFilter>('ALL');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const site = { lat: project.siteLat, lng: project.siteLng };
  const viewerPhoto = photos.find((p) => p.id === viewerId);

  const rows = useMemo(() => photos.map((p) => ({
    photo: p,
    distanceM: Math.round(distanceMeters(p, site)),
    within: isWithinGeofence(p, site),
  })).sort((a, b) => (a.photo.capturedAt.localeCompare(b.photo.capturedAt) || a.photo.id.localeCompare(b.photo.id))), [photos, site]);

  const filtered = rows.filter((r) => {
    if (filter === 'ALL') return true;
    if (filter === 'MANUAL') return r.photo.locationSource === 'MANUAL';
    if (filter === 'WITHIN') return r.within && r.photo.locationSource === 'CAPTURED';
    return !r.within;
  });

  const viewerIndex = filtered.findIndex(r => r.photo.id === viewerId);
  const flaggedCount = rows.filter((r) => !r.within || r.photo.locationSource === 'MANUAL').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={uiText("Total Evidence Items")} value={rows.length} icon={MapPin} />
        <StatCard label={uiText("Flagged for Review")} value={flaggedCount} icon={ShieldAlert} tone={flaggedCount > 0 ? 'red' : undefined} />
        <StatCard label={uiText("Geo-Fence Radius")} value={`${GEOFENCE_RADIUS_M} m`} icon={ShieldCheck} />
      </div>

      <Card className="p-4"><PhotoLocationMap photos={filtered.map(r => r.photo)}/></Card>
      <Card>
        <CardHeader>
          <CardTitle>{uiText("Evidence distance overview")}</CardTitle>
        </CardHeader>
        <div className="p-4">
          <EvidenceRadar rows={filtered} />
        </div>
      </Card>

      <div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FenceFilter)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{uiText("All Evidence")}</SelectItem>
            <SelectItem value="WITHIN">{uiText("Within Geo-Fence")}</SelectItem>
            <SelectItem value="OUTSIDE">{uiText("Outside Geo-Fence")}</SelectItem>
            <SelectItem value="MANUAL">{uiText("Manually Entered Location")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? <EmptyState icon={<MapPin size={32} />} title={uiText("No field evidence matches this filter")} /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ photo, distanceM, within }, index) => <button key={photo.id} onClick={() => setViewerId(photo.id)} className="evidence-card overflow-hidden rounded-3xl border border-blue-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <p className="px-5 py-3 text-sm font-semibold text-blue-800">{uiText("Photo")} {index + 1} / {filtered.length}</p><GeoPhoto src={photoSrc(photo)} lat={photo.lat} lng={photo.lng} timestamp={photo.capturedAt} location={photo.location} className="h-64 rounded-none" />
          <div className="space-y-3 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{uiText(photo.stage)}</h3><StatusBadge status={photo.locationSource === 'MANUAL' || !within ? 'PENDING' : 'APPROVED'} label={uiText(photo.locationSource === 'MANUAL' ? 'Location unverified' : within ? 'Within site boundary' : 'Outside site boundary')} /></div>
          <StatusBadge status={photo.review?.status ?? 'PENDING'} label={uiText(photo.review?.status === 'APPROVED' ? 'Approved by reviewer' : photo.review?.status === 'REJECTED' ? 'Rejected by reviewer' : 'Awaiting review')} /><p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{photo.description}</p>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-blue-50/70 p-3 text-xs"><div><p className="text-slate-500">{uiText('Location source')}</p><p className="mt-1 font-medium text-slate-800">{uiText(photo.locationSource === 'CAPTURED' ? 'Device GPS' : 'Manual entry')}</p></div><div><p className="text-slate-500">{uiText('Distance from site')}</p><p className="mt-1 font-medium text-slate-800">{distanceM} m</p></div></div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{photo.uploadedBy}<span className="block mt-1">{uiText(ROLE_LABELS[photo.uploadedByRole])}</span></span><span>{photo.gpsAccuracyM === undefined ? uiText('Accuracy unavailable') : `±${photo.gpsAccuracyM} m`}</span></div></div>
        </button>)}
      </div>}

      <Dialog open={!!viewerId} onOpenChange={(v) => !v && setViewerId(null)}>
        {viewerPhoto && (
          <DialogContent title={uiMessage("{{0}} — Field Evidence", [viewerPhoto.stage])} description={uiText(formatDateTime(viewerPhoto.capturedAt))} size="xl">
            <div className="mb-3 flex items-center justify-between gap-2"><Button variant="outline" disabled={viewerIndex <= 0} onClick={() => setViewerId(filtered[viewerIndex-1].photo.id)}>{uiText("Previous photo")}</Button><span className="text-sm font-semibold">{viewerIndex+1} / {filtered.length}</span><Button variant="outline" disabled={viewerIndex < 0 || viewerIndex >= filtered.length-1} onClick={() => setViewerId(filtered[viewerIndex+1].photo.id)}>{uiText("Next photo")}</Button></div>
            <GeoPhoto
              src={photoSrc(viewerPhoto)}
              lat={viewerPhoto.lat}
              lng={viewerPhoto.lng}
              timestamp={viewerPhoto.capturedAt}
              location={viewerPhoto.location}
              className="w-full bg-slate-950" imgClassName="h-[55vh] !object-contain"
            />
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-4">
              <div><p className="text-slate-400">{uiText("Uploaded By")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.uploadedBy)}</p><p>{uiText(ROLE_LABELS[viewerPhoto.uploadedByRole])}</p></div>
              <div><p className="text-slate-400">{uiText("Uploaded At")}</p><p className="font-medium text-slate-700">{uiText(formatDateTime(viewerPhoto.uploadedAt))}</p></div>
              <div>
                <p className="text-slate-400">{uiText("Location Source")}</p>
                <p className="font-medium text-slate-700">{uiText(viewerPhoto.locationSource === 'CAPTURED' ? `Device GPS (±${viewerPhoto.gpsAccuracyM}m)` : 'Manually entered')}</p>
              </div>
              <div>
                <p className="text-slate-400">{uiText("Geo-Fence")}</p>
                {viewerPhoto.locationSource === 'MANUAL' ? <StatusBadge status="PENDING" label={uiText('Location unverified')} /> : isWithinGeofence(viewerPhoto, site) ? (
                  <StatusBadge status="APPROVED" label={uiText("Within Geo-Fence")} />
                ) : (
                  <StatusBadge status="REJECTED" label={uiText("Outside Geo-Fence")} />
                )}
              </div>
              <div className="col-span-2 sm:col-span-4"><p className="text-slate-400">{uiText("Description")}</p><p className="font-medium text-slate-700">{viewerPhoto.description}</p></div>
              {viewerPhoto.remarks && <div className="col-span-2 sm:col-span-4"><p className="text-slate-400">{uiText("Remarks")}</p><p className="font-medium text-slate-700">{viewerPhoto.remarks}</p></div>}
            </div>
            <PhotoReview key={viewerPhoto.id} photo={viewerPhoto} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** Quantitative distances, without invented geographic bearings. */
function EvidenceRadar({ rows }: { rows: { photo: SitePhoto; distanceM: number; within: boolean }[] }) {
  useUiLanguage();
  const maximum = Math.max(GEOFENCE_RADIUS_M * 2, ...rows.map(r => r.distanceM));
  return <div className="space-y-4">
    <p className="text-xs text-slate-500">{uiText('Distance from the registered site. The marker indicates the site boundary.')} ({GEOFENCE_RADIUS_M} m)</p>
    <div className="max-h-72 space-y-4 overflow-y-auto pr-2">{rows.map(({photo,distanceM,within}) => <div key={photo.id}>
      <div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate text-slate-600">{uiText(photo.stage)} · {photo.uploadedBy}</span><span className="shrink-0 font-semibold text-slate-800">{distanceM} m</span></div>
      <div className="relative h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${photo.locationSource === 'MANUAL' ? 'bg-amber-400' : within ? 'bg-blue-500' : 'bg-red-400'}`} style={{width: `${Math.max(1,distanceM / maximum * 100)}%`}}/><span className="absolute -top-1 h-4 w-0.5 bg-slate-500" style={{left:`${GEOFENCE_RADIUS_M / maximum * 100}%`}}/></div>
    </div>)}</div>
    <p className="text-xs text-slate-500">{uiText('Blue: device GPS within boundary · Red: outside boundary · Amber: manually entered, unverified')}</p>
  </div>;
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone?: 'red' }) {
  useUiLanguage();
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-navy-50 text-navy-700'}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase text-slate-400">{uiText(label)}</p>
          <p className={`text-lg font-bold ${tone === 'red' ? 'text-red-600' : 'text-slate-900'}`}>{uiText(value)}</p>
        </div>
      </div>
    </Card>
  );
}
