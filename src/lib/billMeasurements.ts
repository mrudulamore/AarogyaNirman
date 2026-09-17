import type { Bill } from '../types';
import type { StoreState } from '../store/useStore';
import { activeControls } from './projectControls';

export function previousClaimedQuantity(s: StoreState, projectId: string, boqItemId: string, excludeBill?: string) {
  return s.measurements.filter(m => m.projectId === projectId && m.boqItemId === boqItemId && (!excludeBill || m.billId !== excludeBill) && (!m.billId || s.bills.some(b => b.id === m.billId && b.status !== 'REJECTED'))).reduce((sum, m) => sum + m.currentQty, 0);
}
export function validateBillMeasurements(s: StoreState, bill: Omit<Bill, 'id' | 'status' | 'submittedDate'>) {
  const lines = bill.measurementLines ?? [];
  if (!lines.length || new Set(lines.map(l => l.boqItemId)).size !== lines.length) throw new Error('Add at least one distinct BOQ measurement line.');
  let gross = 0;
  const variations = activeControls(s, bill.projectId).filter(r => r.kind === 'VARIATION');
  for (const line of lines) {
    const item = s.boqItems.find(b => b.projectId === bill.projectId && b.id === line.boqItemId);
    if (!item || !Number.isFinite(line.quantity) || line.quantity <= 0 || !line.location.trim() || !line.measurementReference.trim()) throw new Error('Each line needs a valid BOQ item, positive quantity, location and measurement reference.');
    const previous = previousClaimedQuantity(s, bill.projectId, item.id);
    const additional = variations.filter(r => r.fields.boqItemId === item.id).reduce((n, r) => n + Number(r.fields.quantityDelta), 0);
    if (previous + line.quantity > item.plannedQty + additional + 0.000001) throw new Error('Cumulative measured quantity exceeds the authorized BOQ quantity.');
    if (previous + line.quantity > item.plannedQty && !variations.some(r => r.id === line.variationId && r.fields.boqItemId === item.id)) throw new Error('Link the approved variation for quantities above the original BOQ.');
    if (s.measurements.some(m => m.projectId === bill.projectId && m.boqItemId === item.id && m.measurementReference?.trim().toLowerCase() === line.measurementReference.trim().toLowerCase() && m.location?.trim().toLowerCase() === line.location.trim().toLowerCase() && (!m.billId || s.bills.some(b => b.id === m.billId && b.status !== 'REJECTED')))) throw new Error('This work location and measurement reference have already been claimed.');
    gross += line.quantity * item.rate;
  }
  if (Math.abs(Math.round(gross * 100) / 100 - bill.grossAmount) > 0.005) throw new Error('Gross work value must match the measured BOQ lines.');
}
