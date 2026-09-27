import type { ControlInput, ControlRecord } from './projectControls';
import type { StoreState } from '../store/useStore';
import { todayDate } from './fundDisbursal';
export const REPORT_WRITERS = ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'SUPERADMIN'];
export const REPORT_REVIEWERS = ['EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'SUPERADMIN'];
export function measurementQuantity(f: Record<string, string>) {
  const keys = f.method === 'VOLUME' ? ['count','length','breadth','depth'] : f.method === 'AREA' ? ['count','length','breadth'] : f.method === 'LENGTH' ? ['count','length'] : f.method === 'COUNT' ? ['count'] : f.method === 'DIRECT' ? ['measuredQuantity'] : [];
  if (!keys.length || keys.some(k => !f[k]?.trim() || !Number.isFinite(Number(f[k])) || Number(f[k]) <= 0)) return NaN;
  const deduction = Number(f.deduction || 0);
  if (!Number.isFinite(deduction) || deduction < 0) return NaN;
  return Math.round((keys.reduce((n,k)=>n*Number(f[k]),1) - deduction)*1e6)/1e6;
}
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? '') && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
export function validateSiteReport(s: StoreState, input: ControlInput, reviewing: boolean) {
  if (!['MEASUREMENT','MATERIAL_TEST'].includes(input.kind)) return;
  if (!reviewing && !REPORT_WRITERS.includes(s.currentUser?.role ?? '')) throw new Error('Only assigned engineers or PMC can submit site reports.');
  if (input.category !== input.kind || input.supersedesId) throw new Error('Submit a separate traceable report; existing site reports cannot be overwritten.');
  const f = input.fields;
  if (f.correctionOf && !s.controlRecords.some(r=>r.id===f.correctionOf && r.projectId===input.projectId && r.kind===input.kind && r.status==='REJECTED')) throw new Error('A correction must reference a returned report from this project.');
  const item = s.boqItems.find(b=>b.id===f.boqItemId && b.projectId===input.projectId);
  if (!item || !f.location?.trim()) throw new Error('Select a project BOQ item and work location.');
  if (f.billId && !s.bills.some(b=>b.id===f.billId && b.projectId===input.projectId)) throw new Error('Select a bill from this project.');
  if (f.inspectionId && !s.inspections.some(i=>i.id===f.inspectionId && i.projectId===input.projectId)) throw new Error('Select an inspection from this project.');
  if (input.kind === 'MEASUREMENT') {
    if (!f.bookNumber?.trim() || !f.pageNumber?.trim() || !validDate(f.measurementDate) || f.measurementDate > todayDate()) throw new Error('Enter the MB book, page and a valid measurement date.');
    const quantity = measurementQuantity(f);
    if (!Number.isFinite(quantity) || quantity <= 0 || Number(f.quantity) !== quantity || Number(f.rate) !== item.rate || f.unit !== item.unit) throw new Error('Measurement quantity, unit and rate must match the calculation and BOQ.');
    const unit=item.unit.toLowerCase().replace(/\s/g,'');
    const compatible = f.method === 'DIRECT' || f.method === 'VOLUME' && ['m3','m³','cum','cu.m'].includes(unit) || f.method === 'AREA' && ['m2','m²','sqm','sq.m'].includes(unit) || f.method === 'LENGTH' && ['m','rm','rmt'].includes(unit) || f.method === 'COUNT' && ['nos','no','number','each'].includes(unit);
    if (!compatible || f.method === 'DIRECT' && !f.reason?.trim()) throw new Error('Use a calculation matching the BOQ unit; explain direct quantities.');
    const norm=(v:string)=>v.trim().toLowerCase();
    if (s.controlRecords.some(r=>r.id!==(input as ControlRecord).id && r.projectId===input.projectId && r.kind==='MEASUREMENT' && r.status!=='REJECTED' && r.fields.boqItemId===f.boqItemId && ['bookNumber','pageNumber','location'].every(k=>norm(r.fields[k]??'')===norm(f[k])))) throw new Error('This MB page, item and location already has an entry.');
  } else {
    if (['material','testName','sampleReference','laboratory','standardVersion','acceptanceCriteria','resultValue','resultUnit'].some(k=>!f[k]?.trim()) || !['PASS','FAIL','INCONCLUSIVE'].includes(f.result)) throw new Error('Complete the material, sample, laboratory, test criteria and laboratory result.');
    if (![f.sampleDate,f.testDate].every(validDate) || f.testDate < f.sampleDate || f.testDate > todayDate()) throw new Error('Test dates must follow sample collection and cannot be in the future.');
    if (f.measurementId && !s.controlRecords.some(r=>r.id===f.measurementId && r.kind==='MEASUREMENT' && r.projectId===input.projectId && r.fields.boqItemId===f.boqItemId && r.status!=='REJECTED')) throw new Error('Select an MB entry for the same project and BOQ item.');
  }
}
