import i18n from '../i18n';
import { toast } from 'sonner';
import { savePdf } from './pdfDelivery';
import type { PdfJob, PdfReportOptions, DocumentRecordOptions } from './pdfTypes';
export type { PdfSection, PdfKpi } from './pdfTypes';

let exporting = false;

export async function generatePdf(job: PdfJob): Promise<Blob> {
  if (typeof document !== 'undefined' && (/^(hi|mr)/.test(i18n.language) || /[\u0900-\u097f]/.test(JSON.stringify(job.options)))) {
    const { buildUnicodePdf } = await import('./unicodePdf');
    return buildUnicodePdf(job);
  }
  if (typeof Worker === 'undefined') {
    const renderer = await import('./pdfRenderer');
    return job.kind === 'report' ? renderer.buildPdfReport(job.options) : renderer.buildDocumentRecord(job.options);
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' });
    const finish = () => { clearTimeout(timeout); worker.terminate(); };
    const timeout = setTimeout(() => { finish(); reject(new Error('This report took too long. Select fewer projects and retry.')); }, 120_000);
    worker.onmessage = ({ data }) => {
      finish();
      if (data.error) reject(new Error(data.error));
      else if (data.blob instanceof Blob) resolve(data.blob);
      else reject(new Error('No PDF was generated. Please retry.'));
    };
    worker.onerror = () => { finish(); reject(new Error('Could not generate the PDF. Reload the page and retry.')); };
    try { worker.postMessage(job); }
    catch (error) { finish(); reject(error); }
  });
}

async function exportPdf(job: PdfJob) {
  if (exporting) { toast.info('A PDF export is already in progress.'); return; }
  exporting = true;
  const id = toast.loading('Preparing PDF…');
  try {
    const blob = await generatePdf(job);
    toast.loading('Saving PDF…', { id });
    const result = await savePdf(blob, job.options.filename);
    if (result === 'cancelled') toast.info('PDF save cancelled.', { id });
    else toast.success(result === 'saved' ? 'PDF saved to your selected location.' : 'PDF download started. Check your browser downloads.', { id });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'PDF export failed. Please retry.', { id });
  } finally { exporting = false; }
}

export function downloadPdfReport(options: PdfReportOptions) { return exportPdf({ kind: 'report', options }); }
export function downloadDocumentRecord(options: DocumentRecordOptions) { return exportPdf({ kind: 'record', options }); }
