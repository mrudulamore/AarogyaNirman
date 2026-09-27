import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '../ui/overlays';
import { PdfPreview } from './PdfPreview';
import { uiText } from '../../i18n/ui';

export function SelectedFilePreview({file}: {file: File}) {
  const [url,setUrl]=useState('');
  useEffect(()=>()=>{if(url) URL.revokeObjectURL(url);},[url]);
  return <><button type="button" onClick={()=>setUrl(URL.createObjectURL(file))} className="block min-h-11 break-all text-left text-xs text-blue-800 underline">{uiText('Preview')}: {file.name}</button><Dialog open={!!url} onOpenChange={open=>!open&&setUrl('')}><DialogContent title={file.name} size="lg">{file.type==='application/pdf'?<PdfPreview url={url}/>:<img src={url} alt={file.name} className="max-h-[60vh] w-full object-contain"/>}</DialogContent></Dialog></>;
}
