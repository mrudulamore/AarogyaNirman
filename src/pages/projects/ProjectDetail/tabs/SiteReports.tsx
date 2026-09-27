import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../../../../store/useStore';
import type { Project } from '../../../../types';
import type { ControlInput, ControlRecord } from '../../../../lib/projectControls';
import { validateControl } from '../../../../lib/projectControls';
import { measurementQuantity, REPORT_WRITERS, REPORT_REVIEWERS } from '../../../../lib/siteReports';
import { computeProjectScope } from '../../../../lib/projectScope';
import { saveBillFiles } from '../../../../lib/billAttachments';
import { downloadPdfReport } from '../../../../lib/pdf';
import { todayDate } from '../../../../lib/fundDisbursal';
import { formatCurrency } from '../../../../lib/utils';
import { uiText, useUiLanguage } from '../../../../i18n/ui';
import { Button, Input, NativeSelect, Textarea } from '../../../../components/ui/primitives';
import { BillEvidence } from './BillEvidence';

type Kind = 'MEASUREMENT' | 'MATERIAL_TEST';
const labels: Record<string,string> = {
 correctionOf:'Corrects returned report',bookNumber:'MB book number',pageNumber:'MB page / line',measurementDate:'Measurement date',boqItemId:'BOQ item',location:'Work location',method:'Measurement method',count:'Number of identical units',length:'Length (m)',breadth:'Breadth (m)',depth:'Depth / height (m)',measuredQuantity:'Direct measured quantity',deduction:'Quantity deduction (BOQ unit)',quantity:'Net measured quantity',unit:'BOQ unit',rate:'BOQ rate',billId:'Linked bill (optional)',reason:'Remarks / calculation basis',material:'Material',testName:'Test name',sampleReference:'Sample / batch reference',sampleDate:'Sample collection date',testDate:'Test date',laboratory:'Laboratory / testing agency',standardVersion:'Standard and version',acceptanceCriteria:'Acceptance criteria',resultValue:'Measured test result',resultUnit:'Test result unit',result:'Laboratory outcome',measurementId:'Linked MB entry (optional)',inspectionId:'Inspection (optional)'
};
const base = () => ({measurementDate:todayDate(),sampleDate:todayDate(),testDate:todayDate(),method:'DIRECT',count:'1',deduction:'0'});
export function SiteReports({project}: {project:Project}) {
 useUiLanguage();
 const s=useStore();
 const user=s.currentUser;
 const [params]=useSearchParams();
 const requested=params.get('siteReport');
 const [kind,setKind]=useState<Kind>('MEASUREMENT');
 const [reference,setReference]=useState('');
 const [fields,setFields]=useState<Record<string,string>>(base);
 const [files,setFiles]=useState<File[]>([]);
 const [fileKey,setFileKey]=useState(0);
 const [editing,setEditing]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [status,setStatus]=useState('ALL');
 const [notes,setNotes]=useState<Record<string,string>>({});
 const assigned=!!user && computeProjectScope(user,s.projects,s.contractors).projectIds.has(project.id);
 const canWrite=assigned && REPORT_WRITERS.includes(user!.role);
 const canReview=assigned && REPORT_REVIEWERS.includes(user!.role);
 const entries=s.controlRecords.filter(r=>r.projectId===project.id && ['MEASUREMENT','MATERIAL_TEST'].includes(r.kind));
 const visible=entries.filter(r=>r.kind===kind && (status==='ALL'||r.status===status) && `${r.reference} ${Object.values(r.fields).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 useEffect(()=>{const target=useStore.getState().controlRecords.find(r=>r.id===requested&&r.projectId===project.id&&['MEASUREMENT','MATERIAL_TEST'].includes(r.kind));if(target){setKind(target.kind as Kind);setQuery(target.reference);setStatus('ALL');}},[requested,project.id]);
 const items=s.boqItems.filter(b=>b.projectId===project.id);
 const item=items.find(b=>b.id===fields.boqItemId);
 const quantity=measurementQuantity(fields);
 const draftKey=`site-report-draft:${user?.id}:${project.id}:${kind}`;
 const title=kind==='MEASUREMENT'?'Measurement Book':'Material testing reports';
 const name=(id:string)=>s.users.find(u=>u.id===id)?.name??id;
 function value(k:string,v:string) {
  if(k==='boqItemId')return items.find(b=>b.id===v)?.item??v;
  if(k==='billId')return s.bills.find(b=>b.id===v)?.billNumber??v;
  if(k==='measurementId'||k==='correctionOf')return entries.find(r=>r.id===v)?.reference??v;
  return v;
 }
 function reset(){setReference('');setFields(base());setFiles([]);setFileKey(k=>k+1);setError('');}
 function changeKind(next:Kind){setKind(next);reset();setEditing(false);setStatus('ALL');setQuery('');}
 function draft(load:boolean){try{
   if(load){const raw=localStorage.getItem(draftKey);if(!raw)throw new Error('No saved draft for this account and project.');const d=JSON.parse(raw);if(typeof d.reference!=='string'||!d.fields||Object.values(d.fields).some(v=>typeof v!=='string'))throw new Error('Invalid saved draft.');setReference(d.reference);setFields(d.fields);setEditing(true);setFiles([]);setFileKey(k=>k+1);}
   else localStorage.setItem(draftKey,JSON.stringify({reference,fields}));
   toast.success(uiText(load?'Draft loaded. Reattach supporting files.':'Draft saved on this device.'));
 }catch(e){setError((e as Error).message);}}
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setBusy(true);try{
   const f=kind==='MEASUREMENT'?{...fields,quantity:String(quantity),unit:item?.unit??'',rate:String(item?.rate??'')}:fields;
   const input:ControlInput={projectId:project.id,kind,category:kind,reference,fields:f,attachments:files.map((file,i)=>({id:String(i),name:file.name,size:file.size,mimeType:file.type,category:'SUPPORTING'}))};
   validateControl(useStore.getState(),input);
   const actor=user!.id;
   const attachments=await saveBillFiles(files.map(file=>({file,category:'SUPPORTING'})));
   if(useStore.getState().currentUser?.id!==actor)throw new Error('Your account changed. Reopen the form.');
   await useStore.getState().submitControl({...input,attachments});
   try{localStorage.removeItem(draftKey);}catch{/* The submitted record is already saved. */}
   reset();setEditing(false);toast.success(uiText('Submitted for verification.'));
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function review(r:ControlRecord,approve:boolean){setBusy(true);setError('');try{await s.reviewControl(r.id,approve,notes[r.id]??'');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function exportReport(){void downloadPdfReport({title:uiText(title),subtitle:project.name,scopeLine:uiText('Filtered register; report acceptance does not change a laboratory result.'),generatedBy:user?.name??'',filename:`${project.id}-${kind.toLowerCase()}.pdf`,sections:[...(kind==='MEASUREMENT'?[{heading:uiText('Accepted measurement abstract'),columns:[uiText('BOQ item'),uiText('BOQ unit'),uiText('Accepted measured quantity'),uiText('Measured work value')],rows:items.filter(b=>visible.some(r=>r.status==='VERIFIED'&&r.fields.boqItemId===b.id)).map(b=>{const accepted=visible.filter(r=>r.status==='VERIFIED'&&r.fields.boqItemId===b.id);return [b.item,b.unit,accepted.reduce((n,r)=>n+Number(r.fields.quantity),0),formatCurrency(accepted.reduce((n,r)=>n+Number(r.fields.quantity)*Number(r.fields.rate),0))];})}]:[]),...visible.map(r=>({heading:`${r.reference} · ${uiText(r.status)}`,columns:[uiText('Field'),uiText('Value')],rows:[...Object.entries(r.fields).filter(([,v])=>v).map(([k,v])=>[uiText(labels[k]??k),value(k,v)]),[uiText('Submitted by'),name(r.submittedBy)],[uiText('Submitted at'),r.submittedAt],[uiText('Reviewed by'),r.reviewedBy?name(r.reviewedBy):'—'],[uiText('Review date'),r.reviewedAt??'—'],[uiText('Decision notes'),r.decision??'—'],[uiText('Supporting proof'),r.attachments.map(a=>a.name).join(', ')]]}))]});}
 function field(k:string,options?:{id:string;label:string}[],optional=false){return <label key={k} className="block text-sm font-medium text-slate-700">{uiText(labels[k])}{!optional?' *':''}{options?<NativeSelect required={!optional} value={fields[k]??''} onChange={e=>setFields(f=>({...f,[k]:e.target.value,...(k==='boqItemId'?{measurementId:''}:{})}))}><option value="">{uiText('Select')}</option>{options.map(o=><option key={o.id} value={o.id}>{uiText(o.label)}</option>)}</NativeSelect>:<Input required={!optional} type={k.endsWith('Date')?'date':['count','length','breadth','depth','measuredQuantity','deduction'].includes(k)?'number':'text'} step="any" min="0" max={k.endsWith('Date')?todayDate():undefined} value={fields[k]??''} onChange={e=>setFields(f=>({...f,[k]:e.target.value}))}/>}</label>;}
 if(!assigned)return null;
 return <section id="site-reports" className="space-y-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-blue-950">{uiText('Measurements & material tests')}</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">{uiText('Record site quantities and laboratory evidence. An independent reviewer checks each submission. Records and files are stored on this device.')}</p></div><Button variant="outline" disabled={!visible.length||busy} onClick={exportReport}>{uiText('Export register PDF')}</Button></div>
  <div className="flex flex-wrap gap-2" aria-label={uiText('Report type')}>{(['MEASUREMENT','MATERIAL_TEST'] as Kind[]).map(k=><Button key={k} disabled={busy} variant={kind===k?'primary':'outline'} aria-pressed={kind===k} onClick={()=>changeKind(k)}>{uiText(k==='MEASUREMENT'?'Measurement Book':'Material testing reports')} ({entries.filter(r=>r.kind===k).length})</Button>)}</div>
  <div className="grid grid-cols-3 gap-2 text-center text-sm">{(['PENDING','VERIFIED','REJECTED'] as const).map(st=><button key={st} onClick={()=>setStatus(status===st?'ALL':st)} aria-pressed={status===st} className="rounded-xl border bg-white p-3"><strong className="block text-xl text-blue-900">{entries.filter(r=>r.kind===kind&&r.status===st).length}</strong>{uiText(st==='PENDING'?'Awaiting review':st==='VERIFIED'?'Accepted records':'Returned records')}</button>)}</div>
  {canWrite&&<div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>setEditing(!editing)}>{uiText(editing?'Close form':kind==='MEASUREMENT'?'Add MB entry':'Add material test report')}</Button><Button variant="outline" disabled={busy} onClick={()=>draft(true)}>{uiText('Load saved draft')}</Button></div>}
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{uiText(error)}</p>}
  {canWrite&&editing&&<form onSubmit={submit} className="rounded-xl border bg-white p-4"><fieldset disabled={busy} className="space-y-4"><label className="block text-sm font-medium">{uiText(kind==='MEASUREMENT'?'Unique MB entry reference':'Laboratory report reference')} *<Input required value={reference} onChange={e=>setReference(e.target.value)}/></label><div className="grid gap-4 sm:grid-cols-2">
   {field('boqItemId',items.map(b=>({id:b.id,label:`${b.item} (${b.unit})`})))}{field('location')}
   {kind==='MEASUREMENT'?<>{['bookNumber','pageNumber','measurementDate'].map(k=>field(k))}{field('method',['DIRECT','VOLUME','AREA','LENGTH','COUNT'].map(id=>({id,label:id})))}{(fields.method==='DIRECT'?['measuredQuantity']:fields.method==='VOLUME'?['count','length','breadth','depth']:fields.method==='AREA'?['count','length','breadth']:fields.method==='LENGTH'?['count','length']:['count']).map(k=>field(k))}{field('deduction',undefined,true)}</>:<>{['material','testName','sampleReference','sampleDate','testDate','laboratory','standardVersion','acceptanceCriteria','resultValue','resultUnit'].map(k=>field(k))}{field('result',['PASS','FAIL','INCONCLUSIVE'].map(id=>({id,label:id})))}{field('measurementId',entries.filter(r=>r.kind==='MEASUREMENT'&&r.status!=='REJECTED'&&r.fields.boqItemId===fields.boqItemId).map(r=>({id:r.id,label:r.reference})),true)}{field('inspectionId',s.inspections.filter(i=>i.projectId===project.id).map(i=>({id:i.id,label:i.id})),true)}</>}
   {field('billId',s.bills.filter(b=>b.projectId===project.id).map(b=>({id:b.id,label:b.billNumber})),true)}{field('reason',undefined,kind!=='MEASUREMENT'||fields.method!=='DIRECT')}
  </div>
  {kind==='MEASUREMENT'&&<div className="rounded-xl bg-blue-50 p-4"><strong>{uiText('Net measured quantity')}: {Number.isFinite(quantity)?quantity:'—'} {item?.unit}</strong><p>{uiText('Measured work value')}: {Number.isFinite(quantity)&&item?formatCurrency(quantity*item.rate):'—'}</p><p className="mt-1 text-xs">{uiText('Dimensions use metres. Deductions use the BOQ unit. Direct quantities require a calculation basis. Measurement value is not a certified bill or payment.')}</p></div>}
  <label className="block text-sm font-medium">{uiText('Supporting proof')} *<Input key={fileKey} type="file" required multiple accept="application/pdf,image/jpeg,image/png" onChange={e=>setFiles(Array.from(e.target.files??[]))}/></label><p className="text-xs text-slate-500">{uiText('PDF, JPEG or PNG; up to 5 MB each, 6 files total. Attachments are saved on this device.')}</p><div className="flex flex-wrap gap-2"><Button type="submit">{uiText(busy?'Saving proof...':'Submit for verification')}</Button><Button type="button" variant="outline" onClick={()=>draft(false)}>{uiText('Save draft')}</Button></div></fieldset></form>}
  <div className="grid gap-3 sm:grid-cols-2"><Input aria-label={uiText('Search reports')} placeholder={uiText('Search reports')} value={query} onChange={e=>setQuery(e.target.value)}/><NativeSelect aria-label={uiText('Review status')} value={status} onChange={e=>setStatus(e.target.value)}>{['ALL','PENDING','VERIFIED','REJECTED'].map(st=><option key={st} value={st}>{uiText(st)}</option>)}</NativeSelect></div>
  {!visible.length&&<p className="rounded-xl bg-white p-5 text-sm text-slate-500">{uiText('No reports match these filters.')}</p>}
  {[...visible].reverse().map(r=>{const tests=entries.filter(t=>t.kind==='MATERIAL_TEST'&&t.fields.measurementId===r.id);const boq=items.find(b=>b.id===r.fields.boqItemId);const measured=entries.filter(m=>m.kind==='MEASUREMENT'&&m.status==='VERIFIED'&&m.fields.boqItemId===r.fields.boqItemId).reduce((n,m)=>n+Number(m.fields.quantity),0);return <article key={r.id} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><h3 className="break-words font-bold text-blue-950">{r.reference}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{uiText(r.status==='VERIFIED'?'Accepted records':r.status==='REJECTED'?'Returned records':'Awaiting review')}</span></div><p className="text-sm text-slate-600">{value('boqItemId',r.fields.boqItemId)} · {r.fields.location}</p>
   {r.kind==='MEASUREMENT'?<><p className="text-lg font-semibold">{r.fields.quantity} {r.fields.unit} · {formatCurrency(Number(r.fields.quantity)*Number(r.fields.rate))}</p><p className="text-xs text-slate-600">{uiText('Accepted MB quantity for this BOQ item')}: {measured} {boq?.unit} · {uiText('BOQ quantity')}: {boq?.plannedQty}</p>{boq&&measured>boq.plannedQty&&<p className="text-sm text-amber-800">{uiText('Measured quantity exceeds original BOQ. Review approved variations before billing.')}</p>}<p className="text-sm">{uiText('Linked material tests')}: {tests.length} · {uiText('Failed tests')}: {tests.filter(t=>t.fields.result==='FAIL').length}</p></>:<p className={`rounded-lg p-3 text-sm font-semibold ${r.fields.result==='FAIL'?'bg-red-50 text-red-800':r.fields.result==='PASS'?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}>{uiText('Laboratory outcome')}: {uiText(r.fields.result)} · {r.fields.resultValue} {r.fields.resultUnit}</p>}
   {r.fields.billId&&<Link className="inline-block text-sm font-semibold text-blue-700 underline" to={`/projects/${project.id}?tab=finance&bill=${encodeURIComponent(r.fields.billId)}`}>{uiText('Open linked bill')}: {value('billId',r.fields.billId)}</Link>}
   <details><summary className="cursor-pointer text-sm font-semibold text-blue-800">{uiText('View details and evidence')}</summary><dl className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(r.fields).filter(([,v])=>v).map(([k,v])=><div key={k}><dt className="text-xs text-slate-500">{uiText(labels[k]??k)}</dt><dd className="break-words text-sm">{value(k,v)}</dd></div>)}</dl><BillEvidence attachments={r.attachments}/></details>
   <p className="text-xs text-slate-500">{uiText('Submitted by')}: {name(r.submittedBy)} · {r.submittedAt.slice(0,10)}</p>{r.reviewedBy&&<p className="text-sm">{uiText('Reviewed by')}: {name(r.reviewedBy)} · {r.reviewedAt?.slice(0,10)} · {r.decision}</p>}
   {r.status==='REJECTED'&&canWrite&&<Button variant="outline" disabled={busy} onClick={()=>{setFields({...r.fields,correctionOf:r.id});setReference('');setFiles([]);setFileKey(k=>k+1);setEditing(true);toast.info(uiText('Enter a new reference and reattach corrected evidence. The returned record is retained.'));}}>{uiText('Prepare corrected report')}</Button>}
   {canReview&&r.status==='PENDING'&&r.submittedBy!==user!.id&&<div className="space-y-2 border-t pt-3"><Textarea aria-label={uiText('Decision notes')} placeholder={uiText('Decision notes')} value={notes[r.id]??''} onChange={e=>setNotes(n=>({...n,[r.id]:e.target.value}))}/><p className="text-xs text-slate-500">{uiText('Accepting a report confirms its record, not that the material passed.')}</p><div className="flex flex-wrap gap-2"><Button disabled={busy||!notes[r.id]?.trim()} onClick={()=>void review(r,true)}>{uiText('Accept record')}</Button><Button variant="outline" disabled={busy||!notes[r.id]?.trim()} onClick={()=>void review(r,false)}>{uiText('Return for correction')}</Button></div></div>}
  </article>;})}
 </section>;
}
