import type { Project } from '../types';
import type { ControlRecord } from '../lib/projectControls';

/** Stable demo history; totals match seeded projects and user ledger records are preserved. */
function seedDemoFinance(projects: Project[], samples: Project[], records: ControlRecord[]): ControlRecord[] {
  let result = [...records];
  for (const [index, sample] of samples.entries()) {
    if (!projects.some(p => p.id === sample.id)) continue;
    const finance = records.filter(r => r.projectId === sample.id && ['RECEIPT', 'PAYMENT', 'REVERSAL'].includes(r.kind));
    const legacy = finance.filter(r => r.id === `DEMO-FINANCE-${sample.id}-${r.kind}` && r.category === 'Demo opening balance' && r.submittedBy === 'Demo data');
    // Upgrade only untouched opening balances; never rewrite edited or real transactions.
    if (finance.length && (finance.length !== legacy.length || legacy.some(r => r.status !== 'VERIFIED' || r.fields.transactionDate !== '2026-08-30' || Number(r.fields.amount) !== (r.kind === 'RECEIPT' ? sample.amountReleased : sample.amountSpent)))) continue;
    result = result.filter(r => !legacy.some(old => old.id === r.id));
    const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2025, 9 + i, 15)).toISOString().slice(0, 10))
      .filter(date => date >= sample.startDate);
    if (!months.length) continue;
    const weights = months.map((_, i) => 6 + ((i * 3 + index * 5) % 11));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    for (const kind of ['RECEIPT', 'PAYMENT'] as const) {
      const total = kind === 'RECEIPT' ? sample.amountReleased : sample.amountSpent;
      if (total <= 0) continue;
      let allocated = 0;
      months.forEach((date, i) => {
        const amount = i === months.length - 1 ? total - allocated : Math.floor(total * weights[i] / totalWeight);
        allocated += amount;
        result.push({
          id: `DEMO-FINANCE-V2-${sample.id}-${kind}-${date.slice(0, 7)}`, projectId: sample.id, kind,
          category: 'Demo monthly transaction', reference: `DEMO-${sample.id}-${kind}-${date.slice(0, 7)}`,
          fields: { amount: String(amount), transactionDate: date, accountingHead: 'Hospital construction', reason: 'Illustrative monthly transaction for the demonstration portfolio.' },
          attachments: [], status: 'VERIFIED', submittedBy: 'Demo data', reviewedBy: 'Demo data',
          submittedAt: `${date}T00:00:00Z`, reviewedAt: `${date}T00:00:00Z`,
        });
      });
    }
  }
  return result;
}

/** Repair only byte-for-byte-equivalent generated demo ledgers. User edits, additional
 * transactions and changed sanctions require review, never an automatic write-down. */
export function withDemoFinance(projects: Project[], samples: Project[], records: ControlRecord[]): ControlRecord[] {
  const previousSamples = samples.map(p => ({ ...p, amountReleased: Math.round(p.sanctionedBudget * (p.financialProgress / 100) * 1.05) }));
  const previous = seedDemoFinance(projects, previousSamples, []);
  const corrected = seedDemoFinance(projects, samples, []);
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
    return JSON.stringify(value) ?? 'undefined';
  };
  let result = [...records];
  for (const sample of samples) {
    const old = previousSamples.find(p=>p.id===sample.id)!;
    if (old.amountReleased <= sample.sanctionedBudget || projects.find(p=>p.id===sample.id)?.sanctionedBudget !== sample.sanctionedBudget) continue;
    const finance = records.filter(r=>r.projectId===sample.id && ['RECEIPT','PAYMENT','REVERSAL'].includes(r.kind));
    const expected = previous.filter(r=>r.projectId===sample.id);
    const matches = finance.length === expected.length && finance.every(r=>expected.some(e=>e.id===r.id && canonical(e)===canonical(r)));
    if (matches && finance.length) {
      const oldIds = new Set(finance.map(r=>r.id));
      result = result.filter(r=>!oldIds.has(r.id)).concat(corrected.filter(r=>r.projectId===sample.id));
    }
  }
  return seedDemoFinance(projects, samples, result);
}
