import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { canReviewProposal, canSeeProposal, PROPOSAL_LABELS, PROPOSAL_ROLES, type ProposalInput, type ProjectProposal } from '../../lib/projectProposals';
import { MAHARASHTRA_HIERARCHY, SCHEMES, ROLE_LABELS } from '../../lib/constants';
import { saveBillFiles } from '../../lib/billAttachments';
import { ProgressDocumentLinks } from '../../components/common/ProgressDocuments';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui/primitives';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/overlays';
import { uiText } from '../../i18n/ui';

const zone = MAHARASHTRA_HIERARCHY.find(item => item.division === 'Pune Division')!;
const projectNames = (district: string) => [`District Hospital Extension ? ${district}`, `Rural Hospital Extension ? ${district}`];
const blank = ():ProposalInput => ({name:'District Hospital Extension ? Pune',district:'Pune',taluka:'Haveli',type:'District Hospital',scheme:'State Plan',estimatedCost:0,bedCount:100,landDetails:'',justification:'',attachments:[]});
const field='ui-input mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
export function ProjectProposals(){
 const state=useStore(), user=state.currentUser;
 const [editing,setEditing]=useState<string|null>(null),[form,setForm]=useState<ProposalInput>(blank),[open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const [detailId,setDetailId]=useState<string|null>(null),[comments,setComments]=useState(''),[ee,setEe]=useState(''),[reference,setReference]=useState('');
 const proposals=state.proposals.filter(p=>canSeeProposal(user,p));
 const detail=proposals.find(p=>p.id===detailId);
 if(!user||!PROPOSAL_ROLES.includes(user.role))return <p>{uiText('You do not have access to project proposals.')}</p>;
 const ministry=user.role==='MINISTER';
 function edit(p?:ProjectProposal){setEditing(p?.id??null);setForm(p?{...p}:blank());setOpen(true)}
 function save(submit:boolean){try{const id=state.saveProposal(form,editing??undefined);setEditing(id);if(submit)state.submitProposal(id);setOpen(false);toast.success(uiText(submit?'Proposal submitted.':'Draft saved.'));}catch(e){toast.error(uiText((e as Error).message))}}
 function review(decision:'APPROVE'|'RETURN'|'REJECT'){try{state.reviewProposal(detail!.id,decision,comments,ee,reference);setDetailId(null);toast.success(uiText('Review saved.'));}catch(e){toast.error(uiText((e as Error).message))}}
 return <div className="space-y-4">
  <PageHeader title={uiText('Project creation & approval')} description={uiText('Ministry → Administrative scrutiny → Chief Engineer → Superintending Engineer → Executive Engineer sanction')} />
  <p className="text-sm text-slate-600">{uiText('Administrative scrutiny is handled by the Commissioner. EE sanction creates the project and an unpublished draft tender.')}</p>
  {ministry&&<Button onClick={()=>edit()}>{uiText('Create proposal')}</Button>}
  <div className="grid gap-3 md:grid-cols-2">{proposals.map(p=><Card key={p.id}><CardHeader><CardTitle>{p.name}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{p.district} · {p.taluka} · {p.scheme}</p><p>{uiText('Estimated cost')}: ₹{(p.estimatedCost/100000).toLocaleString('en-IN')} lakh</p><p className="font-semibold text-blue-800">{uiText(PROPOSAL_LABELS[p.status])}</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{setDetailId(p.id);setComments('');setEe(p.executiveEngineerId??'');setReference('')}}>{uiText(canReviewProposal(user,p)?'Review proposal':'View proposal')}</Button>{ministry&&p.createdById===user.id&&['DRAFT','RETURNED'].includes(p.status)&&<Button onClick={()=>edit(p)}>{uiText('Edit / submit')}</Button>}{p.projectId&&<Link className="p-2 text-blue-700 underline" to={'/projects/'+p.projectId}>{uiText('Open approved project')}</Link>}</div></CardContent></Card>)}</div>
  {!proposals.length&&<p className="rounded-lg border p-6 text-sm text-slate-500">{uiText(ministry?'Create a project proposal to start.':'No proposals are available for your jurisdiction yet.')}</p>}
  <Dialog open={open} onOpenChange={setOpen}><DialogContent title={uiText(editing?'Edit project proposal':'Create project proposal')} size="lg"><form className="space-y-3" onSubmit={e=>{e.preventDefault();save(true)}}>
    <label className="block text-sm">{uiText('Project Name')}<select className={field} value={form.name} onChange={e=>setForm({...form,name:e.target.value,type:e.target.value.startsWith('Rural')?'Rural Hospital':'District Hospital'})}>{[...new Set([...projectNames(form.district), ...(editing && !projectNames(form.district).includes(form.name) ? [form.name] : [])])].map(name=><option key={name}>{name}</option>)}</select></label>
    <label className="block text-sm">{uiText('Zone')}<select className={field} value={zone.division} onChange={()=>{}}><option value={zone.division}>Pune Division</option></select></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">{uiText('District')}<select className={field} value={form.district} onChange={e=>setForm({...form,district:e.target.value,taluka:zone.districts.find(d=>d.district===e.target.value)!.talukas[0],name:projectNames(e.target.value)[form.type==='Rural Hospital'?1:0]})}>{zone.districts.map(d=><option key={d.district}>{d.district}</option>)}</select></label><label className="block text-sm">{uiText('Taluka')}<select className={field} value={form.taluka} onChange={e=>setForm({...form,taluka:e.target.value})}>{(zone.districts.find(d=>d.district===form.district)?.talukas ?? []).map(t=><option key={t}>{t}</option>)}</select></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">{uiText('Project Type')}<select className={field} value={form.type} onChange={e=>setForm({...form,type:e.target.value as ProposalInput['type']})}>{['District Hospital','Rural Hospital','Sub-District Hospital','Women & Child Hospital','Tribal Area Hospital','Community Health Centre'].map(t=><option key={t}>{t}</option>)}</select></label><label className="block text-sm">{uiText('Scheme')}<select className={field} value={form.scheme} onChange={e=>setForm({...form,scheme:e.target.value as ProposalInput['scheme']})}>{SCHEMES.map(t=><option key={t}>{t}</option>)}</select></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">{uiText('Estimated cost (₹ lakh)')}<input type="number" min="0" step="0.01" className={field} value={form.estimatedCost/100000} onChange={e=>setForm({...form,estimatedCost:Number(e.target.value)*100000})}/></label><label className="block text-sm">{uiText('Bed Count')}<input type="number" min="1" className={field} value={form.bedCount} onChange={e=>setForm({...form,bedCount:Number(e.target.value)})}/></label></div>
    <label className="block text-sm">{uiText('Land details')}<textarea className={field} value={form.landDetails} onChange={e=>setForm({...form,landDetails:e.target.value})}/></label>
    <label className="block text-sm">{uiText('Justification')}<textarea className={field} value={form.justification} onChange={e=>setForm({...form,justification:e.target.value})}/></label>
    <label className="block text-sm">{uiText('Documents / drawings (PDF, up to 5 files, 5 MB each)')}<input type="file" multiple accept="application/pdf,.pdf" disabled={busy} className={field} onChange={async e=>{const files=Array.from(e.target.files??[]);e.target.value='';setBusy(true);try{if(files.length+form.attachments.length>5||files.some(f=>f.type!=='application/pdf'))throw new Error('Upload up to five PDF files.');const saved=await saveBillFiles(files.map(file=>({file,category:'SUPPORTING'})));setForm(previous=>({...previous,attachments:[...previous.attachments,...saved]}));}catch(error){toast.error((error as Error).message)}finally{setBusy(false)}}}/></label>
    <ProgressDocumentLinks attachments={form.attachments}/>{form.attachments.map(a=><button type="button" key={a.id} disabled={busy} className="block text-sm text-red-700" onClick={()=>setForm({...form,attachments:form.attachments.filter(x=>x.id!==a.id)})}>{uiText('Remove')}: {a.name}</button>)}
    <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>save(false)}>{uiText('Save draft')}</Button><Button type="submit" disabled={busy}>{uiText('Submit for scrutiny')}</Button></DialogFooter>
  </form></DialogContent></Dialog>
  <Dialog open={!!detail} onOpenChange={v=>!v&&setDetailId(null)}>{detail&&<DialogContent title={detail.name} size="lg"><div className="space-y-3 text-sm">
   <p className="font-semibold">{uiText(PROPOSAL_LABELS[detail.status])}</p><p>{detail.division} · {detail.district} · {detail.taluka}</p><p>{detail.type} · {detail.scheme} · {detail.bedCount} beds · ₹{(detail.estimatedCost/100000).toLocaleString('en-IN')} lakh</p>
   <p className="whitespace-pre-wrap"><strong>{uiText('Land details')}: </strong>{detail.landDetails}</p><p className="whitespace-pre-wrap"><strong>{uiText('Justification')}: </strong>{detail.justification}</p><ProgressDocumentLinks attachments={detail.attachments}/>
   {detail.executiveEngineerId&&<p>{uiText('Assigned EE')}: {state.users.find(u=>u.id===detail.executiveEngineerId)?.name}</p>}{detail.sanctionReference&&<p>{uiText('Sanction reference')}: {detail.sanctionReference}</p>}
   <h3 className="font-semibold">{uiText('Approval history')}</h3>{detail.history.map((h,i)=><div key={i} className="rounded border p-2"><p>{h.actorName} · {ROLE_LABELS[h.role]} · {new Date(h.date).toLocaleString()}</p><p>{h.action} → {PROPOSAL_LABELS[h.to]}</p><p className="whitespace-pre-wrap">{h.comments}</p></div>)}
   {canReviewProposal(user,detail)&&<section className="space-y-3 rounded-lg bg-blue-50 p-3">
    {detail.status==='DIVISION_ASSIGNMENT'&&<label className="block">{uiText('Assign to Executive Engineer')}<select className={field} value={ee} onChange={e=>setEe(e.target.value)}><option value="">{uiText('Select assignee')}</option>{state.users.filter(u=>u.role==='EXECUTIVE_ENGINEER'&&u.division===detail.division).map(u=><option key={u.id} value={u.id}>{u.name} — {u.division}</option>)}</select></label>}
    {detail.status==='EE_SANCTION'&&<label className="block">{uiText('Technical sanction reference')}<input className={field} value={reference} onChange={e=>setReference(e.target.value)}/></label>}
    <label className="block">{uiText('Review comments / reason')}<textarea className={field} value={comments} onChange={e=>setComments(e.target.value)}/></label>
    <div className="flex flex-wrap gap-2"><Button onClick={()=>review('APPROVE')}>{uiText(detail.status==='EE_SANCTION'?'Sanction & create project':detail.status==='DIVISION_ASSIGNMENT'?'Assign to division / EE':'Approve & forward')}</Button><Button variant="outline" onClick={()=>review('RETURN')}>{uiText('Return to Ministry')}</Button><Button variant="outline" onClick={()=>review('REJECT')}>{uiText('Reject')}</Button></div>
   </section>}
  </div></DialogContent>}</Dialog>
 </div>;
}
