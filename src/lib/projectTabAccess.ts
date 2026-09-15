import type { Role } from '../types';

/** Master Project 360 tab list (Part 24 information architecture). Each tab answers one
 * business question — see the comment beside each entry. `value` matches the TabsContent
 * value wired in ProjectDetail/index.tsx. */
export interface Project360Tab {
  label: string;
  value: string;
}

export const PROJECT_360_TABS: Project360Tab[] = [
  { label: 'Overview', value: 'overview' },              // What is happening?
  { label: 'Governance', value: 'governance' },           // What has been approved or changed?
  { label: 'Timeline', value: 'timeline' },                // Are we on time?
  { label: 'Tender / Contract', value: 'tender' },
  { label: 'BOQ', value: 'boq' },                          // What has physically been completed?
  { label: 'Materials', value: 'materials' },
  { label: 'Milestones', value: 'milestones' },
  { label: 'Progress', value: 'progress' },
  { label: 'Photos', value: 'photos' },
  { label: 'Field Evidence', value: 'field evidence' },    // What evidence proves progress?
  { label: 'Team', value: 'team' },                        // Who is accountable?
  { label: 'Contractor', value: 'contractor' },
  { label: 'Workers', value: 'workers' },
  { label: 'Quality', value: 'quality' },                  // Is work acceptable?
  { label: 'Inspections', value: 'inspections' },          // What has been inspected / needs inspection?
  { label: 'Safety & Commissioning', value: 'safety & commissioning' }, // Is the site/system safe and ready?
  { label: 'Defects', value: 'defects' },                  // What is wrong and who must fix it?
  { label: 'Risks', value: 'risks' },
  { label: 'Finance', value: 'finance' },                  // How much has been certified/paid?
  { label: 'Approvals', value: 'approvals' },               // What decisions are waiting?
  { label: 'Documents', value: 'documents' },               // What evidence/documentation exists?
  { label: 'Handover', value: 'handover' },
  { label: 'Audit', value: 'audit' },                       // Who changed/approved what?
];

/** Which tabs each role sees on Project 360. Executive/oversight roles get a governance +
 * exception view; field roles get the full operational toolkit. Centralized here rather than
 * hidden per-button so the rule is defined once and reused everywhere.
 *
 * Ministry/Secretary is the fully read-only exception-and-evidence tier: no separate
 * Governance/Quality/Defects/Finance/Audit tabs — that content is combined into one executive
 * Overview instead (see MinistryOverview), and only Timeline/Tender & Contract/Field Evidence/
 * Team/Inspections/Safety & Commissioning/Approvals/Documents/Handover remain as their own tabs. */
export const ROLE_PROJECT_360_TABS: Record<Role, string[]> = {
  SUPERADMIN: ['overview', 'governance', 'timeline', 'tender', 'boq', 'materials', 'milestones', 'progress', 'photos', 'field evidence', 'team', 'contractor', 'workers', 'quality', 'inspections', 'safety & commissioning', 'defects', 'risks', 'finance', 'approvals', 'documents', 'handover', 'audit'],
  IT_ADMIN: ['overview', 'documents', 'audit'],
  MINISTER: ['overview', 'timeline', 'tender', 'boq', 'milestones', 'field evidence', 'team', 'inspections', 'safety & commissioning', 'finance', 'approvals', 'documents', 'handover'],
  COMMISSIONER: ['overview', 'governance', 'timeline', 'tender', 'milestones', 'field evidence', 'team', 'quality', 'inspections', 'safety & commissioning', 'defects', 'finance', 'approvals', 'documents', 'handover', 'audit'],
  REGIONAL_DIRECTOR: ['overview', 'governance', 'timeline', 'milestones', 'field evidence', 'team', 'quality', 'inspections', 'defects', 'finance', 'approvals', 'documents', 'handover'],
  CIVIL_SURGEON: ['overview', 'governance', 'timeline', 'milestones', 'field evidence', 'team', 'quality', 'inspections', 'defects', 'finance', 'approvals', 'documents', 'handover'],
  EXECUTIVE_ENGINEER: ['overview', 'governance', 'timeline', 'tender', 'boq', 'materials', 'milestones', 'progress', 'photos', 'field evidence', 'team', 'contractor', 'workers', 'quality', 'inspections', 'safety & commissioning', 'defects', 'risks', 'finance', 'approvals', 'documents', 'handover'],
  PROJECT_MANAGER: ['overview', 'governance', 'timeline', 'tender', 'boq', 'milestones', 'progress', 'photos', 'field evidence', 'team', 'contractor', 'workers', 'quality', 'inspections', 'safety & commissioning', 'defects', 'risks', 'finance', 'approvals', 'documents', 'handover'],
  DEPUTY_ENGINEER: ['overview', 'boq', 'materials', 'milestones', 'progress', 'photos', 'field evidence', 'workers', 'quality', 'inspections', 'defects', 'documents'],
  CONTRACTOR: ['overview', 'milestones', 'progress', 'photos', 'field evidence', 'team', 'inspections', 'safety & commissioning', 'defects', 'finance', 'documents'],
  MEDICAL_OFFICER: ['overview', 'timeline', 'progress', 'field evidence', 'inspections', 'safety & commissioning', 'governance', 'documents', 'handover'],
  VIGILANCE_AUDIT: ['overview', 'governance', 'tender', 'finance', 'quality', 'defects', 'approvals', 'documents', 'handover', 'audit'],
};

export function tabsForRole(role: Role | undefined): Project360Tab[] {
  if (!role) return PROJECT_360_TABS;
  const allowed = new Set(ROLE_PROJECT_360_TABS[role]);
  return PROJECT_360_TABS.filter((t) => allowed.has(t.value));
}
