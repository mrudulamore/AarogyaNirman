import { useEffect, useState } from 'react';
import { HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { cleanupUnlinkedEvidence, listEvidenceMedia, type EvidenceStorageEntry } from '../../lib/evidenceMedia';
import { uiText } from '../../i18n/ui';
import { Button } from '../ui/primitives';

export function EvidenceStorage({ projectId }: { projectId: string }) {
  const photos = useStore(state => state.photos);
  const [entries, setEntries] = useState<EvidenceStorageEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openedAt] = useState(() => Date.now());
  const projectPhotos = photos.filter(photo => photo.projectId === projectId && photo.mediaKey);
  const media = new Map(entries.map(entry => [entry.mediaKey, entry]));
  const missing = projectPhotos.filter(photo => !media.get(photo.mediaKey!)?.originalBytes || !media.get(photo.mediaKey!)?.stampedBytes);
  const bytes = entries.reduce((sum, entry) => sum + entry.originalBytes + entry.stampedBytes, 0);
  const referenced = new Set(photos.map(photo => photo.mediaKey).filter((key): key is string => !!key));
  const expired = entries.filter(entry => !referenced.has(entry.mediaKey) && entry.createdAt && openedAt - Date.parse(entry.createdAt) > 7 * 24 * 60 * 60 * 1000);

  async function refresh() {
    setBusy(true); setError('');
    try { setEntries(await listEvidenceMedia()); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let active = true;
    listEvidenceMedia().then(next => { if (active) setEntries(next); }).catch(cause => { if (active) setError((cause as Error).message); });
    return () => { active = false; };
  }, [projectId]);

  async function cleanup() {
    setBusy(true); setError('');
    try {
      const count = await cleanupUnlinkedEvidence(referenced);
      toast.success(`${count} ${uiText('expired unlinked captures removed')}`);
      setEntries(await listEvidenceMedia());
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="space-y-3" aria-label={uiText('Evidence stored on this device')}>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-semibold text-blue-950"><HardDrive size={17}/>{uiText('Evidence stored on this device')}</p><Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={15}/>{uiText('Refresh storage')}</Button></div>
    <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
      <p className="rounded-xl bg-blue-50 p-3"><strong className="block text-lg text-blue-900">{projectPhotos.length}</strong>{uiText('captured photos in this project')}</p>
      <p className="rounded-xl bg-emerald-50 p-3"><strong className="block text-lg text-emerald-900">{projectPhotos.length - missing.length}</strong>{uiText('original and stamped copies available')}</p>
      <p className="rounded-xl bg-amber-50 p-3"><strong className="block text-lg text-amber-900">{projectPhotos.length}</strong>{uiText('awaiting central synchronization')}</p>
      <p className="rounded-xl bg-slate-100 p-3"><strong className="block text-lg text-slate-900">{(bytes / 1024 / 1024).toFixed(1)} MB</strong>{uiText('used by evidence on this device')}</p>
    </div>
    {missing.length > 0 && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{missing.length} {uiText('photo records have missing local originals or stamped copies. Their thumbnails remain visible.')}</p>}
    <p className="text-xs text-slate-600">{uiText('Captured evidence stays on this device and awaits central synchronization.')}</p>
    <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" disabled={busy || expired.length === 0} onClick={cleanup}><Trash2 size={15}/>{uiText('Remove expired unlinked captures')} ({expired.length})</Button><p className="text-xs text-slate-500">{uiText('Only captures over seven days old with no photo record can be removed.')}</p></div>
    {error && <p role="alert" className="text-xs text-red-700">{uiText(error)}</p>}
  </section>;
}
