import { tabsForRole } from '../../../../lib/projectTabAccess';
import { Link } from 'react-router-dom';
import { useStore } from '../../../../store/useStore';
import { uiText } from '../../../../i18n/ui';
export function SiteReportLinks({projectId}:{projectId:string}) {
 const records=useStore(s=>s.controlRecords).filter(r=>r.projectId===projectId&&['MEASUREMENT','MATERIAL_TEST'].includes(r.kind));
 const bills=useStore(s=>s.bills);
 const role=useStore(s=>s.currentUser?.role);
 if(!tabsForRole(role).some(t=>t.value==='quality'))return null;
 return <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4"><Link className="font-semibold text-blue-900 underline" to={`/projects/${projectId}?tab=quality#site-reports`}>{uiText('Measurements & material tests')} ({records.length})</Link><p className="text-xs text-slate-600">{uiText('Review measurement evidence and laboratory outcomes before certifying bills. These records do not automatically certify quantities or release payments.')}</p>{records.filter(r=>r.fields.billId).map(r=><Link key={r.id} className={`block rounded-lg bg-white p-3 text-sm ${r.fields.result==='FAIL'?'text-red-800':'text-blue-900'}`} to={`/projects/${projectId}?tab=quality&siteReport=${encodeURIComponent(r.id)}#site-reports`}>{bills.find(b=>b.id===r.fields.billId)?.billNumber} · {r.reference} · {uiText(r.status)}{r.fields.result?` · ${uiText(r.fields.result)}`:''}</Link>)}</div>;
}
