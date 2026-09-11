import { useMemo } from 'react';
import type { Project, User, Contractor } from '../types';
import { useStore } from '../store/useStore';

/**
 * Role-based data scoping — mirrors the jurisdiction hierarchy of the Government of
 * Maharashtra Public Health / PWD infrastructure programme:
 *
 *   State
 *     Minister / Secretary          statewide, read-oriented oversight
 *     Commissioner / Director       statewide, full access
 *   Division
 *     Regional Deputy Director      one division (group of districts)
 *   District
 *     District Health Officer /
 *     Civil Surgeon                 one district
 *   Circle
 *     Executive Engineer            their assigned projects (PWD Circle)
 *   Site
 *     Junior/Deputy Engineer        their assigned projects (site level, field)
 *   Cross-cutting:
 *     Vigilance & Audit Officer     statewide, independent oversight & audit trail
 *     Contractor                    only projects awarded to their firm
 *     Medical Officer / Facility    operational (handed-over) hospitals only
 *
 * This is intentionally centralized so every list/dashboard page filters data the
 * same way, instead of each page re-implementing its own notion of "my projects."
 */

export interface ProjectScope {
  /** Projects this user is allowed to see. */
  projects: Project[];
  /** Same set, as an id lookup for filtering related records (bills, defects, etc.) */
  projectIds: Set<string>;
  /** True for roles that see every project statewide (Ministry, State Admin, Finance). */
  isStatewide: boolean;
  /** Short human-readable description of the current scope, e.g. "Pune District" or "4 assigned projects". */
  scopeLabel: string;
}

const EMPTY_SCOPE: ProjectScope = { projects: [], projectIds: new Set(), isStatewide: false, scopeLabel: '—' };

export function computeProjectScope(user: User | null, allProjects: Project[], contractors: Contractor[]): ProjectScope {
  if (!user) return EMPTY_SCOPE;

  const statewide = (label: string): ProjectScope => ({
    projects: allProjects,
    projectIds: new Set(allProjects.map((p) => p.id)),
    isStatewide: true,
    scopeLabel: label,
  });

  const scoped = (projects: Project[], label: string): ProjectScope => ({
    projects,
    projectIds: new Set(projects.map((p) => p.id)),
    isStatewide: false,
    scopeLabel: label,
  });

  switch (user.role) {
    case 'MINISTER':
      return statewide('Statewide (read-only)');

    case 'COMMISSIONER':
      return statewide('Statewide — full access');

    case 'VIGILANCE_AUDIT':
      // Independent oversight function — spans every division/district by mandate.
      return statewide('Statewide vigilance & audit oversight');

    case 'REGIONAL_DIRECTOR': {
      const inDivision = allProjects.filter((p) => p.division === user.division);
      return scoped(inDivision, user.division ? `${user.division}` : 'No division assigned');
    }

    case 'CIVIL_SURGEON': {
      const inDistrict = allProjects.filter((p) => p.district === user.district);
      return scoped(inDistrict, user.district ? `${user.district} District` : 'No district assigned');
    }

    case 'EXECUTIVE_ENGINEER': {
      const assigned = allProjects.filter((p) => p.executiveEngineerId === user.id);
      return scoped(assigned, `${assigned.length} assigned project${assigned.length === 1 ? '' : 's'} (PWD Circle)`);
    }

    case 'DEPUTY_ENGINEER': {
      const assigned = allProjects.filter((p) => p.siteEngineerId === user.id);
      return scoped(assigned, `${assigned.length} assigned project${assigned.length === 1 ? '' : 's'} (Site)`);
    }

    case 'CONTRACTOR': {
      // There's no distinct Contractor account in the user roster (the login synthesizes one),
      // so the demo represents the flagship project's contracting firm — this keeps the
      // Contractor login anchored to the same guided-demo project (defect / RA bill flow)
      // as every other role, instead of an arbitrary firm.
      const anchorContractorId = allProjects[0]?.contractorId;
      const firm = contractors.find((c) => c.id === anchorContractorId);
      const assigned = allProjects.filter((p) => p.contractorId === anchorContractorId);
      return scoped(assigned, firm ? `${firm.company} — ${assigned.length} contract${assigned.length === 1 ? '' : 's'}` : 'No active contracts');
    }

    case 'MEDICAL_OFFICER': {
      const operational = allProjects.filter((p) => p.status === 'COMPLETED');
      return scoped(operational, 'Operational hospitals');
    }

    default:
      return statewide('Statewide');
  }
}

/** Convenience hook: pulls projects/contractors from the store and returns the scope for the signed-in user, memoized. */
export function useProjectScope(): ProjectScope {
  const currentUser = useStore((s) => s.currentUser);
  const projects = useStore((s) => s.projects);
  const contractors = useStore((s) => s.contractors);
  return useMemo(() => computeProjectScope(currentUser, projects, contractors), [currentUser, projects, contractors]);
}
