import { useEffect, useState } from 'react';
import { readEvidenceMedia } from '../../lib/evidenceMedia';
import { uiText } from '../../i18n/ui';

export function EvidenceIntegrity({ mediaKey }: { mediaKey?: string }) {
  const [status, setStatus] = useState<{ key: string; original: boolean; stamped: boolean } | null>(null);
  useEffect(() => {
    if (!mediaKey) return;
    let active = true;
    Promise.allSettled([readEvidenceMedia(mediaKey, 'original'), readEvidenceMedia(mediaKey, 'stamped')]).then(results => {
      if (active) setStatus({ key: mediaKey, original: results[0].status === 'fulfilled', stamped: results[1].status === 'fulfilled' });
    });
    return () => { active = false; };
  }, [mediaKey]);
  if (!mediaKey) return <p className="text-xs text-slate-500">{uiText('Illustrative sample — no captured original')}</p>;
  const current = status?.key === mediaKey ? status : null;
  const badge = (label: string, available?: boolean) => <span className={`rounded-full border px-2 py-1 text-xs font-medium ${available === false ? 'border-red-200 bg-red-50 text-red-800' : available ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{uiText(label)}</span>;
  return <div className="flex flex-wrap gap-2" aria-label={uiText('Evidence integrity')}>
    {badge(current?.original ? 'Local original available' : current ? 'Local original missing' : 'Checking local original', current?.original)}
    {badge(current?.stamped ? 'Stamped copy available' : current ? 'Stamped copy missing' : 'Checking stamped copy', current?.stamped)}
    {badge('Central verification pending')}
  </div>;
}
