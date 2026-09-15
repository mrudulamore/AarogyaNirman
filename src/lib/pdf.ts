import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfSection {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface PdfKpi {
  label: string;
  value: string;
}

/** Builds and downloads a real PDF report with a government letterhead, a KPI summary block,
 * and one or more data tables. Used by the Reports Center and Project 360 exports — every
 * "Export" action in this app produces an actual file, never a simulated toast. */
export function downloadPdfReport(opts: {
  title: string;
  subtitle: string;
  scopeLine: string;
  generatedBy: string;
  kpis?: PdfKpi[];
  sections: PdfSection[];
  filename: string;
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 40;

  // Letterhead
  doc.setFillColor(15, 42, 82);
  doc.rect(0, 0, pageWidth, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Government of Maharashtra', marginX, 28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Public Health Department — Hospital Infrastructure Command Center', marginX, 44);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, pageWidth - marginX, 44, { align: 'right' });
  y = 84;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.title, marginX, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(opts.subtitle, marginX, y);
  y += 14;
  doc.setFontSize(9);
  doc.text(`Scope: ${opts.scopeLine}   ·   Prepared for: ${opts.generatedBy}`, marginX, y);
  y += 20;

  if (opts.kpis?.length) {
    const cols = 4;
    const boxW = (pageWidth - marginX * 2 - (cols - 1) * 10) / cols;
    const boxH = 42;
    opts.kpis.forEach((kpi, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = marginX + col * (boxW + 10);
      const by = y + row * (boxH + 8);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, by, boxW, boxH, 3, 3, 'FD');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label.toUpperCase(), x + 8, by + 15, { maxWidth: boxW - 16 });
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const valueWidth = doc.getTextWidth(kpi.value);
      if (valueWidth > boxW - 16) doc.setFontSize(13 * (boxW - 16) / valueWidth);
      doc.text(kpi.value, x + 8, by + 32);
      doc.setFont('helvetica', 'normal');
    });
    const rows = Math.ceil(opts.kpis.length / cols);
    y += rows * (boxH + 8) + 12;
  }

  for (const section of opts.sections) {
    if (y > 740) { doc.addPage(); y = 40; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(section.heading, marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [section.columns],
      body: section.rows,
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [15, 42, 82], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
    y = (doc.lastAutoTable?.finalY ?? y) + 24;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a system-generated demonstration report using prototype data. Not a statutory document.', marginX, doc.internal.pageSize.getHeight() - 20);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
  }

  doc.save(opts.filename);
}

/** Produces a real, downloadable document-record certificate — used where the prototype has
 * metadata for an uploaded document but not real file content to serve. Never a fake toast. */
export function downloadDocumentRecord(opts: { fields: { label: string; value: string }[]; filename: string; heading: string }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  doc.setFillColor(15, 42, 82);
  doc.rect(0, 0, pageWidth, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Government of Maharashtra', marginX, 28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Document Record Certificate', marginX, 44);

  let y = 96;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.heading, marginX, y);
  y += 28;

  doc.setFontSize(10);
  for (const f of opts.fields) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`${f.label}:`, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(f.value, marginX + 150, y, { maxWidth: pageWidth - marginX * 2 - 150 });
    y += 22;
  }

  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This certificate confirms the metadata record for this document in the Hospital Infrastructure Command Center. It is a demonstration prototype artifact and does not represent the original uploaded file content.', marginX, y, { maxWidth: pageWidth - marginX * 2 });

  doc.save(opts.filename);
}
