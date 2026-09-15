import type { Role, Scheme, FacilityType, DefectStatus } from '../types';

// Scheme (funding/administrative source) and Facility Type (kind of health facility) are
// deliberately separate classification axes — never conflate them in the UI.
export const SCHEMES: Scheme[] = ['NHM', 'DPDC', 'State Plan', 'Central Scheme', 'District Planning', 'Special Grant', 'Other Approved Scheme'];
export const FACILITY_TYPES: FacilityType[] = ['Sub Centre', 'PHC', 'UPHC', 'CHC', 'Rural Hospital', 'Sub-District Hospital', 'District / Civil Hospital', 'Women Hospital', 'Specialty Hospital', 'Medical College Hospital', 'Other Government Health Facility'];

// Contractor-facing defect workflow terminology (Part 11) — the underlying DefectStatus enum
// stays unchanged so approval/audit logic isn't disturbed; only the displayed label changes.
export const DEFECT_STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN: 'New',
  ASSIGNED: 'Acknowledged',
  IN_PROGRESS: 'In Rectification',
  FIXED: 'Evidence Submitted',
  REINSPECTION: 'Reinspection Pending',
  CLOSED: 'Closed',
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'Super Administrator',
  MINISTER: 'Minister / Secretary (Public Health)',
  COMMISSIONER: 'Commissioner / Director (Health Services)',
  REGIONAL_DIRECTOR: 'Regional Deputy Director',
  CIVIL_SURGEON: 'District Health Officer / Civil Surgeon',
  EXECUTIVE_ENGINEER: 'Executive Engineer',
  PROJECT_MANAGER: 'Project Manager (PMU/PMC)',
  DEPUTY_ENGINEER: 'Junior Engineer / Deputy Engineer',
  CONTRACTOR: 'Contractor',
  MEDICAL_OFFICER: 'Medical Officer / Facility In-Charge',
  VIGILANCE_AUDIT: 'Vigilance & Audit Officer',
  IT_ADMIN: 'IT / System Administrator',
};

export const ROLE_DEPARTMENTS: Record<Role, string> = {
  SUPERADMIN: 'System Administration Cell, GoM',
  MINISTER: 'Ministry of Public Health, Govt. of Maharashtra',
  COMMISSIONER: 'Directorate of Health Services, GoM',
  REGIONAL_DIRECTOR: 'Regional Directorate of Health Services',
  CIVIL_SURGEON: 'District Health Office / Civil Surgeon Office',
  EXECUTIVE_ENGINEER: 'Public Works Department (Health Wing)',
  PROJECT_MANAGER: 'Project Management Unit, GoM',
  DEPUTY_ENGINEER: 'Public Works Department (Health Wing)',
  CONTRACTOR: 'Empanelled Contracting Agency',
  MEDICAL_OFFICER: 'Hospital Administration',
  VIGILANCE_AUDIT: 'Vigilance & Audit Cell, GoM',
  IT_ADMIN: 'IT & Systems Cell, GoM',
};

interface DivisionInfo {
  division: string;
  districts: { district: string; talukas: string[] }[];
}

export const MAHARASHTRA_HIERARCHY: DivisionInfo[] = [
  {
    division: 'Pune Division',
    districts: [
      { district: 'Pune', talukas: ['Haveli', 'Mulshi', 'Baramati', 'Shirur'] },
      { district: 'Satara', talukas: ['Karad', 'Phaltan', 'Wai'] },
      { district: 'Kolhapur', talukas: ['Karvir', 'Panhala', 'Shirol'] },
      { district: 'Solapur', talukas: ['North Solapur', 'Pandharpur', 'Barshi'] },
    ],
  },
  {
    division: 'Nashik Division',
    districts: [
      { district: 'Nashik', talukas: ['Nashik', 'Niphad', 'Sinnar'] },
      { district: 'Nandurbar', talukas: ['Nandurbar', 'Shahada', 'Taloda'] },
      { district: 'Dhule', talukas: ['Dhule', 'Shirpur'] },
      { district: 'Ahmednagar', talukas: ['Rahuri', 'Shrirampur'] },
    ],
  },
  {
    division: 'Nagpur Division',
    districts: [
      { district: 'Nagpur', talukas: ['Nagpur Urban', 'Kamptee', 'Hingna'] },
      { district: 'Gadchiroli', talukas: ['Gadchiroli', 'Aheri', 'Etapalli'] },
      { district: 'Chandrapur', talukas: ['Chandrapur', 'Warora'] },
      { district: 'Wardha', talukas: ['Wardha', 'Hinganghat'] },
    ],
  },
  {
    division: 'Chhatrapati Sambhajinagar Division',
    districts: [
      { district: 'Chhatrapati Sambhajinagar', talukas: ['Paithan', 'Gangapur'] },
      { district: 'Jalna', talukas: ['Jalna', 'Ambad'] },
      { district: 'Beed', talukas: ['Beed', 'Georai'] },
    ],
  },
  {
    division: 'Amravati Division',
    districts: [
      { district: 'Amravati', talukas: ['Amravati', 'Achalpur'] },
      { district: 'Akola', talukas: ['Akola', 'Balapur'] },
      { district: 'Yavatmal', talukas: ['Yavatmal', 'Pusad'] },
    ],
  },
  {
    division: 'Konkan Division',
    districts: [
      { district: 'Thane', talukas: ['Thane', 'Kalyan', 'Bhiwandi'] },
      { district: 'Raigad', talukas: ['Alibag', 'Panvel'] },
      { district: 'Ratnagiri', talukas: ['Ratnagiri', 'Chiplun'] },
    ],
  },
];

export const ALL_DISTRICTS = MAHARASHTRA_HIERARCHY.flatMap((d) => d.districts.map((x) => x.district));

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ON_TRACK: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  AT_RISK: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  DELAYED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  PASS: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  READY: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  FAIL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  OPEN: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  NOT_READY: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  BLOCKED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  CONDITIONAL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  ASSIGNED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  SUBMITTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  ACTIVE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  SCHEDULED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  LOW: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  NOT_INSPECTED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  SENT_BACK: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  CLARIFICATION_REQUESTED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  ACCEPTED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  UNDER_TESTING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  FIXED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  REINSPECTION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  SITE_VERIFIED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  QUALITY_VERIFIED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  MITIGATED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  // Milestone certification workflow
  NOT_STARTED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  SUBMITTED_FOR_VERIFICATION: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  INSPECTION_PENDING: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  CORRECTION_REQUIRED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  VERIFIED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  CERTIFIED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  BILL_ELIGIBLE: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  // Governance registers
  RESOLVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  DECIDED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  RECOMMENDED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  // Inspection appointments
  REQUESTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  RESCHEDULED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  NO_SHOW: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  // Contractor account status
  ON_WATCH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  SUSPENDED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  // Tender lifecycle
  PENDING_APPROVAL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  PUBLISHED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  BID_SUBMISSION: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  TECHNICAL_EVALUATION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  FINANCIAL_EVALUATION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  AWARD_APPROVAL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  LOA_ISSUED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  AGREEMENT_SIGNED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  WORK_ORDER_ISSUED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

// Document lifecycle classification (§5) — groups the existing DocumentType enum into the
// six phases a real government construction file moves through. A given DocumentType always
// maps to exactly one phase so grouping is unambiguous.
export const DOCUMENT_LIFECYCLE_PHASES: { phase: string; types: string[] }[] = [
  { phase: 'Pre-Tender', types: ['DPR', 'Administrative Sanction', 'Technical Sanction', 'BOQ'] },
  { phase: 'Tender', types: ['Tender'] },
  { phase: 'Contract', types: ['Work Order', 'Agreement'] },
  { phase: 'Execution', types: ['Drawings', 'Inspection Report', 'Test Report'] },
  { phase: 'Finance', types: ['Bills', 'Approvals'] },
  { phase: 'Completion', types: ['Completion Certificate', 'Handover Documents'] },
];

export function documentLifecyclePhase(type: string): string {
  return DOCUMENT_LIFECYCLE_PHASES.find((p) => p.types.includes(type))?.phase ?? 'Other';
}

export const TENDER_STAGES = [
  'DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'BID_SUBMISSION', 'TECHNICAL_EVALUATION',
  'FINANCIAL_EVALUATION', 'AWARD_APPROVAL', 'LOA_ISSUED', 'AGREEMENT_SIGNED', 'WORK_ORDER_ISSUED',
] as const;

export const PROJECT_STAGES = [
  'ADMIN_SANCTION', 'TECHNICAL_SANCTION', 'DESIGN', 'TENDER', 'WORK_ORDER',
  'CONSTRUCTION', 'QUALITY_INSPECTION', 'BILLING', 'APPROVAL', 'COMPLETION',
  'COMMISSIONING', 'HANDOVER', 'OPERATIONAL',
] as const;

// Configurable per contract in a real deployment — these are the prototype's default payment slabs,
// weightage summing to 100% of contract value (see §6 of the governance spec).
export const MILESTONE_WEIGHTAGE: { name: string; weightagePct: number }[] = [
  { name: 'Administrative Sanction', weightagePct: 2 },
  { name: 'Technical Sanction', weightagePct: 2 },
  { name: 'Tender', weightagePct: 3 },
  { name: 'Work Order', weightagePct: 3 },
  { name: 'Foundation', weightagePct: 10 },
  { name: 'Structure', weightagePct: 25 },
  { name: 'Roofing', weightagePct: 10 },
  { name: 'MEP', weightagePct: 15 },
  { name: 'Finishing', weightagePct: 15 },
  { name: 'Medical Infrastructure', weightagePct: 10 },
  { name: 'Inspection', weightagePct: 2 },
  { name: 'Commissioning', weightagePct: 2 },
  { name: 'Handover', weightagePct: 1 },
];

export const INSPECTION_CATEGORIES = [
  'STRUCTURAL', 'CIVIL', 'ELECTRICAL', 'PLUMBING', 'FIRE_SAFETY', 'HVAC',
  'WATERPROOFING', 'MEDICAL_GAS', 'LIFT', 'ACCESSIBILITY', 'FINISHING', 'SITE_SAFETY',
] as const;

export const COMMISSIONING_ITEMS = [
  'Building Complete', 'Electrical Connection', 'Water Connection', 'Fire Safety',
  'Lift', 'Medical Gas', 'HVAC', 'Biomedical Waste', 'IT Network',
  'Furniture', 'Medical Equipment', 'Staff Readiness', 'Security', 'Accessibility',
] as const;

export const HANDOVER_STEPS = [
  'Construction Complete', 'Final Quality Inspection', 'Defects Closed',
  'Documents Verified', 'Commissioning Completed', 'Final Approval',
  'Handover', 'Hospital Operational',
];

export const APPROVAL_CHAIN: Record<string, string[]> = {
  RA_BILL: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'COMMISSIONER'],
  DESIGN_CHANGE: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'CIVIL_SURGEON'],
  MILESTONE_COMPLETION: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'],
  MATERIAL_APPROVAL: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'],
  EXTENSION_OF_TIME: ['EXECUTIVE_ENGINEER', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR'],
  REVISED_ESTIMATE: ['EXECUTIVE_ENGINEER', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR', 'COMMISSIONER'],
};

export const PHYSICAL_VS_FINANCIAL_THRESHOLD = 12; // percentage points
