import { uiMessage, uiText, useUiLanguage } from '../../../../i18n/ui';
import { useMemo, useState } from 'react';
import { MapPin, ShieldAlert, ShieldCheck, Smartphone, PenLine } from 'lucide-react';
import type { Project, SitePhoto } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardHeader, CardTitle, StatusBadge, Table, THead, TBody, Tr, Th, Td, EmptyState } from '../../../../components/ui/primitives';
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
  })).sort((a, b) => (a.photo.capturedAt < b.photo.capturedAt ? 1 : -1)), [photos, site]);

  const filtered = rows.filter((r) => {
    if (filter === 'ALL') return true;
    if (filter === 'MANUAL') return r.photo.locationSource === 'MANUAL';
    if (filter === 'WITHIN') return r.within;
    return !r.within;
  });

  const flaggedCount = rows.filter((r) => !r.within || r.photo.locationSource === 'MANUAL').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={uiText("Total Evidence Items")} value={rows.length} icon={MapPin} />
        <StatCard label={uiText("Flagged for Review")} value={flaggedCount} icon={ShieldAlert} tone={flaggedCount > 0 ? 'red' : undefined} />
        <StatCard label={uiText("Geo-Fence Radius")} value={`${GEOFENCE_RADIUS_M} m`} icon={ShieldCheck} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{uiText("Evidence Radar (distance from registered site)")}</CardTitle>
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

      <Card>
        {filtered.length === 0 ? <EmptyState icon={<MapPin size={32} />} title={uiText("No field evidence matches this filter")} /> : (
          <Table>
            <THead><Tr><Th>{uiText("Evidence")}</Th><Th>{uiText("Captured")}</Th><Th>{uiText("Stage")}</Th><Th>{uiText("Uploaded By")}</Th><Th>{uiText("Source")}</Th><Th>{uiText("Accuracy")}</Th><Th>{uiText("Distance from Site")}</Th><Th>{uiText("Geo-Fence")}</Th></Tr></THead>
            <TBody>
              {filtered.map(({ photo, distanceM, within }) => (
                <Tr key={photo.id} onClick={() => setViewerId(photo.id)}>
                  <Td>
                    <button className="group block overflow-hidden rounded-md border border-slate-200" title={uiText("Click to view photo evidence")}>
                      <img src={photoSrc(photo)} className="h-12 w-16 object-cover transition-transform group-hover:scale-105" />
                    </button>
                  </Td>
                  <Td>{uiText(formatDateTime(photo.capturedAt))}</Td>
                  <Td className="font-medium text-slate-800">{uiText(photo.stage)}</Td>
                  <Td>{uiText(photo.uploadedBy)}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1">
                      {photo.locationSource === 'CAPTURED' ? <Smartphone size={12} className="text-slate-400" /> : <PenLine size={12} className="text-amber-500" />}
                      {uiText(photo.locationSource === 'CAPTURED' ? 'Device GPS' : 'Manual entry')}
                    </span>
                  </Td>
                  <Td>{uiText(photo.gpsAccuracyM ? `±${photo.gpsAccuracyM}m` : '—')}</Td>
                  <Td>{uiText(distanceM.toLocaleString('en-IN'))} m</Td>
                  <Td>
                    {photo.locationSource === 'MANUAL' ? (
                      <StatusBadge status="REJECTED" label={uiText("Unverifiable")} />
                    ) : within ? (
                      <StatusBadge status="APPROVED" label={uiText("Within Geo-Fence")} />
                    ) : (
                      <StatusBadge status="REJECTED" label={uiText("Outside Geo-Fence")} />
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!viewerId} onOpenChange={(v) => !v && setViewerId(null)}>
        {viewerPhoto && (
          <DialogContent title={uiMessage("{{0}} — Field Evidence", [viewerPhoto.stage])} description={uiText(formatDateTime(viewerPhoto.capturedAt))} size="lg">
            <GeoPhoto
              src={photoSrc(viewerPhoto)}
              lat={viewerPhoto.lat}
              lng={viewerPhoto.lng}
              timestamp={viewerPhoto.capturedAt}
              location={viewerPhoto.location}
              className="h-72 w-full"
            />
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-4">
              <div><p className="text-slate-400">{uiText("Uploaded By")}</p><p className="font-medium text-slate-700">{uiText(viewerPhoto.uploadedBy)}</p></div>
              <div><p className="text-slate-400">{uiText("Uploaded At")}</p><p className="font-medium text-slate-700">{uiText(formatDateTime(viewerPhoto.uploadedAt))}</p></div>
              <div>
                <p className="text-slate-400">{uiText("Location Source")}</p>
                <p className="font-medium text-slate-700">{uiText(viewerPhoto.locationSource === 'CAPTURED' ? `Device GPS (±${viewerPhoto.gpsAccuracyM}m)` : 'Manually entered')}</p>
              </div>
              <div>
                <p className="text-slate-400">{uiText("Geo-Fence")}</p>
                {isWithinGeofence(viewerPhoto, site) ? (
                  <StatusBadge status="APPROVED" label={uiText("Within Geo-Fence")} />
                ) : (
                  <StatusBadge status="REJECTED" label={uiText("Outside Geo-Fence")} />
                )}
              </div>
              <div className="col-span-2 sm:col-span-4"><p className="text-slate-400">{uiText("Description")}</p><p className="font-medium text-slate-700">{viewerPhoto.description}</p></div>
              {viewerPhoto.remarks && <div className="col-span-2 sm:col-span-4"><p className="text-slate-400">{uiText("Remarks")}</p><p className="font-medium text-slate-700">{viewerPhoto.remarks}</p></div>}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** A lightweight radial scatter — no external map dependency. Each point's distance from the
 * center is proportional to its real distance from the registered site (capped for legibility),
 * so a reviewer can see at a glance how tightly evidence clusters around the site vs. straying
 * outside the fence ring. */
function EvidenceRadar({ rows }: { rows: { photo: SitePhoto; distanceM: number; within: boolean }[] }) {
  useUiLanguage();
  const maxRadiusPx = 42; // radius representing GEOFENCE_RADIUS_M
  const capM = GEOFENCE_RADIUS_M * 4;
  return (
    <div className="mx-auto flex max-w-md items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-64 w-64">
        <circle cx={50} cy={50} r={maxRadiusPx / 2} fill="#ecfdf5" stroke="#6ee7b7" strokeWidth="0.6" />
        <circle cx={50} cy={50} r={2} fill="#0f766e" />
        {rows.map(({ photo, distanceM, within }, i) => {
          const angle = (i * 137.5 * Math.PI) / 180; // golden-angle spread so points don't overlap
          const r = Math.min(48, (Math.min(distanceM, capM) / capM) * 48);
          const cx = 50 + r * Math.cos(angle);
          const cy = 50 + r * Math.sin(angle);
          const color = photo.locationSource === 'MANUAL' ? '#f59e0b' : within ? '#10b981' : '#ef4444';
          return <circle key={photo.id} cx={cx} cy={cy} r={photo.locationSource === 'MANUAL' ? 1.6 : within ? 1.4 : 1.8} fill={color} opacity={0.85} />;
        })}
      </svg>
      <div className="ml-4 space-y-1.5 text-[11px] text-slate-500">
        <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{uiText(" Within geo-fence")}</p>
        <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />{uiText(" Outside geo-fence")}</p>
        <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />{uiText(" Manually entered")}</p>
        <p className="mt-2 max-w-[10rem] text-slate-400">{uiText("Shaded ring = registered geo-fence radius (")}{GEOFENCE_RADIUS_M}{uiText("m). Distance from center is proportional, capped for legibility.")}</p>
      </div>
    </div>
  );
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
