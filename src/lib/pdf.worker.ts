import { buildPdfReport, buildDocumentRecord } from './pdfRenderer';
import type { PdfJob } from './pdfTypes';

self.onmessage = ({ data }: MessageEvent<PdfJob>) => {
  try {
    const blob = data.kind === 'report' ? buildPdfReport(data.options) : buildDocumentRecord(data.options);
    self.postMessage({ blob });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'PDF generation failed.' });
  }
};
