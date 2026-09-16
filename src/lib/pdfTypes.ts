export interface PdfSection {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface PdfKpi {
  label: string;
  value: string;
}

export type PdfReportOptions = {
  title: string;
  subtitle: string;
  scopeLine: string;
  generatedBy: string;
  kpis?: PdfKpi[];
  sections: PdfSection[];
  filename: string;
};
export interface DocumentRecordOptions { fields: { label: string; value: string }[]; filename: string; heading: string }
export type PdfJob = { kind: 'report'; options: PdfReportOptions } | { kind: 'record'; options: DocumentRecordOptions };
