import type { Role } from '../types';

/** Display order shared by role selection and demo login. */
export const AUTH_ROLE_GROUPS: { key: string; roles: Role[] }[] = [
  { key: 'leadership', roles: ['MINISTER', 'COMMISSIONER'] },
  { key: 'engineering', roles: ['CHIEF_ENGINEER', 'SUPERINTENDING_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'DEPUTY_ENGINEER'] },
  { key: 'health', roles: ['REGIONAL_DIRECTOR', 'CIVIL_SURGEON', 'MEDICAL_OFFICER'] },
  { key: 'execution', roles: ['CONTRACTOR', 'SITE_SUPERVISOR', 'WORKFORCE'] },
  { key: 'administration', roles: ['VIGILANCE_AUDIT', 'SUPERADMIN', 'IT_ADMIN'] },
];
