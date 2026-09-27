import type { Bill, BillAttachment, ProjectDocument, Defect, Project } from '../types';

type Records = { bills: Bill[]; documents: ProjectDocument[]; defects: Defect[]; projects: Project[] };

/** Only reference records get examples; user uploads are never replaced. */
export function withSampleDocuments<T extends Records>(records: T, reference: Records): T {
  const projectName = (id: string) => records.projects.find(p => p.id === id)?.name ?? id;
  function attach<T extends { id: string; attachments?: BillAttachment[] }>(rows: T[], originals: T[], describe: (row: T) => { title: string; fields: [string, string][] }): T[] {
    const ids = new Set(originals.map(row => row.id));
    return rows.map(row => {
      if (!ids.has(row.id) || row.attachments?.length) return row;
      const sample = describe(row);
      return { ...row, attachments: [{ id: `sample:${row.id}`, category: 'SUPPORTING', name: `Sample-${row.id}.pdf`, mimeType: 'application/pdf', size: 0, sample }] };
    });
  }
  return { ...records,
    bills: attach(records.bills, reference.bills, bill => ({ title: 'Sample RA Bill', fields: [
      ['Bill number', bill.billNumber], ['Project', projectName(bill.projectId)],
      ['Billing period', `${bill.periodFrom} to ${bill.periodTo}`],
      ['Gross amount (INR)', bill.grossAmount.toFixed(2)], ['Deductions (INR)', bill.deductions.toFixed(2)],
      ['GST (INR)', bill.gst.toFixed(2)], ['Retention (INR)', bill.retention.toFixed(2)],
      ['Penalty (INR)', bill.penalty.toFixed(2)], ['Net payable (INR)', bill.netPayable.toFixed(2)],
      ['Record status', bill.status], ['Submitted date', bill.submittedDate],
    ] })).map(bill => {
      // Supplement reference bill PDFs; never attach examples to user-created bills or uploads.
      if (!bill.attachments?.some(file => file.id === `sample:${bill.id}` && file.sample)
        || bill.attachments.some(file => file.id === `sample-review:${bill.id}`)) return bill;
      return { ...bill, attachments: [...bill.attachments, {
        id: `sample-review:${bill.id}`, category: 'SUPPORTING' as const,
        name: `Bill-Review-${bill.billNumber.replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`,
        mimeType: 'application/pdf', size: 0,
        sample: { title: 'Bill Review Sheet', fields: [
          ['Bill number', bill.billNumber], ['Project', projectName(bill.projectId)],
          ['Billing period', `${bill.periodFrom} to ${bill.periodTo}`],
          ['Gross amount (INR)', bill.grossAmount.toFixed(2)], ['Net payable (INR)', bill.netPayable.toFixed(2)],
          ['Measurement review', 'Check claimed quantities against the measurement book and approved BOQ.'],
          ['Quality review', 'Check inspection results and outstanding defects for the billed work.'],
          ['Financial review', 'Check deductions, GST, retention and previous payments.'],
          ['Reviewer outcome', 'To be recorded by the authorized reviewing officer.'],
        ] as [string, string][] },
      }] };
    }),
    documents: attach(records.documents, reference.documents, doc => ({ title: `Sample ${doc.type}`, fields: [
      ['Document', doc.name], ['Project', projectName(doc.projectId)], ['Document ID', doc.id],
      ['Type', doc.type], ['Version', String(doc.version)], ['Record date', doc.uploadDate], ['Record status', doc.approvalStatus],
    ] })),
    defects: attach(records.defects, reference.defects, defect => ({ title: 'Sample Defect Report', fields: [
      ['Defect ID', defect.id], ['Project', projectName(defect.projectId)], ['Location', defect.location],
      ['Description', defect.description], ['Severity', defect.severity], ['Record status', defect.status], ['Due date', defect.dueDate],
    ] })),
  };
}

export async function sampleDocumentBlob(sample: NonNullable<BillAttachment['sample']>): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  function header() {
    pdf.setTextColor(170, 75, 20); pdf.setFontSize(13);
    pdf.text('SAMPLE DOCUMENT - FOR REVIEW', 15, 18);
    pdf.setTextColor(30, 45, 65); pdf.setFontSize(16);
    pdf.text(pdf.splitTextToSize(sample.title, 178), 15, 32);
    pdf.setFontSize(10);
  }
  header(); let y = 55;
  for (const [label, value] of sample.fields) {
    const lines = pdf.splitTextToSize(`${label}: ${value}`, 175) as string[];
    for (const line of lines) { if (y > 260) { pdf.addPage(); header(); y = 55; } pdf.text(line, 15, y); y += 6; }
    y += 4;
  }
  if (y > 245) { pdf.addPage(); header(); y = 55; }
  pdf.setTextColor(130, 65, 25);
  pdf.text(['Illustrative document generated from the project record.', 'Not an original invoice, signed certificate, or verified supporting evidence.'], 15, y + 8);
  return pdf.output('blob');
}
