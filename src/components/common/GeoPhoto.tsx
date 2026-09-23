import { uiText, useUiLanguage } from '../../i18n/ui';
import { MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EvidenceImage } from './EvidenceImage';


/** Displays capture metadata over the image. Samples explicitly disclose missing GPS;
 * downloadable stamped copies are generated separately during camera capture. */
export function GeoPhoto({ src, mediaKey, lat, lng, timestamp, location, className, imgClassName }: {
  src: string; mediaKey?: string; lat: number; lng: number; timestamp: string; location: string; className?: string; imgClassName?: string;
}) {
  useUiLanguage();
  const sample = !mediaKey && src.startsWith('/site-photos/');

  const dt = new Date(timestamp);
  const dateLabel = dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className={cn('relative overflow-hidden rounded-md', className)}>
      <EvidenceImage alt={uiText(location)} fallbackSrc={src} mediaKey={mediaKey} className={cn('h-full w-full object-cover', imgClassName)} />
      {sample && <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2.5 py-2 text-[11px] leading-tight text-white">
        <p className="font-semibold">{uiText(location)}</p>
        <p className="mt-1 text-amber-200">{uiText('Sample photo — no captured GPS')}</p>
      </div>}
      {!sample && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2.5 pb-2 pt-6 text-white">
        <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight">
          <MapPin size={11} className="shrink-0 text-sky-300" /> {uiText(location)}
        </div>
        <p className="mt-0.5 truncate text-[9.5px] leading-tight text-white/80">{uiText("Lat ")}{uiText(lat.toFixed(6))}{uiText(", Long ")}{uiText(lng.toFixed(6))}</p>
        <p className="text-[9.5px] leading-tight text-white/80">{uiText(dateLabel)}, {uiText(timeLabel)}</p>
      </div>}
    </div>
  );
}
