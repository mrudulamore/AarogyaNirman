import type { Bill, Project, User } from '../types';
import { todayDate } from './fundDisbursal';

export type BillSubmission = Omit<Bill, 'id' | 'status' | 'submittedDate'>;
export const MAX_BILL_FILE_BYTES = 5 * 1024 * 1024;
export const BILL_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function validateBillSubmission(bill: BillSubmission, user: User | null, project: Project | undefined, accessibleProjectIds: Set<string>, existing: Bill[]) {
  if (user?.role !== 'CONTRACTOR') throw new Error('Only contractors can submit RA bills.');
  if (!project || !accessibleProjectIds.has(project.id) || bill.contractorId !== project.contractorId) throw new Error('You can only submit bills for your own contracted projects.');
  if (!bill.billNumber.trim() || !bill.workOrderReference?.trim() || !bill.measurementBookId?.trim() || !bill.workDescription?.trim()) throw new Error('Enter the bill number, work-order reference, measurement reference and work description.');
  if (existing.some((item) => item.projectId === bill.projectId && item.billNumber.trim().toLowerCase() === bill.billNumber.trim().toLowerCase())) throw new Error('This bill number already exists for this project.');
  const validDate = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (![bill.periodFrom, bill.periodTo, bill.invoiceDate].every(validDate) || bill.periodFrom > bill.periodTo || bill.periodTo > bill.invoiceDate! || bill.invoiceDate! > todayDate()) throw new Error('Use a valid billing period ending on or before the bill date; the bill date cannot be in the future.');
  const amounts = [bill.grossAmount, bill.gst, bill.deductions, bill.retention, bill.penalty, bill.netPayable];
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0) || bill.grossAmount <= 0 || bill.netPayable <= 0) throw new Error('Enter valid non-negative amounts with positive gross and net claims.');
  const net = Math.round((bill.grossAmount + bill.gst - bill.deductions - bill.retention - bill.penalty) * 100) / 100;
  if (Math.abs(net - bill.netPayable) > 0.005) throw new Error('The net claim does not match the entered amounts.');
  if (!bill.declarationAccepted) throw new Error('Confirm the bill declaration before submitting.');
  const files = bill.attachments ?? [];
  if (!files.some((file) => file.category === 'SIGNED_BILL') || !files.some((file) => file.category === 'MEASUREMENT')) throw new Error('Attach the signed RA bill and measurement proof.');
  if (files.length > 6 || new Set(files.map((file) => file.id)).size !== files.length || files.some((file) => !file.id || !file.name.trim() || !['SIGNED_BILL', 'MEASUREMENT', 'SUPPORTING'].includes(file.category) || !BILL_FILE_TYPES.includes(file.mimeType) || file.size <= 0 || file.size > MAX_BILL_FILE_BYTES)) throw new Error('Attach up to 6 PDF, JPEG or PNG files, each no larger than 5 MB.');
}
