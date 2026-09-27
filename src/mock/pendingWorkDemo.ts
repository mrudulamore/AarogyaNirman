import type { ApprovalRequest, Contractor, Project, Role, User } from '../types';
import type { ControlRecord } from '../lib/projectControls';
import { computeProjectScope } from '../lib/projectScope';
import { todayDate } from '../lib/fundDisbursal';

type DemoState = {
  users: User[]; projects: Project[]; contractors: Contractor[];
  approvals: ApprovalRequest[]; controlRecords: ControlRecord[];
};

const approvalRoles = new Set<Role>(['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR', 'COMMISSIONER']);
const shortDocumentNames: Record<string, string> = {
  'Budget availability': 'Budget Review',
  'Administrative sanction validity': 'Sanction Review',
  'Medical equipment funding commitment': 'Equipment Funding',
  'District hospital expansion funding': 'Hospital Expansion',
  'Emergency care programme documentation': 'Emergency Care',
  'Maternal and child health programme funding': 'Maternal & Child Care',
  'Medical gas infrastructure allocation': 'Medical Gas Funding',
  'Hospital commissioning readiness documentation': 'Commissioning Review',
  'Rural hospital upgrade programme documentation': 'Rural Hospital Upgrade',
  'Interdepartmental land transfer documentation': 'Land Transfer',
  'Annual hospital infrastructure funding plan': 'Annual Funding Plan',
};
const ministryReviews = [
  { category: 'Budget availability', days: -3 },
  { category: 'Budget availability', days: 7 },
  { category: 'Administrative sanction validity', days: -10 },
  { category: 'Medical equipment funding commitment', days: -7 },
  { category: 'District hospital expansion funding', days: -2 },
  { category: 'Emergency care programme documentation', days: 0 },
  { category: 'Maternal and child health programme funding', days: 2 },
  { category: 'Medical gas infrastructure allocation', days: 4 },
  { category: 'Hospital commissioning readiness documentation', days: 10 },
  { category: 'Rural hospital upgrade programme documentation', days: 14 },
  { category: 'Interdepartmental land transfer documentation', days: 21 },
  { category: 'Annual hospital infrastructure funding plan', days: 28 },
];
const renewalCategories: Partial<Record<Role, string>> = {
  MINISTER: 'Budget availability',
  CHIEF_ENGINEER: 'Technical sanction',
  SUPERINTENDING_ENGINEER: 'Approved drawings / estimate',
  MEDICAL_OFFICER: 'Health authority acceptance',
  VIGILANCE_AUDIT: 'Conflict declarations',
  IT_ADMIN: 'Document register access review',
  SITE_SUPERVISOR: 'Site safety briefing',
};

/** Add stable examples to fresh and saved demos without resetting completed work. */
export function withPendingWorkDemo<T extends DemoState>(state: T, today = todayDate()): T {
  const approvals = [...state.approvals];
  const controlRecords = [...state.controlRecords];
  const minister = state.users.find(user => user.role === 'MINISTER');
  const date = (offset: number) => new Date(Date.parse(today) + offset * 86400000).toISOString().slice(0, 10);
  for (const user of state.users) {
    if (user.role === 'MINISTER' && user.id !== minister?.id) continue;
    if (!approvalRoles.has(user.role) && !renewalCategories[user.role]) continue;
    const projects = computeProjectScope(user, state.projects, state.contractors).projects.slice(0, user.role === 'MINISTER' ? ministryReviews.length : 2);
    for (const [index, project] of projects.entries()) {
      const id = `DEMO-PENDING-${user.role}-${project.id}-${index}`;
      if (approvalRoles.has(user.role)) {
        if (approvals.some(row => row.id === id)) continue;
        approvals.push({
          id, projectId: project.id, type: index === 0 ? 'DESIGN_CHANGE' : 'EXTENSION_OF_TIME',
          submittedBy: 'Project team', submittedDate: date(index === 0 ? -12 : -4),
          documents: [], comments: index === 0
            ? 'Review the revised outpatient department layout for accessibility.'
            : 'Review a 14-day extension for utility relocation before foundation work.',
          status: 'PENDING', chain: [user.role as ApprovalRequest['chain'][number]],
          currentStepIndex: 0, history: [],
        });
      } else {
        if (controlRecords.some(row => row.id === id)) continue;
        const ministryReview = user.role === 'MINISTER' ? ministryReviews[index] : undefined;
        controlRecords.push({
          id, projectId: project.id, kind: 'DOCUMENT',
          category: ministryReview?.category ?? renewalCategories[user.role]!, reference: `REVIEW-${user.role}-${index + 1}`,
          fields: { responsibleRole: user.role, expiryDate: date(ministryReview?.days ?? (index === 0 ? -3 : 7)),
            documentType: 'Other', reason: 'Review and renew the supporting documentation.' },
          attachments: [], status: 'VERIFIED', submittedBy: 'Project team', reviewedBy: 'Review team',
          submittedAt: `${date(-30)}T00:00:00Z`, reviewedAt: `${date(-29)}T00:00:00Z`,
        });
      }
    }
  }
  return { ...state,
    approvals: approvals.map(row => row.id.startsWith('DEMO-PENDING-') ? { ...row,
      submittedBy: row.submittedBy === 'Demo project team' ? 'Project team' : row.submittedBy,
      comments: row.comments.replace(/^Demo: /, ''),
    } : row),
    controlRecords: controlRecords.map(row => {
      if (!row.id.startsWith('DEMO-PENDING-')) return row;
      const projectName = state.projects.find(p => p.id === row.projectId)?.name ?? 'Hospital project';
      const reference = /^(DEMO|REVIEW)-/.test(row.reference) || row.reference === `${row.category} — ${projectName}`
        ? shortDocumentNames[row.category] ?? row.category : row.reference;
      return { ...row, reference,
        submittedBy: row.submittedBy === 'Demo data' ? 'Project team' : row.submittedBy,
        reviewedBy: row.reviewedBy === 'Demo data' ? 'Review team' : row.reviewedBy,
        fields: { ...row.fields,
          ...(row.fields.responsibleRole === 'MINISTER' && minister ? { responsibleUserId: minister.id } : {}),
          reason: row.fields.reason?.replace(/^Illustrative demo record: review/, 'Review') },
        attachments: row.attachments.length ? row.attachments.map(file => {
          if (file.id !== `sample:${row.id}` || !file.sample) return file;
          return { ...file, name: `${reference.replace(/[<>:"/\\|?*]/g, '-')}.pdf`,
            sample: { ...file.sample, fields: file.sample.fields.map(([label, value]) =>
              [label, label === 'Reference' ? reference : value] as [string, string]) },
          };
        }) : [{
          id: `sample:${row.id}`, category: 'SUPPORTING' as const, name: `${reference.replace(/[<>:"/\\|?*]/g, '-')}.pdf`,
          mimeType: 'application/pdf', size: 0,
          sample: { title: row.category, fields: [
            ['Reference', reference], ['Project', state.projects.find(p => p.id === row.projectId)?.name ?? row.projectId],
            ['Review subject', row.category], ['Due date', row.fields.expiryDate],
            ['Review notes', 'Review the supporting documentation and record the required follow-up.'],
          ] as [string, string][] },
        }],
      };
    }),
  };
}
