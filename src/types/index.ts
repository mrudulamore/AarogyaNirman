// Core domain types for the Maharashtra Hospital Construction Monitoring System

// Jurisdiction hierarchy: State -> Division -> District -> Circle -> Hospital/Project -> Site.
// Each role's data scope maps onto one level of this hierarchy (see lib/scope.ts).
export type Role =
  | 'CHIEF_ENGINEER'
  | 'SUPERINTENDING_ENGINEER'
  | 'SITE_SUPERVISOR'
  | 'WORKFORCE'
  | 'SUPERADMIN'          // Super Administrator — State, full statewide access + manages role/access permissions
  | 'MINISTER'            // Minister / Secretary (Public Health) — State, read-oriented oversight
  | 'COMMISSIONER'        // Commissioner / Director (Health Services) — State, full access
  | 'REGIONAL_DIRECTOR'   // Regional Deputy Director — Division
  | 'CIVIL_SURGEON'       // District Health Officer / Civil Surgeon — District
  | 'EXECUTIVE_ENGINEER'  // Executive Engineer — Circle (cluster of projects)
  | 'PROJECT_MANAGER'     // Project Manager (PMU/PMC) — their assigned project portfolio, cross-zone
  | 'DEPUTY_ENGINEER'     // Junior Engineer / Deputy Engineer — Site
  | 'CONTRACTOR'          // Contractor — own awarded projects only
  | 'MEDICAL_OFFICER'     // Medical Officer / Facility In-Charge — operational hospital
  | 'VIGILANCE_AUDIT'     // Vigilance & Audit Officer — State, cross-cutting oversight
  | 'IT_ADMIN';           // IT / System Administrator — State, system configuration & support (no access-grant rights)

// Funding/administrative scheme and facility type are separate classification axes —
// never conflate them (see lib/constants.ts SCHEMES / FACILITY_TYPES).
export type Scheme = 'NHM' | 'DPDC' | 'State Plan' | 'Central Scheme' | 'District Planning' | 'Special Grant' | 'Other Approved Scheme';
export type FacilityType = 'Sub Centre' | 'PHC' | 'UPHC' | 'CHC' | 'Rural Hospital' | 'Sub-District Hospital' | 'District / Civil Hospital' | 'Women Hospital' | 'Specialty Hospital' | 'Medical College Hospital' | 'Other Government Health Facility';

export interface User {
  customRoleId?: string;
  kycApplication?: { submittedAt: string; documentType: 'EMPLOYEE_ID' | 'CONTRACTOR_REGISTRATION' | 'GOVERNMENT_ID'; declaration: true; name: string; email: string; phone: string };
  identityReview?: { status: 'PENDING' | 'VERIFIED' | 'REJECTED'; method: 'MANUAL'; reference?: string; reviewedBy?: string; reviewedAt?: string };
  workerId?: string;
  id: string;
  name: string;
  role: Role;
  designation: string;
  department: string;
  email: string;
  phone: string;
  division?: string;
  district?: string;
  assignedProjectIds: string[];
  contractorId?: string;
  avatarInitials: string;
  lastSiteVisit?: string;
  availability?: 'AVAILABLE' | 'ON_SITE' | 'ON_LEAVE' | 'UNAVAILABLE';
}

export type ProjectStage =
  | 'ADMIN_SANCTION'
  | 'TECHNICAL_SANCTION'
  | 'DESIGN'
  | 'TENDER'
  | 'WORK_ORDER'
  | 'CONSTRUCTION'
  | 'QUALITY_INSPECTION'
  | 'BILLING'
  | 'APPROVAL'
  | 'COMPLETION'
  | 'COMMISSIONING'
  | 'HANDOVER'
  | 'OPERATIONAL';

export type ProjectStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETED';

export type ProjectType =
  | 'District Hospital'
  | 'Rural Hospital'
  | 'Sub-District Hospital'
  | 'Women & Child Hospital'
  | 'Tribal Area Hospital'
  | 'Community Health Centre';

export interface Project {
  proposalId?: string;
  id: string;
  name: string;
  type: ProjectType;
  division: string;
  district: string;
  taluka: string;
  status: ProjectStatus;
  stage: ProjectStage;
  scheme: Scheme;
  facilityType: FacilityType;
  projectManagerId: string;  // operational coordinator — usually drawn from the Executive Engineer pool
  ownerDirectorId: string;   // senior accountable government owner — Commissioner/Regional Director/Civil Surgeon
  // Progress traceability (see lib/scope.ts docs and the Project 360 Overview tab):
  // these are deliberately four separate numbers — reported and verified are always
  // >= certified, and certified is what actually drives physicalProgress/payment.
  reportedProgress: number;   // contractor self-reported, unverified
  verifiedProgress: number;   // site-engineer field-verified
  physicalProgress: number;   // certified progress — the number that governs payment eligibility
  financialProgress: number;
  tenderId?: string;
  bedCount: number;
  sanctionedBudget: number;
  tenderAmount: number;
  workOrderValue: number;
  revisedEstimate: number;
  amountReleased: number;
  amountSpent: number;
  contractorId: string;
  pmcName: string;
  executiveEngineerId: string;
  siteEngineerId: string;
  startDate: string;
  originalCompletionDate: string;  // approved baseline — never overwritten by EOT approvals
  plannedCompletionDate: string;   // current/revised completion — moves when EOT is approved
  actualCompletionDate?: string;
  delayDays: number;
  delayReason?: DelayReason;
  recoveryPlan?: string;
  lat: number; // percentage position on SVG map (0-100) — schematic fallback map only
  lng: number;
  siteLat: number; // real WGS84 coordinates — registered site location, used for Google Maps + geofencing
  siteLng: number;
  siteBoundary?: { lat: number; lng: number }[]; // locally registered site polygon, WGS84
  geoFenceRadiusM?: number;
  boundaryUpdatedAt?: string;
  boundaryUpdatedBy?: string;
  siteLocationConfirmedAt?: string;
  siteLocationConfirmedBy?: string;
  description: string;
  qualityScore: number;
  imageSeed: number; // for deterministic placeholder image variety
}

// Certification workflow (see §6 of the governance spec):
// Contractor submits -> uploads evidence -> engineer verifies -> measurement recorded ->
// quality inspection -> milestone certified -> bill eligible -> paid.
// "Overdue" is deliberately NOT a status — it's derived by comparing plannedFinish to today
// for any milestone not yet CERTIFIED/BILL_ELIGIBLE/PAID (see lib/milestones.ts).
export type MilestoneStatus =
  | 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED_FOR_VERIFICATION' | 'INSPECTION_PENDING'
  | 'CORRECTION_REQUIRED' | 'VERIFIED' | 'CERTIFIED' | 'BILL_ELIGIBLE' | 'PAID';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;
  plannedStart: string;
  plannedDate: string; // planned finish
  actualStart?: string;
  actualDate?: string; // actual finish
  status: MilestoneStatus;
  weightagePct: number;           // % of contract value this milestone represents; sums to ~100 per project
  linkedBoqItemIds: string[];
  plannedValue: number;           // weightagePct of contract value
  claimedValue: number;           // contractor-claimed value once submitted
  certifiedValue: number;         // engineer/QC-certified value once certified
  paymentSlabPct: number;         // % of milestone value released at this slab (may be <100 pending retention)
  responsibleContractorId: string;
  responsibleEngineerId: string;  // executive/deputy engineer id who verifies+certifies
  evidenceRequired: boolean;
  inspectionRequired: boolean;
  dependencies: string[];         // milestone ids that must be CERTIFIED first
  evidenceCount: number;
  comments: string;
}

export interface ProgressReport {
  clientSubmissionId?: string;
  drawingId?: string;
  workCompleted?: string;
  delayReason?: string;
  measurementsNotes?: string;
  attachments?: BillAttachment[];
  id: string;
  projectId: string;
  date: string;
  stage: string;
  progressPct: number;
  workersPresent: number;
  weather: 'Clear' | 'Cloudy' | 'Rain' | 'Heavy Rain' | 'Extreme Heat';
  materialsReceived: string;
  materialsUsed: string;
  issues: string;
  photoIds: string[];
  videoCount: number;
  submittedBy: string;
  location: string;
  timestamp: string;
}

export type PhotoType = 'BEFORE' | 'PROGRESS' | 'COMPLETION';

export type LocationSource = 'CAPTURED' | 'MANUAL';
export type GeoFenceStatus = 'INSIDE' | 'OUTSIDE' | 'UNCERTAIN';

export interface SitePhoto {
  isReference?: boolean;
  milestoneId?: string;
  uploadedById?: string;
  review?: { status: 'APPROVED' | 'REJECTED'; reviewerId: string; reviewerName: string; reviewerRole: Role; reviewedAt: string; note: string };
  reviewHistory?: NonNullable<SitePhoto['review']>[];
  building?: string;
  floor?: string;
  activity?: string;
  id: string;
  projectId: string;
  stage: string;
  type: PhotoType;
  date: string;
  location: string;
  uploadedBy: string;
  uploadedByRole: Role;
  description: string;
  seed: number;         // fallback stock-photo picker — used only when dataUrl is absent (seed data)
  dataUrl?: string;      // actual captured image (base64 data URL) from device camera, when present
  mediaKey?: string;     // full-resolution original and stamped export live in IndexedDB
  lat: number; // real WGS84 — device-captured (or manually entered) coordinate
  lng: number;
  gpsAccuracyM?: number;      // only present when locationSource is CAPTURED
  gpsCapturedAt?: string;     // ISO datetime of the device location fix
  gpsAgeMs?: number;          // age of the location fix when the shutter was pressed
  geoFenceStatus?: GeoFenceStatus;
  distanceFromSiteM?: number;
  geoFenceRadiusM?: number;
  geoFenceShape?: 'POLYGON' | 'CIRCLE';
  geoFenceBoundaryUpdatedAt?: string;
  locationSource: LocationSource;
  deviceInfo?: string;
  capturedAt: string;         // ISO datetime — when the photo was taken
  uploadedAt: string;         // ISO datetime — when the local evidence record was saved; server sync is not configured
  boqItemId?: string;
  remarks?: string;
}

export type InspectionCategory =
  | 'STRUCTURAL' | 'CIVIL' | 'ELECTRICAL' | 'PLUMBING' | 'FIRE_SAFETY'
  | 'HVAC' | 'WATERPROOFING' | 'MEDICAL_GAS' | 'LIFT' | 'ACCESSIBILITY'
  | 'FINISHING' | 'SITE_SAFETY';

export type InspectionResult = 'PASS' | 'FAIL' | 'CONDITIONAL' | 'NOT_INSPECTED';
export type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'REVERIFY' | 'COMPLETED';

export interface ChecklistItem {
  id: string;
  requirement: string;
  measurement: string;
  standard: string;
  result: InspectionResult;
  evidence: string;
  remarks: string;
}

export interface Inspection {
  sourceRequestId?: string;
  sourceDefectId?: string;
  attachments?: BillAttachment[];
  photos?: { dataUrl: string; mediaKey: string; capturedAt: string; lat: number; lng: number }[];
  reviewHistory?: { decision: 'APPROVE' | 'RAISE_DEFECT' | 'REVERIFY'; reviewer: string; date: string; comments: string; items: ChecklistItem[]; photos: NonNullable<Inspection['photos']>; findings: string; attachments?: BillAttachment[] }[];
  assignedToId?: string;
  assignedRole?: Role;
  createdById?: string;
  scheduledTime?: string;
  location?: string;
  scope?: string;
  requiredDocuments?: string;
  instructions?: string;
  assignmentHistory?: { assignedToId: string; assignedToName: string; role: Role; assignedBy: string; date: string; reason: string }[];
  drawingId?: string;
  id: string;
  projectId: string;
  category: InspectionCategory;
  scheduledDate: string;
  completedDate?: string;
  inspector: string;
  status: InspectionStatus;
  items: ChecklistItem[];
  overallResult: InspectionResult;
  score: number;
  comments: string;
  isReinspection: boolean;
  parentInspectionId?: string;
}

export type DefectSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
// Display labels follow the contractor-facing workflow terminology (see DEFECT_STATUS_LABELS):
// OPEN="New", ASSIGNED="Acknowledged", IN_PROGRESS="In Rectification", FIXED="Evidence Submitted",
// REINSPECTION="Reinspection Pending", CLOSED="Closed". "Overdue" is derived, not stored.
export type DefectStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'FIXED' | 'REINSPECTION' | 'CLOSED';

export interface Defect {
  id: string;
  projectId: string;
  location: string;
  category: InspectionCategory;
  severity: DefectSeverity;
  description: string;
  imageSeed: number;
  reportedBy: string;
  contractorId: string;
  assignedPocId?: string;         // ContractorPoc.id — the specific person accountable
  responsibleEngineerId?: string; // User.id — engineer who must verify the fix
  responsibleOfficerId?: string;  // User.id — government officer with oversight
  acknowledgedDate?: string;
  dueDate: string;
  status: DefectStatus;
  createdDate: string;
  sourceInspectionId?: string;
  correctiveActionPhotoSeed?: number;
  correctiveActionNotes?: string;
  reinspectionPhotoSeed?: number; // AFTER / closure evidence
  closedDate?: string;
}

export type ApprovalType = 'RA_BILL' | 'DESIGN_CHANGE' | 'MILESTONE_COMPLETION' | 'MATERIAL_APPROVAL' | 'EXTENSION_OF_TIME' | 'REVISED_ESTIMATE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT_BACK' | 'CLARIFICATION_REQUESTED';
export type ApprovalStepRole = 'DEPUTY_ENGINEER' | 'EXECUTIVE_ENGINEER' | 'CIVIL_SURGEON' | 'REGIONAL_DIRECTOR' | 'COMMISSIONER';

export interface ApprovalHistoryEntry {
  step: ApprovalStepRole;
  approver: string;
  designation: string;
  timestamp: string;
  decision: 'APPROVED' | 'REJECTED' | 'SENT_BACK' | 'CLARIFICATION_REQUESTED';
  comment: string;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  projectId: string;
  amount?: number;
  submittedBy: string;
  submittedDate: string;
  documents: string[];
  comments: string;
  status: ApprovalStatus;
  chain: ApprovalStepRole[];
  currentStepIndex: number;
  history: ApprovalHistoryEntry[];
  relatedBillId?: string;
}

export type ContractorClassification = 'Class 1-A' | 'Class 1-B' | 'Class 2' | 'Class 3';
export type ContractorAccountStatus = 'ACTIVE' | 'ON_WATCH' | 'SUSPENDED';

export interface Contractor {
  id: string;
  company: string;
  regId: string;
  classification: ContractorClassification;
  status: ContractorAccountStatus;
  contactPerson: string;
  phone: string;
  email: string;
  assignedProjectIds: string[];
  contractAmount: number;
  startDate: string;
  endDate: string;
  performanceScore: number;
  scheduleAdherence: number;
  qualityScoreAvg: number;
  safetyScore: number;
  billProcessingScore: number;
  openDefects: number;
  delaysCount: number;
}

export type WorkerRole = 'Mason' | 'Electrician' | 'Plumber' | 'Carpenter' | 'Steel Worker' | 'Equipment Operator' | 'General Worker' | 'Safety Worker';

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  contractorId: string;
  projectId: string;
  skillLevel: 'Skilled' | 'Semi-Skilled' | 'Unskilled';
  shift: 'Day' | 'Night';
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'ON_LEAVE';
  safetyTrainingStatus: 'COMPLETED' | 'PENDING' | 'EXPIRED';
  phone: string;
  joinDate: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  method: 'QR' | 'MANUAL';
  shift: 'Day' | 'Night';
}

export type BillStatus = 'DRAFT' | 'SUBMITTED' | 'SITE_VERIFIED' | 'QUALITY_VERIFIED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface BillAttachment {
  id: string;
  category: 'SIGNED_BILL' | 'MEASUREMENT' | 'SUPPORTING';
  name: string;
  mimeType: string;
  size: number;
}

export interface Bill {
  measurementLines?: { boqItemId: string; quantity: number; location: string; measurementReference: string; variationId?: string }[];
  id: string;
  billNumber: string;
  contractorId: string;
  projectId: string;
  periodFrom: string;
  periodTo: string;
  grossAmount: number;
  deductions: number;
  gst: number;
  retention: number;
  penalty: number;
  netPayable: number;
  status: BillStatus;
  submittedDate: string;
  siteVerifiedBy?: string;
  qualityVerifiedBy?: string;
  approvedBy?: string;
  paidDate?: string;
  measurementBookId?: string;
  invoiceDate?: string;
  workOrderReference?: string;
  workDescription?: string;
  previousBillReference?: string;
  declarationAccepted?: boolean;
  submittedById?: string;
  attachments?: BillAttachment[];
}

export interface MeasurementEntry {
  measurementReference?: string;
  location?: string;
  verifiedById?: string;
  verifiedAt?: string;
  id: string;
  projectId: string;
  billId?: string;
  workItem: string;
  boqItemId: string;
  unit: string;
  previousQty: number;
  currentQty: number;
  totalQty: number;
  rate: number;
  amount: number;
  verifiedBy?: string;
  verified: boolean;
}

export type BoqCategory = 'Earthwork' | 'RCC' | 'Steel' | 'Brickwork' | 'Flooring' | 'Electrical' | 'Plumbing' | 'HVAC' | 'Fire Safety' | 'Medical Gas' | 'Finishing';

export interface BoqItem {
  id: string;
  projectId: string;
  category: BoqCategory;
  item: string;
  unit: string;
  plannedQty: number;
  completedQty: number;
  rate: number;
}

export type MaterialQualityStatus = 'ACCEPTED' | 'REJECTED' | 'UNDER_TESTING';

export interface Material {
  id: string;
  projectId: string;
  name: string;
  supplier: string;
  orderedQty: number;
  receivedQty: number;
  usedQty: number;
  remainingQty: number;
  unit: string;
  deliveryDate: string;
  qualityStatus: MaterialQualityStatus;
}

export type MaterialTestResult = 'PASS' | 'FAIL' | 'PENDING';

export interface MaterialTest {
  id: string;
  projectId: string;
  sampleId: string;
  material: string;
  supplier: string;
  date: string;
  test: string;
  result: MaterialTestResult;
  standard: string;
  inspector: string;
  reportRef: string;
}

export type SafetyRecordType = 'INSPECTION' | 'ACCIDENT' | 'NEAR_MISS' | 'VIOLATION' | 'TRAINING';

export interface SafetyRecord {
  id: string;
  projectId: string;
  type: SafetyRecordType;
  date: string;
  description: string;
  severity: DefectSeverity;
  correctiveAction: string;
  status: 'OPEN' | 'CLOSED';
  ppeCompliance: number;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Risk {
  id: string;
  projectId: string;
  risk: string;
  category: string;
  probability: number;
  impact: number;
  score: number;
  level: RiskLevel;
  owner: string;
  mitigation: string;
  dueDate: string;
  status: 'OPEN' | 'MITIGATED' | 'CLOSED';
}

export type DocumentType =
  | 'DPR' | 'Administrative Sanction' | 'Technical Sanction' | 'Tender' | 'Work Order'
  | 'Agreement' | 'BOQ' | 'Drawings' | 'Inspection Report' | 'Test Report'
  | 'Bills' | 'Approvals' | 'Completion Certificate' | 'Handover Documents';

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  uploadedBy: string;
  uploadDate: string;
  version: number;
  approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  sizeKb: number;
}

export type CommissioningItemName =
  | 'Building Complete' | 'Electrical Connection' | 'Water Connection' | 'Fire Safety'
  | 'Lift' | 'Medical Gas' | 'HVAC' | 'Biomedical Waste' | 'IT Network'
  | 'Furniture' | 'Medical Equipment' | 'Staff Readiness' | 'Security' | 'Accessibility';

export interface CommissioningItem {
  id: string;
  projectId: string;
  item: CommissioningItemName;
  status: 'READY' | 'NOT_READY' | 'PENDING';
  remarks: string;
  updatedDate: string;
}

export type HandoverStepStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';

export interface HandoverStep {
  id: string;
  projectId: string;
  step: string;
  order: number;
  status: HandoverStepStatus;
  date?: string;
  responsible: string;
}

export type DelayReason = 'Land' | 'Design' | 'Approval' | 'Contractor' | 'Labour' | 'Material' | 'Weather' | 'Utility' | 'Funding' | 'Other';

export interface Notification {
  id: string;
  message: string;
  type: 'ALERT' | 'APPROVAL' | 'INFO' | 'WARNING' | 'CRITICAL';
  date: string;
  read: boolean;
  projectId?: string;
  targetRoles: Role[];
}

export interface AuditEntry {
  id: string;
  user: string;
  role: Role;
  action: string;
  project?: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

export interface Observation {
  id: string;
  projectId: string;
  observer: string;
  date: string;
  category: string;
  note: string;
  recommendedAction: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  imageSeed?: number;
}

// ---------- Tender lifecycle ----------
// Draft -> Approval -> Published -> Bid Submission -> Technical Evaluation ->
// Financial Evaluation -> Award Approval -> LOA -> Agreement -> Work Order
export type TenderStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'BID_SUBMISSION'
  | 'TECHNICAL_EVALUATION' | 'FINANCIAL_EVALUATION' | 'AWARD_APPROVAL'
  | 'LOA_ISSUED' | 'AGREEMENT_SIGNED' | 'WORK_ORDER_ISSUED' | 'CANCELLED';

export type TenderType = 'OPEN' | 'LIMITED' | 'SINGLE_SOURCE' | 'EPC' | 'ITEM_RATE';

export interface TenderBidder {
  name: string;
  technicalScore?: number;
  financialBid?: number;
  qualified: boolean;
}

export interface Tender {
  id: string;
  projectId: string;
  title: string;
  estimatedCost: number;
  tenderType: TenderType;
  publishDate: string;
  preBidDate?: string;
  submissionDeadline: string;
  technicalOpeningDate?: string;
  financialOpeningDate?: string;
  bidders: TenderBidder[];
  selectedBidder?: string;
  awardValue?: number;
  status: TenderStatus;
  loaDate?: string;
  agreementDate?: string;
  workOrderDate?: string;
}

// ---------- Governance registers (§20) ----------
// Change / Variation Management — never overwrites the approved baseline, only tracks deltas.
export type ChangeOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface ChangeOrder {
  id: string;
  projectId: string;
  title: string;
  reason: string;
  costImpact: number;      // positive = increase, negative = decrease
  scheduleImpactDays: number;
  requestedBy: string;
  requestedDate: string;
  supportingDocument: string;
  status: ChangeOrderStatus;
  approvedBy?: string;
  approvedDate?: string;
}

// Extension of Time — tracked separately from the generic approval chain per spec §20.
export type EotStatus = 'PENDING' | 'RECOMMENDED' | 'APPROVED' | 'REJECTED';

export interface ExtensionOfTime {
  id: string;
  projectId: string;
  reason: DelayReason;
  daysRequested: number;
  requestedBy: string;
  requestedDate: string;
  supportingDocument: string;
  recommendation?: string;
  recommendedBy?: string;
  status: EotStatus;
  approvedDays?: number;
  approvedDate?: string;
  revisedCompletionDate?: string;
}

// Site Issue / Hindrance Register
export type SiteIssueCategory = 'LAND' | 'UTILITY_SHIFTING' | 'PERMISSION_DELAY' | 'DRAWING_DELAY' | 'MATERIAL_SHORTAGE' | 'HOSPITAL_OPERATIONAL_CONSTRAINT' | 'OTHER';

export interface SiteIssue {
  id: string;
  projectId: string;
  category: SiteIssueCategory;
  description: string;
  raisedBy: string;
  raisedDate: string;
  owner: string;           // who owns resolution
  targetResolutionDate?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  resolvedDate?: string;
  impact: 'SCHEDULE' | 'COST' | 'BOTH' | 'NONE';
}

// Decision Tracker — surfaced prominently on Secretary/Commissioner dashboards.
export interface Decision {
  id: string;
  projectId: string;
  decisionRequired: string;
  financialImpact?: number;
  scheduleImpactDays?: number;
  recommendedAction: string;
  pendingWith: Role;
  pendingSince: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'DECIDED';
  decidedDate?: string;
  decisionOutcome?: string;
  attachments?: BillAttachment[];
}

// ---------- Contractor points of contact ----------
// Company-wide roster (belongs to the contractor, not a single project) — a person can be the
// primary POC on one project and secondary on another via assignedProjectIds.
export type ContractorPocRole = 'Project Manager' | 'Site Engineer' | 'Safety Officer' | 'Billing Engineer' | 'Quality Engineer' | 'Supervisor';

export interface ContractorPoc {
  id: string;
  contractorId: string;
  name: string;
  designation: string;
  role: ContractorPocRole;
  phone: string;
  email: string;
  responsibility: string;
  siteAvailability: 'ON_SITE' | 'AVAILABLE' | 'OFF_SITE';
  isPrimary: boolean;
  assignedProjectIds: string[];
}

// ---------- Critical quality failures ----------
// A structured record for inspection failures serious enough to require dedicated tracking,
// distinct from the routine Inspection/ChecklistItem record it originates from.
export interface QualityFailure {
  id: string;
  projectId: string;
  inspectionId: string;
  milestoneId?: string;
  location: string;
  category: InspectionCategory;
  severity: DefectSeverity;
  inspectionDate: string;
  inspector: string;
  description: string;
  possibleImpact: string;
  requiredAction: string;
  assignedContractorId: string;
  targetClosure: string;
  reinspectionStatus: 'PENDING' | 'SCHEDULED' | 'PASS' | 'FAIL';
}

// ---------- Quality reports (by discipline) ----------
export type QualityReportType =
  | 'Inspection Report' | 'Material Test Report' | 'Concrete Test Report' | 'Steel Test Report'
  | 'Waterproofing Report' | 'Electrical Test Report' | 'Plumbing Test Report' | 'Fire Safety Report'
  | 'MEP Report' | 'Final Quality Report';

export interface QualityReport {
  id: string;
  projectId: string;
  reportType: QualityReportType;
  inspectionId?: string;
  milestoneId?: string;
  reportNo: string;
  date: string;
  inspector: string;
  agency: string;
  testType: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  observations: string;
  linkedDefectIds: string[];
}

// ---------- Inspection appointments ----------
// Replaces ad hoc "start/assign inspection" actions with a proper scheduling workflow whose
// available action depends on the logged-in role (request / propose / schedule / view-only).
export type AppointmentStatus = 'REQUESTED' | 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface InspectionAppointment {
  reviewReason?: string;
  requestedById?: string;
  assignedById?: string;
  assignedBy?: string;
  assignedInspectorId?: string;
  id: string;
  projectId: string;
  milestoneId?: string;
  inspectionType: InspectionCategory;
  requestedBy: string;
  requestedByRole: Role;
  assignedInspector?: string;
  date: string;
  time: string;
  site: string;
  attendees: string[];
  contractorPoc?: string;
  governmentPoc?: string;
  requiredDocuments: string[];
  remarks: string;
  status: AppointmentStatus;
  linkedInspectionId?: string;
}

/** Government funding received by a project, separate from contractor bill payments. */
export interface FundInstallment {
  id: string;
  projectId: string;
  number: number;
  amount: number;
  plannedDate: string;
  receivedDate?: string;
  source: string;
  reference?: string;
  purpose: string;
  releaseCondition: string;
  authority: string;
}
