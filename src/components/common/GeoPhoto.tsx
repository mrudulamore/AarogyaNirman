import { PhotoGeotagMap } from './PhotoGeotagMap';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { cn } from '../../lib/utils';
import { EvidenceImage } from './EvidenceImage';


/** Displays recorded coordinates; stamped exports are generated during camera capture. */
export function GeoPhoto({ src, mediaKey, lat, lng, timestamp, location, gpsAccuracyM, locationSource, className, imgClassName, compact = false }: {
  src: string; mediaKey?: string; lat: number; lng: number; timestamp: string; location: string; gpsAccuracyM?: number; locationSource?: string; className?: string; imgClassName?: string; compact?: boolean;
}) {
  useUiLanguage();
  const reference = !mediaKey && src.startsWith('/site-photos/');
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const dt = new Date(timestamp);
  const dateLabel = dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className={cn('relative overflow-hidden rounded-md', className)}>
      <EvidenceImage alt={uiText(location)} fallbackSrc={src} mediaKey={mediaKey} className={cn('h-full w-full object-cover', imgClassName)} />
      <div className={cn('absolute inset-x-0 bottom-0 flex items-center gap-3 bg-slate-950/70 p-2 text-white', compact && 'gap-1 p-1')}>
        {!compact && hasCoordinates && <PhotoGeotagMap key={lat + ':' + lng} lat={lat} lng={lng} />}
        <div className={cn('min-w-0 flex-1 py-1 [text-shadow:0_1px_2px_rgb(0_0_0_/_70%)]', compact && '[&_p]:text-[8px] [&_p]:leading-tight')}>
          <p className={cn('break-words text-base font-semibold leading-tight sm:text-lg', compact && 'text-[9px] sm:text-[9px]')}>{uiText(location)}</p>
          <p className="mt-1 break-words text-xs leading-snug">{hasCoordinates ? `Lat ${lat.toFixed(6)}, Long ${lng.toFixed(6)}` : uiText('GPS coordinates unavailable')}</p>
          {Number.isFinite(dt.getTime()) && <p className="text-xs leading-snug">{uiText(dateLabel)}, {uiText(timeLabel)}</p>}
          {!reference && locationSource && <p className="mt-1 text-[11px]">{uiText(locationSource === 'CAPTURED' ? 'Device GPS' : 'Manual entry')}{gpsAccuracyM !== undefined && Number.isFinite(gpsAccuracyM) ? ` · ±${gpsAccuracyM} m` : ''}</p>}
        </div>
      </div>
    </div>
  );
}
