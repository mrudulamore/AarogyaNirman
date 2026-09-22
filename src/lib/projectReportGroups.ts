import { tabsForRole, type Project360Tab } from './projectTabAccess';
import type { Role } from '../types';

export const PROJECT_REPORT_GROUPS = [
  { label: 'Overview', sections: ['overview'] },
  { label: 'Governance', sections: ['governance'] },
  { label: 'Contracts & controls', sections: ['tender', 'controls'] },
  { label: 'Schedule & milestones', sections: ['timeline', 'milestones'] },
  { label: 'BOQ & materials', sections: ['boq', 'materials'] },
  { label: 'Progress & reporting', sections: ['progress', 'monthly'] },
  { label: 'Photos & field evidence', sections: ['field evidence', 'photos'] },
  { label: 'People & contractors', sections: ['team', 'contractor', 'workers'] },
  { label: 'Quality & inspections', sections: ['quality', 'inspections'] },
  { label: 'Safety & commissioning', sections: ['safety & commissioning'] },
  { label: 'Defects & risks', sections: ['defects', 'risks'] },
  { label: 'Finance', sections: ['finance'] },
  { label: 'Approvals', sections: ['approvals'] },
  { label: 'Documents & audit', sections: ['documents', 'audit'] },
  { label: 'Handover', sections: ['handover'] },
];

/** Five thumb-friendly mobile hubs layered over the complete Project 360 model. */
export const PROJECT_HUBS = [
  { key: 'plan', label: 'Plan', description: 'Scope, contract and schedule', sections: ['overview', 'governance', 'tender', 'controls', 'timeline'] },
  { key: 'build', label: 'Build', description: 'Progress, people and field evidence', sections: ['milestones', 'boq', 'materials', 'progress', 'monthly', 'field evidence', 'photos', 'team', 'contractor', 'workers'] },
  { key: 'quality', label: 'Quality', description: 'Inspections, safety and risks', sections: ['inspections', 'quality', 'safety & commissioning', 'defects', 'risks'] },
  { key: 'money', label: 'Money', description: 'Funds, bills and approvals', sections: ['finance', 'approvals'] },
  { key: 'closeout', label: 'Closeout', description: 'Documents, handover and audit', sections: ['documents', 'handover', 'audit'] },
] as const;

export type ProjectHubKey = typeof PROJECT_HUBS[number]['key'];

/** Filter every leaf through the existing role map before it reaches a hub. */
export function projectHubsForRole(role: Role | undefined) {
  const allowed = new Map(tabsForRole(role).map(tab => [tab.value, tab]));
  return PROJECT_HUBS.map(hub => ({
    ...hub,
    sections: hub.sections.flatMap(key => allowed.has(key) ? [allowed.get(key)!] : []),
  })).filter(hub => hub.sections.length > 0);
}

export function hubForTab(role: Role | undefined, tab: string) {
  return projectHubsForRole(role).find(hub => hub.sections.some(section => section.value === tab));
}

/** Filter leaves before grouping: combining reports must never grant sibling access. */
export function reportGroupsForRole(role: Role | undefined) {
  const allowed = new Map(tabsForRole(role).map(tab => [tab.value, tab]));
  return PROJECT_REPORT_GROUPS.map(group => ({
    label: group.label,
    sections: group.sections.flatMap(key => allowed.has(key) ? [allowed.get(key)!] : []),
  })).filter(group => group.sections.length > 0);
}

/** Keep legacy tab URLs and action parameters intact while presenting fewer destinations. */
export function reportNavigation(role: Role | undefined, selected: string): Project360Tab[] {
  return reportGroupsForRole(role).map(group => ({
    label: group.sections.length === 1 ? group.sections[0].label : group.label,
    value: group.sections.some(section => section.value === selected) ? selected : group.sections[0].value,
  }));
}
