import { Capacitor, registerPlugin } from '@capacitor/core';

export type SaveResult = 'saved' | 'cancelled' | 'download-started';
const PdfExport = registerPlugin<{ savePdf(options: { filename: string; base64: string }): Promise<{ cancelled?: boolean }> }>('PdfExport');

export function pdfFilename(name: string): string {
  const stem = name.replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 150);
  return `${stem || 'report'}.pdf`;
}

export async function savePdf(blob: Blob, name: string): Promise<SaveResult> {
  if (!blob.size || blob.type !== 'application/pdf') throw new Error('The generated PDF is empty or invalid. Please retry.');
  const filename = pdfFilename(name);
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable('PdfExport')) throw new Error('Update the Android app to enable PDF saving.');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not prepare the PDF for saving.'));
      reader.readAsDataURL(blob);
    });
    const result = await PdfExport.savePdf({ filename, base64 });
    return result.cancelled ? 'cancelled' : 'saved';
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try { anchor.click(); }
  finally {
    anchor.remove();
    // Keep the URL alive while the browser starts reading the file.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return 'download-started';
}
