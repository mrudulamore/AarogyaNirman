import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { BillAttachment } from '../../../../types';
import { readBillFile } from '../../../../lib/billAttachments';
import { Dialog, DialogContent } from '../../../../components/ui/overlays';

export function BillEvidence({ attachments = [] }: { attachments?: BillAttachment[] }) {
  useUiLanguage();
  const [preview, setPreview] = useState<{ attachment: BillAttachment; url: string } | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  async function view(attachment: BillAttachment) {
    try { setPreview({ attachment, url: URL.createObjectURL(await readBillFile(attachment.id)) }); }
    catch (error) { toast.error(uiText(error instanceof Error ? error.message : 'Unable to open proof.')); }
  }
  return <div className="mt-4 space-y-2">
    <h3 className="text-xs font-semibold text-slate-600">{uiText("Submitted proof")}</h3>
    {attachments.length === 0 && <p className="text-xs text-slate-400">{uiText("No uploaded proof on this older bill.")}</p>}
    {attachments.map((attachment) => <button key={attachment.id} onClick={() => void view(attachment)} className="block w-full rounded-md border border-slate-200 p-2 text-left text-xs hover:bg-navy-50"><span className="font-medium text-navy-700">{attachment.name}</span><span className="mt-1 block text-slate-500">{uiText(attachment.category.replace('_', ' '))} / {uiText((attachment.size / 1024).toFixed(0))}{uiText(" KB")}</span></button>)}
    <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
      {preview && <DialogContent title={uiText(preview.attachment.name)} description={uiText("Submitted bill evidence")} size="lg">
        {preview.attachment.mimeType.startsWith('image/') ? <img src={preview.url} alt={uiText(preview.attachment.name)} className="max-h-[60vh] w-full object-contain" /> : <object data={preview.url} type="application/pdf" className="h-[55vh] w-full"><p className="text-sm">{uiText("PDF preview is unavailable in this browser. Use the file link below.")}</p></object>}
        <a href={preview.url} download={preview.attachment.name} className="mt-3 inline-block text-sm font-medium text-navy-700 underline">{uiText("Download file")}</a>
      </DialogContent>}
    </Dialog>
  </div>;
}
