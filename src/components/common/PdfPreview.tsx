import { useEffect, useRef, useState } from 'react';
import { uiText } from '../../i18n/ui';

export function PdfPreview({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { setPage(1); }, [url]);
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    setLoading(true); setError('');
    void (async () => {
      try {
        const pdf = await import('pdfjs-dist');
        pdf.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
        if (cancelled) return;
        const task = pdf.getDocument({ url });
        destroy = () => { void task.destroy(); };
        const doc = await task.promise;
        if (cancelled) return;
        setPages(doc.numPages);
        const sheet = await doc.getPage(Math.min(page, doc.numPages));
        const target = canvas.current;
        if (cancelled || !target) return;
        const viewport = sheet.getViewport({ scale: 1.4 });
        target.width = viewport.width; target.height = viewport.height;
        await sheet.render({ canvas: target, viewport }).promise;
      } catch { if (!cancelled) setError(uiText('Preview unavailable for this file type.')); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; destroy?.(); };
  }, [url, page]);
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3"><button type="button" aria-label={uiText('Previous')} disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)} className="min-h-11 rounded border px-3 disabled:opacity-40">←</button><span className="text-sm">{page} / {pages || '—'}</span><button type="button" aria-label={uiText('Next')} disabled={loading || page >= pages} onClick={() => setPage(p => p + 1)} className="min-h-11 rounded border px-3 disabled:opacity-40">→</button></div>
    {loading && <p role="status">{uiText('Loading...')}</p>}{error && <p role="alert">{error}</p>}
    <div className="max-h-[60vh] overflow-auto bg-slate-100"><canvas ref={canvas} className="h-auto w-full" aria-label={uiText('Preview')} /></div>
  </div>;
}
