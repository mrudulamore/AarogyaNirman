import { jsPDF } from 'jspdf';
import type { PdfJob } from './pdfTypes';
import { uiText } from '../i18n/ui';

/** Browser text shaping preserves Devanagari conjuncts; pages are rasterized so
 * the saved PDF does not depend on fonts installed on the reader's device. */
export async function buildUnicodePdf(job: PdfJob): Promise<Blob> {
  await document.fonts.ready;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const canvas = document.createElement('canvas'); canvas.width = 1190; canvas.height = 1684;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Text rendering is unavailable. Please retry.');
  const ctx = context;
  const margin = 64, width = canvas.width - margin * 2, bottom = 1590;
  let y = margin, pages = 0;
  const font = (bold = false) => { ctx.font = `${bold ? 'bold ' : ''}22px "Nirmala UI", "Noto Sans Devanagari", Mangal, sans-serif`; };
  function reset() { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#0f172a'; font(); y = margin; }
  async function flush() {
    ctx.fillStyle = '#64748b'; ctx.font = '18px sans-serif';
    ctx.fillText(`${pages + 1}`, margin, 1640);
    if (pages++) doc.addPage();
    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 595.28, 841.89);
    reset(); await new Promise(resolve => setTimeout(resolve, 0));
  }
  function wrap(value: string, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of value.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (ctx.measureText(`${line} ${word}`.trim()).width <= maxWidth) { line = `${line} ${word}`.trim(); continue; }
        if (line) { lines.push(line); line = ''; }
        // Preserve grapheme clusters when a long reference has no spaces.
        for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)) {
          if (line && ctx.measureText(line + segment).width > maxWidth) { lines.push(line); line = ''; }
          line += segment;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  async function text(value: string, bold = false) {
    font(bold);
    for (const line of wrap(value, width)) {
      if (y + 32 > bottom) await flush();
      font(bold); ctx.fillStyle = '#0f172a'; ctx.fillText(line, margin, y + 24); y += 34;
    }
    y += 10;
  }
  reset();
  if (job.kind === 'record') {
    await text(uiText(job.options.heading), true);
    for (const field of job.options.fields) await text(`${uiText(field.label)}: ${field.value}`);
  } else {
    const opts = job.options;
    await text(uiText(opts.title), true); await text(opts.subtitle);
    await text(`${opts.scopeLine} · ${opts.generatedBy}`);
    for (const kpi of opts.kpis ?? []) await text(`${uiText(kpi.label)}: ${kpi.value}`, true);
    for (const section of opts.sections) {
      await text(uiText(section.heading), true);
      const colWidth = width / section.columns.length;
      async function row(values: (string | number)[], header = false) {
        font(header);
        const cells = values.map(value => wrap(String(value ?? ''), colWidth - 16));
        const lineCount = Math.max(1, ...cells.map(lines => lines.length));
        for (let start = 0; start < lineCount;) {
          if (y + 42 > bottom) await flush();
          const count = Math.min(lineCount - start, Math.max(1, Math.floor((bottom - y - 12) / 30)));
          ctx.fillStyle = header ? '#e2e8f0' : '#f8fafc'; ctx.fillRect(margin, y, width, count * 30 + 12);
          ctx.fillStyle = '#0f172a'; font(header);
          cells.forEach((lines, column) => lines.slice(start, start + count).forEach((line, index) => ctx.fillText(line, margin + column * colWidth + 8, y + 26 + index * 30)));
          y += count * 30 + 14; start += count;
        }
      }
      await row(section.columns.map(uiText), true);
      for (const values of section.rows) { if (y + 42 > bottom) { await flush(); await text(uiText(section.heading), true); await row(section.columns.map(uiText), true); } await row(values); }
      y += 20;
    }
  }
  await text(uiText('This is a system-generated demonstration report using prototype data. Not a statutory document.'));
  if (y > margin) await flush();
  return doc.output('blob');
}
