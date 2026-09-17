import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { buildPdfReport, buildDocumentRecord } = await server.ssrLoadModule('/src/lib/pdfRenderer.ts');
  const { pdfFilename } = await server.ssrLoadModule('/src/lib/pdfDelivery.ts');
  assert.equal(pdfFilename('../../RA:Bill?.PDF'), '_.._RA_Bill_.pdf');
  assert.equal(pdfFilename(''), 'report.pdf');
  const report = buildPdfReport({ title: 'Finance Report', subtitle: 'Test', scopeLine: 'All projects', generatedBy: 'Reviewer', filename: 'report.pdf', kpis: [{ label: 'Total', value: '1,23,45,67,890' }], sections: [{ heading: 'Receipts', columns: ['Project', 'Amount'], rows: Array.from({ length: 1500 }, (_, i) => [`Hospital ${i}`, i * 1000]) }] });
  for (const blob of [report, buildDocumentRecord({ heading: 'Inspection', filename: 'inspection.pdf', fields: [{ label: 'Status', value: 'Completed' }] })]) {
    assert.equal(blob.type, 'application/pdf');
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.ok(bytes.subarray(0, 5).toString().startsWith('%PDF-'));
    assert.ok(bytes.subarray(-30).toString().includes('%%EOF'));
  }
  assert.ok((Buffer.from(await report.arrayBuffer()).toString('latin1').match(/\/Type \/Page\b/g) ?? []).length > 1);
  console.log('PDF export tests passed: valid report/certificate bytes, 1,500-row pagination, and safe filenames.');
} finally { await server.close(); }
