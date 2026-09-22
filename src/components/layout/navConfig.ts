import type { Role } from '../../types';
import {
  LayoutDashboard, Building2, HardHat, Wallet, ShieldCheck, AlertTriangle, ClipboardCheck,
  FileText, BarChart3, Bell, History, Search, Users, Radar, Smartphone, Gavel, KeyRound, GanttChart,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

export const NAV_ITEMS: Record<string, NavItem> = {
  dashboard: { label: 'Command Center', path: '/dashboard', icon: LayoutDashboard },
  projects: { label: 'Projects', path: '/projects', icon: Building2 },
  tenders: { label: 'Tenders', path: '/tenders', icon: Gavel },
  contractors: { label: 'Contractors', path: '/contractors', icon: HardHat },
  workers: { label: 'Workforce', path: '/workers', icon: Users },
  staff: { label: 'Officers & Staff', path: '/staff', icon: Users },
  finance: { label: 'Finance & Bills', path: '/finance', icon: Wallet },
  quality: { label: 'Quality & Inspections', path: '/quality', icon: ShieldCheck },
  defects: { label: 'Defects', path: '/defects', icon: AlertTriangle },
  approvals: { label: 'Approvals', path: '/approvals', icon: ClipboardCheck },
  documents: { label: 'Documents', path: '/documents', icon: FileText },
  reports: { label: 'Reports', path: '/reports', icon: BarChart3 },
  observer: { label: 'Observer Desk', path: '/observer', icon: Radar },
  notifications: { label: 'Notifications', path: '/notifications', icon: Bell },
  audit: { label: 'Audit Log', path: '/audit', icon: History },
  search: { label: 'Global Search', path: '/search', icon: Search },
  field: { label: 'Field App', path: '/field', icon: Smartphone },
  access: { label: 'Manage Access', path: '/access', icon: KeyRound },
  portfolioTimeline: { label: 'Portfolio Timeline', path: '/portfolio-timeline', icon: GanttChart },
};

export const ROLE_NAV: Record<Role, string[]> = {
  WORKFORCE: ['dashboard'],
  // Superadmin — full statewide visibility across every module, plus the exclusive
  // Access Management screen where role-to-feature permissions are granted/revoked.
  SUPERADMIN: ['dashboard', 'projects', 'tenders', 'contractors', 'workers', 'staff', 'finance', 'quality', 'defects', 'approvals', 'documents', 'reports', 'observer', 'notifications', 'audit', 'search', 'field', 'access'],
  // Minister/Secretary — top-level statewide oversight only. Deliberately minimal:
  // no BOQ/materials/attendance/staff-roster screens — command-center summary,
  // statewide financial and contractor-performance visibility, tenders, reports, alerts, search.
  MINISTER: ['dashboard', 'projects', 'tenders', 'finance', 'contractors', 'reports', 'notifications', 'search'],
  // Workforce (day-to-day worker roster / attendance) is intentionally Deputy-Engineer-only —
  // it's field-level operational data. Other roles still see aggregate workforce counts via
  // the Dashboard "Workforce on Site" widget without the granular per-worker list.
  COMMISSIONER: ['dashboard', 'projects', 'tenders', 'contractors', 'staff', 'finance', 'quality', 'defects', 'approvals', 'documents', 'reports', 'notifications', 'audit', 'search'],
  REGIONAL_DIRECTOR: ['dashboard', 'projects', 'tenders', 'contractors', 'staff', 'finance', 'quality', 'defects', 'approvals', 'documents', 'reports', 'notifications', 'audit', 'search'],
  CIVIL_SURGEON: ['dashboard', 'projects', 'contractors', 'staff', 'finance', 'quality', 'defects', 'approvals', 'documents', 'reports', 'notifications', 'audit', 'search'],
  EXECUTIVE_ENGINEER: ['dashboard', 'projects', 'contractors', 'finance', 'quality', 'defects', 'approvals', 'documents', 'reports', 'notifications', 'audit', 'search'],
  // Project Manager (PMU/PMC) — day-to-day cross-functional coordinator for their assigned
  // portfolio: schedule, budget, contractor/workforce coordination, risk & governance registers,
  // and field visibility, without the statewide/jurisdictional oversight senior roles carry.
  PROJECT_MANAGER: ['dashboard', 'projects', 'tenders', 'contractors', 'workers', 'finance', 'quality', 'defects', 'approvals', 'documents', 'reports', 'notifications', 'search', 'field', 'portfolioTimeline'],
  DEPUTY_ENGINEER: ['dashboard', 'projects', 'field', 'workers', 'quality', 'defects', 'documents', 'notifications', 'search'],
  CONTRACTOR: ['dashboard', 'projects', 'field', 'workers', 'finance', 'defects', 'documents', 'notifications', 'search'],
  MEDICAL_OFFICER: ['dashboard', 'projects', 'documents', 'reports', 'notifications', 'search'],
  VIGILANCE_AUDIT: ['dashboard', 'projects', 'observer', 'defects', 'approvals', 'audit', 'notifications', 'search'],
  // IT/System Admin — technical support & system health only; deliberately excluded from
  // 'access' (permission grants stay a Superadmin-only capability).
  IT_ADMIN: ['dashboard', 'documents', 'audit', 'notifications', 'search'],
};

export type MobileDestination = 'today' | 'projects' | 'capture' | 'inspect' | 'bills' | 'approvals' | 'quality' | 'overview' | 'reports' | 'observer' | 'audit' | 'access' | 'attendance' | 'profile' | 'status' | 'documents' | 'finance' | 'more';

/** The five primary destinations specified for each role in the mobile plan. */
export const MOBILE_TABS: Record<Role, MobileDestination[]> = {
  DEPUTY_ENGINEER: ['today', 'projects', 'capture', 'inspect', 'more'],
  CONTRACTOR: ['today', 'projects', 'capture', 'bills', 'more'],
  WORKFORCE: ['attendance', 'profile'],
  PROJECT_MANAGER: ['today', 'projects', 'capture', 'approvals', 'more'],
  EXECUTIVE_ENGINEER: ['today', 'projects', 'approvals', 'quality', 'more'],
  COMMISSIONER: ['overview', 'projects', 'approvals', 'reports', 'more'],
  REGIONAL_DIRECTOR: ['overview', 'projects', 'approvals', 'reports', 'more'],
  CIVIL_SURGEON: ['overview', 'projects', 'approvals', 'reports', 'more'],
  MINISTER: ['overview', 'projects', 'finance', 'reports', 'more'],
  VIGILANCE_AUDIT: ['today', 'projects', 'observer', 'audit', 'more'],
  MEDICAL_OFFICER: ['today', 'projects', 'documents', 'reports', 'more'],
  IT_ADMIN: ['status', 'audit', 'documents', 'more'],
  SUPERADMIN: ['overview', 'projects', 'approvals', 'access', 'more'],
};
