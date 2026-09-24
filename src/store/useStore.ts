import { proposalActions, proposalAccounts, type ProposalActions } from '../lib/projectProposals';
import { withPuneDemo } from '../mock/puneDemo';
import { reconcileProjects } from '../lib/financeLedger';
import { isRealSitePhoto } from '../lib/sitePhotoEvidence';
import { canReviewInspection, canManageInspection, inspectionAccounts, inspectionAssignmentRoles } from '../lib/inspectionAccess';
import { validateMilestonePhoto } from '../lib/milestonePhoto';
import { withDemoFinance } from '../mock/demoFinance';
import { extendDemoPortfolio, mergeDemoSamples } from '../mock/demoPortfolio';
import { workforceAccount } from '../lib/workforceAccount';
import { DEFAULT_ESCALATION, pendingWork, daysLate, drawingWarning, type EscalationPolicy } from '../lib/pendingWork';
import { INSPECTION_CATEGORIES, ROLE_LABELS } from '../lib/constants';
import { contractorAccount } from '../lib/contractorAccount';
import { generateFundInstallments } from '../mock/fundInstallments';
import { todayDate } from '../lib/fundDisbursal';
import { distanceMeters, pointInPolygon, polygonSelfIntersects } from '../lib/geo';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateMockData } from '../mock/seed';
import { ROLE_NAV, NAV_ITEMS } from '../components/layout/navConfig';
import { computeProjectScope } from '../lib/projectScope';
import { validateBillSubmission } from '../lib/billSubmission';
import { readBillFile } from '../lib/billAttachments';
import { previousClaimedQuantity, validateBillMeasurements } from '../lib/billMeasurements';
import { createControlActions, handoverGaps, activeControls, actualTransactions, validControl, type ControlActions, type ControlRecord } from '../lib/projectControls';
import type {
  FundInstallment, Project, User, Milestone, ProgressReport, SitePhoto, Inspection, Defect, ApprovalRequest,
  Contractor, Worker, AttendanceRecord, Bill, MeasurementEntry, BoqItem, Material, MaterialTest,
  SafetyRecord, Risk, ProjectDocument, CommissioningItem, HandoverStep, Notification, AuditEntry,
  Observation, Role, DefectStatus, ApprovalStatus, InspectionResult, Tender,
  ChangeOrder, ExtensionOfTime, SiteIssue, Decision,
  ContractorPoc, QualityFailure, QualityReport, InspectionAppointment,
} from '../types';

const seed = withPuneDemo(extendDemoPortfolio(generateMockData()));
seed.users = proposalAccounts(seed.users);
seed.photos = seed.photos.map(photo => ({ ...photo, isReference: !isRealSitePhoto(photo) }));
let auditSeq = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}${(auditSeq++).toString(36)}`;

export interface StoreState extends ControlActions, ProposalActions {
  referencePhotosRestored: boolean;
  customRoles: { id: string; name: string; baseRole: Role }[];
  createCustomRole: (name: string, baseRole: Role) => void;
  assignCustomRole: (userId: string, customRoleId: string) => void;
  reviewPhoto: (id: string, status: 'APPROVED' | 'REJECTED', note: string) => void;
  addStaffUser: (input: Omit<User, 'id' | 'avatarInitials' | 'identityReview'>) => User;
  submitKycApplication: (documentType: NonNullable<User['kycApplication']>['documentType'], declaration: boolean) => void;
  reviewStaffIdentity: (id: string, status: 'VERIFIED' | 'REJECTED', reference: string) => void;
  escalationPolicy: EscalationPolicy;
  escalationKeys: string[];
  setEscalationPolicy: (policy: EscalationPolicy) => void;
  evaluateEscalations: () => void;
  controlRecords: ControlRecord[];
  currentUser: User | null;
  users: User[];
  /** Which nav sections each role can see — seeded from ROLE_NAV, editable by Superadmin via
   * the Access Management screen so permission changes apply live across Sidebar/AppShell. */
  rolePermissions: Record<Role, string[]>;
  projects: Project[];
  fundInstallments: FundInstallment[];
  tenders: Tender[];
  changeOrders: ChangeOrder[];
  extensionsOfTime: ExtensionOfTime[];
  siteIssues: SiteIssue[];
  decisions: Decision[];
  contractorPocs: ContractorPoc[];
  qualityFailures: QualityFailure[];
  qualityReports: QualityReport[];
  inspectionAppointments: InspectionAppointment[];
  milestones: Milestone[];
  progressReports: ProgressReport[];
  photos: SitePhoto[];
  inspections: Inspection[];
  defects: Defect[];
  approvals: ApprovalRequest[];
  contractors: Contractor[];
  workers: Worker[];
  attendance: AttendanceRecord[];
  bills: Bill[];
  measurements: MeasurementEntry[];
  boqItems: BoqItem[];
  materials: Material[];
  materialTests: MaterialTest[];
  safetyRecords: SafetyRecord[];
  risks: Risk[];
  documents: ProjectDocument[];
  commissioning: CommissioningItem[];
  handoverSteps: HandoverStep[];
  notifications: Notification[];
  auditLog: AuditEntry[];
  observations: Observation[];

  // auth
  login: (role: Role, userId?: string) => void;
  logout: () => void;

  // access management (Superadmin)
  setRoleNavAccess: (role: Role, keys: string[]) => void;
  updateUserRole: (userId: string, role: Role) => void;

  // generic audit
  logAction: (action: string, project?: string, previousValue?: string, newValue?: string) => void;

  // projects
  addProject: (p: Partial<Project> & { name: string }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;

  // progress
  addProgressReport: (r: Omit<ProgressReport, 'id'>) => Promise<void>;
  addPhoto: (p: Omit<SitePhoto, 'id'>) => SitePhoto;
  updateSiteBoundary: (projectId: string, points: { lat: number; lng: number }[], radiusM: number) => void;
  updateSiteLocation: (projectId: string, location: { lat: number; lng: number }) => void;
  deletePhoto: (id: string) => void;

  // milestones — certification workflow (submit -> verify/inspect -> certify -> bill-eligible -> paid)
  submitMilestone: (id: string, claimedValue: number) => void;
  requestMilestoneCorrection: (id: string, notes: string) => void;
  verifyMilestone: (id: string) => void;
  certifyMilestone: (id: string, certifiedValue: number) => void;
  markMilestoneBillEligible: (id: string) => void;
  markMilestonePaid: (id: string) => void;

  // governance registers
  raiseChangeOrder: (c: Omit<ChangeOrder, 'id' | 'status'>) => void;
  decideChangeOrder: (id: string, status: 'APPROVED' | 'REJECTED') => void;
  raiseExtensionOfTime: (e: Omit<ExtensionOfTime, 'id' | 'status'>) => void;
  decideExtensionOfTime: (id: string, status: 'APPROVED' | 'REJECTED', approvedDays?: number) => void;
  raiseSiteIssue: (i: Omit<SiteIssue, 'id' | 'status'>) => void;
  resolveSiteIssue: (id: string) => void;
  addDecision: (d: Omit<Decision, 'id' | 'status'>) => void;
  resolveDecision: (id: string, outcome: string, attachments?: Decision['attachments']) => void;

  // inspections
  scheduleInspection: (i: Omit<Inspection, 'id' | 'items' | 'score' | 'overallResult' | 'status' | 'isReinspection'> & { category: Inspection['category'] }) => Inspection;
  submitInspection: (id: string, items: Inspection['items'], result: InspectionResult, comments: string) => void;
  startInspection: (id: string) => void;
  reviewInspection: (id: string, decision: 'APPROVE' | 'RAISE_DEFECT' | 'REVERIFY', comments: string) => void;
  setInspectionDocuments: (id: string, attachments: NonNullable<Inspection['attachments']>) => void;
  setInspectionPhotos: (id: string, photos: NonNullable<Inspection['photos']>) => void;
  assignInspection: (id: string, userId: string, reason: string) => void;
  reinspect: (defectId: string) => Inspection;
  passReinspection: (inspectionId: string, items?: Inspection['items'], comments?: string) => void;

  // defects
  createDefect: (d: Omit<Defect, 'id' | 'status' | 'createdDate'>) => Defect;
  assignDefect: (id: string, pocId?: string) => void;
  acknowledgeDefect: (id: string) => void;
  updateDefectStatus: (id: string, status: DefectStatus) => void;
  addCorrectiveAction: (id: string, notes: string, photoSeed: number) => void;
  closeDefect: (id: string) => void;

  // inspection appointments
  declineInspectionRequest: (id: string, reason: string) => void;
  requestAppointment: (a: Omit<InspectionAppointment, 'id' | 'status'>) => InspectionAppointment;
  scheduleAppointment: (id: string, date: string, time: string, inspector: string) => void;
  rescheduleAppointment: (id: string, date: string, time: string, remarks: string) => void;
  cancelAppointment: (id: string, remarks: string) => void;
  completeAppointment: (id: string) => void;

  // contractors / workers
  addContractor: (c: Omit<Contractor, 'id'>) => void;
  assignContractorToProject: (contractorId: string, projectId: string) => void;
  addWorker: (w: Omit<Worker, 'id'>) => void;
  markAttendance: (workerId: string, projectId: string, method: 'QR' | 'MANUAL') => void;

  // bills / finance
  submitBill: (b: Omit<Bill, 'id' | 'status' | 'submittedDate'>) => Promise<Bill>;
  verifyBillSite: (id: string) => void;
  verifyBillQuality: (id: string) => void;
  approveBill: (id: string) => void;
  rejectBill: (id: string, reason: string) => void;
  markBillPaid: (id: string) => void;
  verifyMeasurement: (id: string, by: string) => void;

  // approvals
  decideApproval: (id: string, decision: 'APPROVED' | 'REJECTED' | 'SENT_BACK' | 'CLARIFICATION_REQUESTED', comment: string) => void;
  createApproval: (a: Omit<ApprovalRequest, 'id' | 'status' | 'currentStepIndex' | 'history'>) => void;

  // materials
  addMaterial: (m: Omit<Material, 'id'>) => void;
  receiveMaterial: (id: string, qty: number) => void;
  recordMaterialTest: (t: Omit<MaterialTest, 'id'>) => void;

  // safety / risk
  addSafetyRecord: (s: Omit<SafetyRecord, 'id'>) => void;
  createRisk: (r: Omit<Risk, 'id' | 'score' | 'level'>) => void;
  updateRiskStatus: (id: string, status: Risk['status']) => void;

  // documents
  uploadDocument: (d: Omit<ProjectDocument, 'id' | 'uploadDate' | 'version' | 'approvalStatus'>) => void;
  setDocumentStatus: (id: string, status: ProjectDocument['approvalStatus']) => void;

  // commissioning / handover
  updateCommissioningItem: (id: string, status: CommissioningItem['status'], remarks: string) => void;
  advanceHandoverStep: (id: string) => void;
  completeHandoverAndOperationalize: (projectId: string) => void;

  // observations
  addObservation: (o: Omit<Observation, 'id'>) => void;
  updateObservationStatus: (id: string, status: Observation['status']) => void;

  // notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (n: Omit<Notification, 'id' | 'read' | 'date'>) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...proposalActions(set, get),
      customRoles: [],
      createCustomRole: (name, baseRole) => {
        if (get().currentUser?.role !== 'SUPERADMIN') throw new Error('Only superadmins can create roles.');
        if (name.trim().length < 3 || !ROLE_LABELS[baseRole] || ['SUPERADMIN','WORKFORCE','CONTRACTOR'].includes(baseRole)) throw new Error('Choose an eligible staff role and a name of at least three characters.');
        if (get().customRoles.some(r => r.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('Role name already exists.');
        set(s => ({ customRoles: [...s.customRoles, { id: nid('ROLE'), name: name.trim(), baseRole }] }));
        get().logAction(`Created custom role: ${name.trim()}`, undefined, undefined, baseRole);
      },
      assignCustomRole: (userId, customRoleId) => {
        const role = get().customRoles.find(r => r.id === customRoleId);
        if (get().currentUser?.role !== 'SUPERADMIN' || userId === get().currentUser?.id || !role) throw new Error('Only superadmins can assign custom roles to other users.');
        const user = get().users.find(u => u.id === userId);
        if (!user || ['SUPERADMIN','CONTRACTOR','WORKFORCE'].includes(user.role)) throw new Error('Choose an eligible staff account.');
        set(s => ({ users: s.users.map(u => u.id === userId ? { ...u, role: role.baseRole, customRoleId, designation: role.name } : u) }));
        get().logAction(`Assigned custom role ${role.name} to ${user.name}`);
      },
      currentUser: null,
      escalationPolicy: DEFAULT_ESCALATION,
      escalationKeys: [],
      setEscalationPolicy: (policy) => {
        if (get().currentUser?.role !== 'COMMISSIONER') throw new Error('Only the commissioner can configure escalation.');
        const roles = ['EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR', 'COMMISSIONER'];
        if (![policy.approvalDays, policy.firstDays, policy.secondDays].every(n => Number.isInteger(n) && n > 0) || policy.secondDays < policy.firstDays || !roles.includes(policy.firstRole) || !roles.includes(policy.secondRole)) throw new Error('Enter valid escalation thresholds and recipients.');
        set({ escalationPolicy: policy }); get().logAction('Updated delay escalation policy');
      },
      evaluateEscalations: () => {
        if (!get().currentUser || get().currentUser?.role === 'WORKFORCE') return;
        const policy = get().escalationPolicy;
        for (const task of pendingWork(get(), todayDate(), policy, false)) {
          const days = daysLate(task.due, todayDate());
          if (!days) continue;
          const level = days >= policy.secondDays ? 2 : days >= policy.firstDays ? 1 : 0;
          const role = level === 2 ? policy.secondRole : level === 1 ? policy.firstRole : task.ownerRole;
          const key = [task.id, task.due, level, role].join(':');
          if (get().escalationKeys.includes(key)) continue;
          set(s => ({ escalationKeys: [...s.escalationKeys, key] }));
          get().pushNotification({ projectId: task.projectId, type: level ? 'WARNING' : 'INFO', targetRoles: [...new Set([task.ownerRole, role])], message: task.title + ' is ' + days + ' days overdue. Escalation level ' + level + '.' });
        }
      },
      controlRecords: withDemoFinance(seed.projects, seed.projects, []),
      ...createControlActions(set, get),
      ...seed,
      projects: reconcileProjects(seed.projects, withDemoFinance(seed.projects, seed.projects, [])),
      rolePermissions: JSON.parse(JSON.stringify(ROLE_NAV)),
      referencePhotosRestored: true,
      fundInstallments: generateFundInstallments(seed.projects, todayDate()),

      login: (role, userId) => {
        if (get().currentUser?.role === 'WORKFORCE' && role !== 'WORKFORCE') throw new Error('Sign out before switching accounts.');
        if (role === 'WORKFORCE') {
          const workerId = userId?.startsWith('WORKFORCE-') ? userId.slice('WORKFORCE-'.length) : userId;
          const worker = workerId ? get().workers.find(w => w.id === workerId) : get().workers[0];
          set({ currentUser: worker ? workforceAccount(worker) : null }); return;
        }
        const user = userId ? get().users.find((u) => u.id === userId) : get().users.find((u) => u.role === role);
        if (userId && user?.role !== role) { set({ currentUser: null }); return; }
        if (role === 'CONTRACTOR') {
          const firm = get().contractors.find(c => c.id === user?.contractorId) ?? (!userId && !user ? get().contractors[0] : undefined);
          set({ currentUser: firm ? contractorAccount(firm, get().projects, user) : null });
          return;
        }
        set({ currentUser: user?.role === role ? user : null });
      },
      logout: () => set({ currentUser: null }),

      addStaffUser: (input) => {
        if (get().currentUser?.role !== 'SUPERADMIN') throw new Error('Only superadmins can add users.');
        if (input.role === 'WORKFORCE') throw new Error('Create workforce accounts in the workforce module.');
        if (!ROLE_LABELS[input.role] || !input.name.trim() || !input.department.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) || !/^[+\d ()-]{7,20}$/.test(input.phone.trim())) throw new Error('Enter a name, department, valid email and phone.');
        if (get().users.some(u => u.email.toLowerCase() === input.email.trim().toLowerCase())) throw new Error('This email already has an account.');
        if (input.assignedProjectIds.some(id => !get().projects.some(p => p.id === id))) throw new Error('Select valid projects.');
        if (input.role === 'REGIONAL_DIRECTOR' && !get().projects.some(p => p.division === input.division)) throw new Error('Select a valid division.');
        if (input.role === 'CIVIL_SURGEON' && !get().projects.some(p => p.district === input.district)) throw new Error('Select a valid district.');
        if (input.role === 'CONTRACTOR' && !get().contractors.some(c => c.id === input.contractorId)) throw new Error('Select a registered contractor firm.');
        const user: User = { ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.trim(), id: nid('USR'), avatarInitials: input.name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase(), identityReview: { status: 'PENDING', method: 'MANUAL' } };
        set(s => ({ users: [...s.users, user] })); get().logAction(`Created staff account: ${user.name}`, undefined, undefined, user.role); return user;
      },
      submitKycApplication: (documentType, declaration) => {
        const user = get().users.find(u => u.id === get().currentUser?.id);
        if (!user) throw new Error('Sign in to submit your KYC application.');
        if (!declaration || !['EMPLOYEE_ID','CONTRACTOR_REGISTRATION','GOVERNMENT_ID'].includes(documentType)) throw new Error('Choose a document type and confirm your declaration.');
        if (user.kycApplication && user.identityReview?.status !== 'REJECTED') throw new Error('Your application is already submitted.');
        const updated: User = { ...user, kycApplication: { submittedAt: new Date().toISOString(), documentType, declaration: true, name: user.name, email: user.email, phone: user.phone }, identityReview: { status: 'PENDING', method: 'MANUAL' } };
        set(s => ({ users: s.users.map(u => u.id === user.id ? updated : u), currentUser: updated }));
        get().logAction('KYC application submitted', undefined, undefined, user.id);
      },
      reviewStaffIdentity: (id, status, reference) => {
        const reviewer = get().currentUser;
        if (reviewer?.role !== 'SUPERADMIN') throw new Error('Only superadmins can review identities.');
        if (id === reviewer.id) throw new Error('You cannot verify your own identity.');
        if (!get().users.some(u => u.id === id) || !['VERIFIED', 'REJECTED'].includes(status) || reference.trim().length < 5) throw new Error('Enter a review reference of at least five characters.');
        set(s => ({ users: s.users.map(u => u.id === id ? { ...u, identityReview: { status, method: 'MANUAL', reference: reference.trim(), reviewedBy: reviewer.id, reviewedAt: new Date().toISOString() } } : u) }));
        get().logAction(`Manual identity review: ${id}`, undefined, undefined, status);
      },

      setRoleNavAccess: (role, keys) => {
        if (get().currentUser?.role !== 'SUPERADMIN') throw new Error('Only superadmins can update access permissions.');
        if (role === 'SUPERADMIN' && !keys.includes('access')) throw new Error('Superadmin must always retain Access Management.');
        set((s) => ({ rolePermissions: { ...s.rolePermissions, [role]: Object.keys(NAV_ITEMS).filter(key => keys.includes(key)) } }));
        get().logAction(`Updated access permissions for role ${role}`);
      },
      updateUserRole: (userId, role) => {
        const user = get().users.find((u) => u.id === userId);
        set((s) => ({
          users: s.users.map((u) => (u.id === userId ? { ...u, role, customRoleId: undefined, designation: ROLE_LABELS[role] } : u)),
          currentUser: s.currentUser?.id === userId ? null : s.currentUser,
        }));
        if (user) get().logAction(`Changed ${user.name}'s role from ${user.role} to ${role}`);
      },

      logAction: (action, project, previousValue, newValue) => {
        const u = get().currentUser;
        set((s) => ({
          auditLog: [{
            id: nid('AUD'), user: u?.name ?? 'System', role: u?.role ?? 'COMMISSIONER', action,
            project, timestamp: new Date().toISOString(), previousValue, newValue,
          }, ...s.auditLog],
        }));
      },

      addProject: () => { throw new Error('Create a Ministry proposal and complete all approval stages before creating a project.'); },
      updateProject: (id, patch) => {
        assertProjectAccess(get(), id);
        if (['stage', 'status', 'workOrderValue', 'tenderAmount', 'sanctionedBudget', 'revisedEstimate', 'originalCompletionDate', 'plannedCompletionDate', 'amountSpent', 'amountReleased', 'financialProgress', 'physicalProgress'].some(key => Object.hasOwn(patch, key))) throw new Error('Use verified contract controls for financial, schedule and lifecycle changes.');
        const before = get().projects.find((p) => p.id === id);
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        if (before) get().logAction('Updated project details', before.name);
      },

      addProgressReport: async (r) => {
        assertProjectAccess(get(), r.projectId, ['CONTRACTOR', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        if (!Number.isFinite(r.progressPct) || r.progressPct < 0 || r.progressPct > 100) throw new Error('Progress must be between 0 and 100.');
        const submitter = get().currentUser!;
        const warning = drawingWarning(get(), r.projectId, r.drawingId);
        if (warning) throw new Error(warning);
        if (r.clientSubmissionId && get().progressReports.some(p => p.clientSubmissionId === r.clientSubmissionId && p.projectId === r.projectId)) return;
        if (!r.attachments?.length || r.attachments.length > 5) throw new Error('Attach 1 to 5 supporting documents.');
        for (const attachment of r.attachments) {
          const file = await readBillFile(attachment.id);
          if (!file.size || file.size > 5 * 1024 * 1024 || file.size !== attachment.size || file.type !== attachment.mimeType || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) throw new Error('Use PDF, JPEG or PNG files up to 5 MB each.');
        }
        if (get().currentUser?.id !== submitter.id || get().currentUser?.role !== submitter.role) throw new Error('Your account changed. Reopen the progress form.');
        assertProjectAccess(get(), r.projectId, ['CONTRACTOR', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        if (r.clientSubmissionId && get().progressReports.some(p => p.clientSubmissionId === r.clientSubmissionId && p.projectId === r.projectId)) return;
        const report: ProgressReport = { ...r, submittedBy: submitter.name, id: nid('PRG') };
        set((s) => ({ progressReports: [report, ...s.progressReports] }));
        const project = get().projects.find((p) => p.id === r.projectId);
        get().updateProject(r.projectId, { reportedProgress: Math.max(project?.reportedProgress ?? 0, r.progressPct) });
        get().logAction(`Submitted daily progress report (${r.stage})`, project?.name);
      },
      addPhoto: (p) => {
        assertProjectAccess(get(), p.projectId, ['SUPERADMIN', 'CONTRACTOR', 'SITE_SUPERVISOR', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        if (p.milestoneId) {
          const project = get().projects.find(item => item.id === p.projectId);
          if (!project) throw new Error('Project not found.');
          p = validateMilestonePhoto(p, project, get().milestones);
        }
        const actor = get().currentUser!;
        const photo: SitePhoto = { ...p, id: nid('PHO'), uploadedById: actor.id, uploadedBy: actor.name, uploadedByRole: actor.role, review: undefined, reviewHistory: [] };
        set((s) => ({ photos: [photo, ...s.photos] }));
        const project = get().projects.find((pr) => pr.id === p.projectId);
        get().logAction(`Uploaded ${p.type.toLowerCase()} site photograph — ${p.stage}`, project?.name);
        return photo;
      },
      updateSiteBoundary: (projectId, points, radiusM) => {
        const actor = assertProjectAccess(get(), projectId, ['SUPERADMIN', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        const project = get().projects.find(item => item.id === projectId);
        if (!project) throw new Error('Project not found.');
        if ((points.length > 0 && points.length < 3) || points.length > 50 || points.some(point => !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || point.lat < 15 || point.lat > 23 || point.lng < 72 || point.lng > 82)) throw new Error('Draw a valid site boundary with 3 to 50 points, or clear it to use the fallback radius.');
        if (points.length >= 3 && !project.siteLocationConfirmedAt) throw new Error('Confirm the actual site location before saving a polygon.');
        if (points.length >= 3 && (polygonSelfIntersects(points) || points.some(point => distanceMeters(point, { lat: project.siteLat, lng: project.siteLng }) > 2000))) throw new Error('Draw a simple boundary within 2 km of the registered site.');
        if (points.length >= 3 && !pointInPolygon({ lat: project.siteLat, lng: project.siteLng }, points)) throw new Error('The boundary must contain the registered site location.');
        if (!Number.isFinite(radiusM) || radiusM < 25 || radiusM > 2000) throw new Error('Set a fallback radius between 25 and 2,000 metres.');
        const now = new Date().toISOString();
        set(state => ({ projects: state.projects.map(item => item.id === projectId ? { ...item, siteBoundary: points.length ? points : undefined, geoFenceRadiusM: Math.round(radiusM), boundaryUpdatedAt: now, boundaryUpdatedBy: actor.id } : item) }));
        get().logAction('Updated registered site boundary', project.name, undefined, points.length ? `${points.length} points` : `${Math.round(radiusM)}m circular radius`);
      },
      updateSiteLocation: (projectId, location) => {
        const actor = assertProjectAccess(get(), projectId, ['SUPERADMIN', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        const project = get().projects.find(item => item.id === projectId);
        if (!project) throw new Error('Project not found.');
        if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || location.lat < 15 || location.lat > 23 || location.lng < 72 || location.lng > 82) throw new Error('Select a valid Maharashtra site location.');
        if (project.siteBoundary?.length && !pointInPolygon(location, project.siteBoundary)) throw new Error('The site marker must remain inside the saved boundary. Clear the boundary first.');
        const now = new Date().toISOString();
        set(state => ({ projects: state.projects.map(item => item.id === projectId ? { ...item, siteLat: location.lat, siteLng: location.lng, siteLocationConfirmedAt: now, siteLocationConfirmedBy: actor.id } : item) }));
        get().logAction('Confirmed actual hospital site coordinates', project.name, `${project.siteLat.toFixed(6)}, ${project.siteLng.toFixed(6)}`, `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      },
      reviewPhoto: (id, status, note) => {
        const photo = get().photos.find(p => p.id === id);
        if (!photo) throw new Error('Photo not found.');
        const actor = assertProjectAccess(get(), photo.projectId, ['SUPERADMIN', 'PROJECT_MANAGER', 'EXECUTIVE_ENGINEER']);
        if (photo.uploadedById === actor.id || (!photo.uploadedById && photo.uploadedBy === actor.name)) throw new Error('You cannot approve your own evidence.');
        if (!['APPROVED', 'REJECTED'].includes(status) || note.trim().length < 5) throw new Error('Enter review comments of at least five characters.');
        if (!photo.dataUrl) throw new Error('Illustrative demo photos cannot be approved as site evidence.');
        const review = { status, reviewerId: actor.id, reviewerName: actor.name, reviewerRole: actor.role, reviewedAt: new Date().toISOString(), note: note.trim() };
        set(s => ({ photos: s.photos.map(p => p.id === id ? { ...p, review, reviewHistory: [...(p.reviewHistory ?? []), review] } : p) }));
        get().logAction(`Photo evidence ${status.toLowerCase()}: ${id}`, get().projects.find(p => p.id === photo.projectId)?.name, photo.review?.status ?? 'PENDING', status);
      },
      deletePhoto: (id) => {
        const photo = get().photos.find(p => p.id === id);
        if (!photo) return;
        const actor = assertProjectAccess(get(), photo.projectId, ['SUPERADMIN', 'CONTRACTOR', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        if (actor.role !== 'SUPERADMIN' && photo.uploadedById !== actor.id) throw new Error('Only the uploader or superadmin can delete evidence.');
        set(s => ({ photos: s.photos.filter(p => p.id !== id) }));
        get().logAction(`Deleted site photograph ${id}`, get().projects.find(p => p.id === photo.projectId)?.name);
      },

      submitMilestone: (id, claimedValue) => {
        const m = get().milestones.find((x) => x.id === id);
        if (!m) return;
        const nextStatus: Milestone['status'] = m.inspectionRequired ? 'INSPECTION_PENDING' : 'SUBMITTED_FOR_VERIFICATION';
        set((s) => ({ milestones: s.milestones.map((x) => (x.id === id ? { ...x, status: nextStatus, claimedValue, actualStart: x.actualStart ?? new Date().toISOString().slice(0, 10) } : x)) }));
        const project = get().projects.find((p) => p.id === m.projectId);
        get().logAction(`Submitted milestone "${m.name}" for verification`, project?.name, m.status, nextStatus);
        get().pushNotification({ message: `Milestone "${m.name}" submitted for verification — ${project?.name}.`, type: 'INFO', projectId: m.projectId, targetRoles: ['EXECUTIVE_ENGINEER', 'DEPUTY_ENGINEER'] });
      },
      requestMilestoneCorrection: (id, notes) => {
        const m = get().milestones.find((x) => x.id === id);
        if (!m) return;
        set((s) => ({ milestones: s.milestones.map((x) => (x.id === id ? { ...x, status: 'CORRECTION_REQUIRED', comments: notes } : x)) }));
        const project = get().projects.find((p) => p.id === m.projectId);
        get().logAction(`Requested correction on milestone "${m.name}": ${notes}`, project?.name, m.status, 'CORRECTION_REQUIRED');
        get().pushNotification({ message: `Correction required on milestone "${m.name}" — ${project?.name}.`, type: 'WARNING', projectId: m.projectId, targetRoles: ['CONTRACTOR'] });
      },
      verifyMilestone: (id) => {
        const m = get().milestones.find((x) => x.id === id);
        if (!m) return;
        set((s) => ({ milestones: s.milestones.map((x) => (x.id === id ? { ...x, status: 'VERIFIED' } : x)) }));
        const project = get().projects.find((p) => p.id === m.projectId);
        get().logAction(`Field-verified milestone "${m.name}"`, project?.name, m.status, 'VERIFIED');
      },
      certifyMilestone: (id, certifiedValue) => {
        const m = get().milestones.find((x) => x.id === id);
        if (!m) return;
        set((s) => ({ milestones: s.milestones.map((x) => (x.id === id ? { ...x, status: 'CERTIFIED', certifiedValue, actualDate: x.actualDate ?? new Date().toISOString().slice(0, 10) } : x)) }));
        const project = get().projects.find((p) => p.id === m.projectId);
        get().logAction(`Certified milestone "${m.name}" (₹${certifiedValue.toLocaleString('en-IN')})`, project?.name, m.status, 'CERTIFIED');
        get().pushNotification({ message: `Milestone "${m.name}" certified — ${project?.name}.`, type: 'INFO', projectId: m.projectId, targetRoles: ['COMMISSIONER', 'CONTRACTOR'] });
      },
      markMilestoneBillEligible: (id) => {
        const m = get().milestones.find((x) => x.id === id);
        if (!m) return;
        set((s) => ({ milestones: s.milestones.map((x) => (x.id === id ? { ...x, status: 'BILL_ELIGIBLE' } : x)) }));
        const project = get().projects.find((p) => p.id === m.projectId);
        get().logAction(`Marked milestone "${m.name}" bill-eligible`, project?.name, 'CERTIFIED', 'BILL_ELIGIBLE');
      },
      markMilestonePaid: (id) => {
        const m = get().milestones.find((x) => x.id === id);
        if (!m) return;
        set((s) => ({ milestones: s.milestones.map((x) => (x.id === id ? { ...x, status: 'PAID' } : x)) }));
        const project = get().projects.find((p) => p.id === m.projectId);
        get().logAction(`Payment released for milestone "${m.name}"`, project?.name, 'BILL_ELIGIBLE', 'PAID');
      },

      raiseChangeOrder: (c) => {
        assertProjectAccess(get(), c.projectId, ['CONTRACTOR', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        set((s) => ({ changeOrders: [{ ...c, id: nid('CHG'), status: 'PENDING_APPROVAL' }, ...s.changeOrders] }));
        const project = get().projects.find((p) => p.id === c.projectId);
        get().logAction(`Raised change order: ${c.title}`, project?.name);
      },
      decideChangeOrder: (id, status) => {
        const original = get().changeOrders.find(c => c.id === id);
        assertProjectAccess(get(), original?.projectId ?? '', ['COMMISSIONER']);
        if (original?.status !== 'PENDING_APPROVAL') throw new Error('This decision has already been recorded.');
        if (status === 'APPROVED' && !activeControls(get(), original.projectId).some(r => r.kind === 'VARIATION' && r.reference === id)) throw new Error('Verify the signed variation in Contract controls using this record ID as the reference.');
        set((s) => ({ changeOrders: s.changeOrders.map((c) => (c.id === id ? { ...c, status, approvedBy: get().currentUser?.name, approvedDate: new Date().toISOString().slice(0, 10) } : c)) }));
        const c = get().changeOrders.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === c?.projectId);
        get().logAction(`${status === 'APPROVED' ? 'Approved' : 'Rejected'} change order: ${c?.title}`, project?.name);
      },
      raiseExtensionOfTime: (e) => {
        assertProjectAccess(get(), e.projectId, ['CONTRACTOR', 'DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        set((s) => ({ extensionsOfTime: [{ ...e, id: nid('EOT'), status: 'PENDING' }, ...s.extensionsOfTime] }));
        const project = get().projects.find((p) => p.id === e.projectId);
        get().logAction(`Requested extension of time (${e.daysRequested} days)`, project?.name);
      },
      decideExtensionOfTime: (id, status, approvedDays) => {
        const original = get().extensionsOfTime.find(e => e.id === id);
        assertProjectAccess(get(), original?.projectId ?? '', ['COMMISSIONER']);
        if (!original || !['PENDING', 'RECOMMENDED'].includes(original.status)) throw new Error('This decision has already been recorded.');
        if (status === 'APPROVED' && !activeControls(get(), original.projectId).some(r => r.kind === 'EXTENSION' && r.reference === id && Number(r.fields.scheduleDays) === (approvedDays ?? original.daysRequested))) throw new Error('Verify the signed extension in Contract controls using this record ID as the reference.');
        set((s) => ({ extensionsOfTime: s.extensionsOfTime.map((e) => (e.id === id ? { ...e, status, approvedDays: status === 'APPROVED' ? (approvedDays ?? e.daysRequested) : undefined, approvedDate: new Date().toISOString().slice(0, 10) } : e)) }));
        const e = get().extensionsOfTime.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === e?.projectId);
        get().logAction(`${status === 'APPROVED' ? 'Approved' : 'Rejected'} extension of time`, project?.name);

      },
      raiseSiteIssue: (i) => {
        assertProjectAccess(get(), i.projectId);
        set((s) => ({ siteIssues: [{ ...i, id: nid('ISS'), status: 'OPEN' }, ...s.siteIssues] }));
        const project = get().projects.find((p) => p.id === i.projectId);
        get().logAction(`Raised site issue: ${i.description}`, project?.name);
      },
      resolveSiteIssue: (id) => {
        set((s) => ({ siteIssues: s.siteIssues.map((i) => (i.id === id ? { ...i, status: 'RESOLVED', resolvedDate: new Date().toISOString().slice(0, 10) } : i)) }));
        const i = get().siteIssues.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === i?.projectId);
        get().logAction(`Resolved site issue: ${i?.description}`, project?.name);
      },
      addDecision: (d) => {
        set((s) => ({ decisions: [{ ...d, id: nid('DEC'), status: 'PENDING' }, ...s.decisions] }));
        const project = get().projects.find((p) => p.id === d.projectId);
        get().logAction(`Logged decision required: ${d.decisionRequired}`, project?.name);
      },
      resolveDecision: (id, outcome, attachments = []) => {
        const previous = get();
        const d = previous.decisions.find((x) => x.id === id);
        if (!d) throw new Error('This decision could not be found.');
        if (d.status !== 'PENDING') throw new Error('This decision has already been recorded.');
        const project = get().projects.find((p) => p.id === d?.projectId);
        const audit: AuditEntry = {
          id: nid('AUD'), user: previous.currentUser?.name ?? 'System', role: previous.currentUser?.role ?? 'COMMISSIONER',
          action: `Decision recorded: ${d.decisionRequired} — ${outcome}`, project: project?.name, timestamp: new Date().toISOString(),
        };
        try {
          set({
            decisions: previous.decisions.map(item => item.id === id ? { ...item, status: 'DECIDED', decisionOutcome: outcome, attachments, decidedDate: new Date().toISOString().slice(0, 10) } : item),
            auditLog: [audit, ...previous.auditLog],
          });
        } catch {
          // Persist updates memory before writing storage; restore the pending record on failure.
          try { set({ decisions: previous.decisions, auditLog: previous.auditLog }); } catch { /* Memory is restored even if storage remains unavailable. */ }
          throw new Error('Decision could not be saved on this device. Free some storage and try again.');
        }
      },

      scheduleInspection: (i) => {
        const actor = assertProjectAccess(get(), i.projectId);
        if (!canReviewInspection(actor)) throw new Error('Only EE may assign an inspection to JE.');
        const request = i.sourceRequestId ? get().inspectionAppointments.find(a => a.id === i.sourceRequestId) : undefined;
        if (i.sourceRequestId && (!request || request.projectId !== i.projectId || request.status !== 'REQUESTED' || request.linkedInspectionId)) throw new Error('This inspection request is no longer awaiting allocation.');
        const assignee = inspectionAssignee(get(), i.projectId, i.assignedToId ?? '');
        if (!i.scheduledDate || !i.scheduledTime || !i.location?.trim() || !i.scope?.trim()) throw new Error('Enter the inspection date, time, site location and scope.');
        const warning = drawingWarning(get(), i.projectId, i.drawingId); if (warning) throw new Error(warning);
        const insp: Inspection = {
          id: nid('INS'), status: 'SCHEDULED', items: [], score: 0, overallResult: 'NOT_INSPECTED', isReinspection: false, ...i,
          assignedToId: assignee.id, assignedRole: assignee.role, inspector: assignee.name, createdById: actor.id,
          assignmentHistory: [{ assignedToId: assignee.id, assignedToName: assignee.name, role: assignee.role, assignedBy: actor.name, date: new Date().toISOString(), reason: 'Initial allocation' }],
        };
        set((s) => ({ inspections: [insp, ...s.inspections], inspectionAppointments: s.inspectionAppointments.map(a => a.id === request?.id ? { ...a, status: 'SCHEDULED', date: insp.scheduledDate, time: insp.scheduledTime!, assignedInspector: assignee.name, assignedInspectorId: assignee.id, assignedBy: actor.name, assignedById: actor.id, linkedInspectionId: insp.id } : a) }));
        const project = get().projects.find((p) => p.id === i.projectId);
        get().logAction(`Scheduled ${i.category.replace('_', ' ')} inspection`, project?.name);
        get().pushNotification({ message: `${i.category.replace('_', ' ')} inspection scheduled for ${project?.name}.`, type: 'INFO', projectId: i.projectId, targetRoles: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', ...(request ? ['CONTRACTOR' as const] : [])] });
        return insp;
      },
      startInspection: (id) => {
        const inspection = assertInspectionOperator(get(), id);
        if (!['SCHEDULED', 'IN_PROGRESS', 'REVERIFY'].includes(inspection.status)) throw new Error('This inspection is awaiting review or completed.');
        set(s => ({ inspections: s.inspections.map(i => i.id === id ? { ...i, status: 'IN_PROGRESS' } : i) }));
      },
      assignInspection: (id, userId, reason) => {
        const inspection = get().inspections.find(i => i.id === id);
        if (!inspection) throw new Error('Inspection not found.');
        const reviewer = assertProjectAccess(get(), inspection.projectId);
        if (!canReviewInspection(reviewer)) throw new Error('Only EE may reassign inspections.');
        if (!['SCHEDULED', 'REVERIFY'].includes(inspection.status)) throw new Error('Only scheduled or returned inspections may be reassigned.');
        if (!reason.trim()) throw new Error('Enter a reason for reassignment.');
        const actor = get().currentUser!;
        const assignee = inspectionAssignee(get(), inspection.projectId, userId);
        set(s => ({ inspections: s.inspections.map(i => i.id === id ? { ...i, assignedToId: assignee.id, assignedRole: assignee.role, inspector: assignee.name, assignmentHistory: [...(i.assignmentHistory ?? []), { assignedToId: assignee.id, assignedToName: assignee.name, role: assignee.role, assignedBy: actor.name, date: new Date().toISOString(), reason: reason.trim() }] } : i) }));
        get().logAction(`Assigned inspection ${id} to ${assignee.name}: ${reason.trim()}`);
        get().pushNotification({ message: `Inspection ${id} assigned to ${assignee.name}.`, type: 'INFO', projectId: inspection.projectId, targetRoles: [assignee.role] });
      },
      setInspectionDocuments: (id, attachments) => {
        const insp = assertInspectionOperator(get(), id);
        if (insp.status !== 'IN_PROGRESS') throw new Error('Start the inspection before attaching documents.');
        if (attachments.length > 5 || attachments.some(file => file.mimeType !== 'application/pdf' || !file.size || file.size > 5 * 1024 * 1024)) throw new Error('Upload 1 to 5 PDF documents, up to 5 MB each.');
        set(s => ({ inspections: s.inspections.map(i => i.id === id ? { ...i, attachments } : i) }));
      },
      setInspectionPhotos: (id, photos) => {
        const insp = assertInspectionOperator(get(), id);
        if (insp.status !== 'IN_PROGRESS') throw new Error('Start the inspection before attaching photos.');
        set(s => ({ inspections: s.inspections.map(i => i.id === id ? { ...i, photos } : i) }));
      },
      submitInspection: (id, items, result, comments) => {
        const original = assertInspectionOperator(get(), id);
        if (original.status !== 'IN_PROGRESS') throw new Error('Start the inspection before submitting.');
        if (!items.length || items.some(i => i.result === 'NOT_INSPECTED' || (i.result !== 'PASS' && !i.remarks.trim()))) throw new Error('Record every result, with comments for items that did not pass.');
        if (!original.attachments?.length) throw new Error('Upload supporting documents before submitting.');
        const computed = items.some(i => i.result === 'FAIL') ? 'FAIL' : items.some(i => i.result === 'CONDITIONAL') ? 'CONDITIONAL' : 'PASS';
        if (result !== computed) throw new Error('Inspection result must match the checklist findings.');
        const score = Math.round(items.filter(i => i.result === 'PASS').length / items.length * 100);
        set(s => ({ inspections: s.inspections.map(i => i.id === id ? { ...i, items, overallResult: result, score, comments, status: 'PENDING_REVIEW' } : i) }));
        get().logAction('Submitted inspection ' + id + ' for review');
        get().pushNotification({ message: 'Inspection ' + id + ' is ready for review.', type: 'INFO', projectId: original.projectId, targetRoles: ['EXECUTIVE_ENGINEER'] });
      },
      reviewInspection: (id, decision, comments) => {
        const insp = get().inspections.find(i => i.id === id);
        if (!insp) throw new Error('Inspection not found.');
        const actor = assertProjectAccess(get(), insp.projectId);
        if (!canReviewInspection(actor)) throw new Error('Only EE may review inspections.');
        if (insp.status !== 'PENDING_REVIEW') throw new Error('Only submitted inspections can be reviewed.');
        if (!['APPROVE', 'RAISE_DEFECT', 'REVERIFY'].includes(decision)) throw new Error('Invalid review decision.');
        if (decision !== 'APPROVE' && !comments.trim()) throw new Error('Enter a reason for the defect or reverification.');
        if (decision === 'APPROVE') {
          if (insp.overallResult !== 'PASS') throw new Error('Only passing findings may be approved. Raise a defect or request reverification.');
          requireQualityProof(get(), insp.projectId, id);
          if (insp.isReinspection && !activeControls(get(), insp.projectId).some(r => r.kind === 'QUALITY' && r.fields.inspectionId === id && r.fields.defectId === insp.sourceDefectId && r.fields.result === 'PASS')) throw new Error('Verified evidence must reference this reinspection and its defect.');
        }
        if (decision === 'RAISE_DEFECT' && insp.sourceDefectId) {
          set(s => ({ defects: s.defects.map(d => d.id === insp.sourceDefectId ? { ...d, status: 'OPEN', closedDate: undefined, description: d.description + '\nReinspection: ' + comments.trim() } : d) }));
        } else if (decision === 'RAISE_DEFECT') {
          get().createDefect({ projectId: insp.projectId, location: insp.location || 'Inspection site', category: insp.category, severity: 'HIGH', description: comments.trim() + '\n' + insp.items.filter(i => i.result !== 'PASS').map(i => i.requirement + ': ' + i.remarks).join('\n'), imageSeed: 0, reportedBy: actor.name, contractorId: get().projects.find(p => p.id === insp.projectId)?.contractorId ?? '', dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), sourceInspectionId: id });
        }
        const date = new Date().toISOString();
        set(s => ({ inspections: s.inspections.map(i => i.id === id ? { ...i, overallResult: decision === 'RAISE_DEFECT' ? 'FAIL' : i.overallResult, status: decision === 'REVERIFY' ? 'REVERIFY' : 'COMPLETED', completedDate: decision === 'REVERIFY' ? undefined : date.slice(0, 10), reviewHistory: [...(i.reviewHistory ?? []), { decision, reviewer: actor.name, date, comments: comments.trim(), items: i.items.map(item => ({ ...item })), photos: [...(i.photos ?? [])], attachments: [...(i.attachments ?? [])], findings: i.comments }], ...(decision === 'REVERIFY' ? { photos: [], attachments: [], items: [], comments: '', score: 0, overallResult: 'NOT_INSPECTED' as const } : {}) } : i), inspectionAppointments: s.inspectionAppointments.map(a => a.linkedInspectionId === id ? { ...a, status: decision === 'REVERIFY' ? 'SCHEDULED' : 'COMPLETED' } : a) }));
        if (decision === 'APPROVE' && insp.isReinspection) {
          set(s => ({ defects: s.defects.map(d => d.id === insp.sourceDefectId && d.sourceInspectionId === insp.parentInspectionId && d.status === 'REINSPECTION' ? { ...d, status: 'CLOSED', closedDate: date.slice(0, 10) } : d) }));
        }
        get().logAction('Inspection ' + id + ': ' + decision + ' - ' + comments.trim());
        get().pushNotification({ message: 'Inspection ' + id + ': ' + decision + '. ' + comments.trim(), type: 'INFO', projectId: insp.projectId, targetRoles: ['DEPUTY_ENGINEER'] });
      },
      reinspect: (defectId) => {
        const defect = get().defects.find((d) => d.id === defectId);
        const src = get().inspections.find((i) => i.id === defect?.sourceInspectionId);
        if (!defect || !src || defect.status !== 'FIXED') throw new Error('A fixed defect with a source inspection is required.');
        assertProjectAccess(get(), src.projectId);
        if (!canReviewInspection(get().currentUser)) throw new Error('Only EE may allocate reinspection.');
        const insp: Inspection = {
          id: nid('INS'), projectId: defect!.projectId, category: defect?.category ?? 'STRUCTURAL',
          scheduledDate: new Date().toISOString().slice(0, 10), inspector: src?.inspector ?? 'Deputy Engineer',
          status: 'SCHEDULED', items: [], score: 0, overallResult: 'NOT_INSPECTED', comments: '',
          isReinspection: true, parentInspectionId: src?.id, sourceDefectId: defect.id,
          assignedToId: src.assignedToId, assignedRole: src.assignedRole, createdById: get().currentUser!.id,
          location: src.location, scope: src.scope, instructions: src.instructions, requiredDocuments: src.requiredDocuments, drawingId: src.drawingId,
        };
        set((s) => ({ inspections: [insp, ...s.inspections], defects: s.defects.map((d) => (d.id === defectId ? { ...d, status: 'REINSPECTION' } : d)) }));
        const project = get().projects.find((p) => p.id === insp.projectId);
        get().logAction(`Started re-inspection for defect ${defectId}`, project?.name);
        return insp;
      },
      passReinspection: (id, items, comments) => {
        const insp = get().inspections.find(i => i.id === id);
        if (!insp?.isReinspection) throw new Error('Reinspection not found.');
        get().submitInspection(id, items ?? insp.items, 'PASS', comments ?? '');
      },

      declineInspectionRequest: (id, reason) => {
        const request = get().inspectionAppointments.find(a => a.id === id);
        const actor = assertProjectAccess(get(), request?.projectId ?? '');
        if (!canReviewInspection(actor)) throw new Error('Only EE may review inspection requests.');
        if (!request || request.status !== 'REQUESTED' || request.linkedInspectionId) throw new Error('This request is no longer pending.');
        if (!reason.trim()) throw new Error('Enter a reason for declining the request.');
        set(s => ({ inspectionAppointments: s.inspectionAppointments.map(a => a.id === id ? { ...a, status: 'CANCELLED', reviewReason: reason.trim(), assignedBy: actor.name, assignedById: actor.id } : a) }));
        get().logAction('Declined inspection request ' + id + ': ' + reason.trim());
        get().pushNotification({ message: 'Inspection request declined: ' + reason.trim(), type: 'INFO', projectId: request.projectId, targetRoles: [request.requestedByRole] });
      },
      requestAppointment: (a) => {
        const actor = assertProjectAccess(get(), a.projectId);
        if (!['CONTRACTOR', 'DEPUTY_ENGINEER'].includes(actor.role)) throw new Error('Only an assigned contractor or JE may request a site inspection.');
        if (!INSPECTION_CATEGORIES.includes(a.inspectionType) || !/^\d{4}-\d{2}-\d{2}$/.test(a.date) || !Number.isFinite(Date.parse(a.date)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time) || !a.site.trim() || !a.remarks.trim()) throw new Error('Enter inspection type, preferred date and time, location and scope.');
        if (!get().projects.find(p => p.id === a.projectId)?.executiveEngineerId) throw new Error('No EE is assigned to this hospital.');
        const appt: InspectionAppointment = { ...a, linkedInspectionId: undefined, assignedInspector: undefined, assignedInspectorId: undefined, assignedBy: undefined, assignedById: undefined, reviewReason: undefined, requestedBy: actor.name, requestedById: actor.id, requestedByRole: actor.role, id: nid('APT'), status: 'REQUESTED' };
        set((s) => ({ inspectionAppointments: [appt, ...s.inspectionAppointments] }));
        const project = get().projects.find((p) => p.id === a.projectId);
        get().logAction(`Requested ${a.inspectionType.replace(/_/g, ' ')} inspection appointment`, project?.name);
        get().pushNotification({ message: `${a.inspectionType.replace(/_/g, ' ')} inspection requested — ${project?.name}.`, type: 'INFO', projectId: a.projectId, targetRoles: ['EXECUTIVE_ENGINEER'] });
        return appt;
      },
      scheduleAppointment: (id, date, time, _inspector) => {
        const appointment = get().inspectionAppointments.find(a => a.id === id);
        const actor = assertProjectAccess(get(), appointment?.projectId ?? '');
        if (appointment?.requestedByRole === 'CONTRACTOR') throw new Error('EE must allocate contractor requests through the inspection request inbox.');
        if (actor.role !== 'DEPUTY_ENGINEER') throw new Error('Only JE may schedule this appointment.');
        const project = get().projects.find(p => p.id === appointment?.projectId);
        const assigned = get().users.find(user => user.id === project?.siteEngineerId && user.role === 'DEPUTY_ENGINEER');
        if (!assigned) throw new Error('No Junior Engineer is assigned to this hospital.');
        set((s) => ({ inspectionAppointments: s.inspectionAppointments.map((a) => (a.id === id ? { ...a, status: 'SCHEDULED', date, time, assignedInspector: assigned.name, assignedInspectorId: assigned.id, assignedById: s.currentUser!.id, assignedBy: s.currentUser!.name } : a)) }));
        const a = get().inspectionAppointments.find((x) => x.id === id);
        get().logAction(`Scheduled inspection appointment for ${date} ${time}`, project?.name);
        get().pushNotification({ message: `Inspection scheduled for ${date} — ${project?.name}.`, type: 'INFO', projectId: a?.projectId, targetRoles: ['CONTRACTOR', 'DEPUTY_ENGINEER'] });
      },
      rescheduleAppointment: (id, date, time, remarks) => {
        const request = get().inspectionAppointments.find(a => a.id === id);
        if (request?.requestedByRole === 'CONTRACTOR' || request?.linkedInspectionId) throw new Error('Use the EE inspection request review workflow for this appointment.');
        assertJuniorInspectionAccess(get(), get().inspectionAppointments.find(a => a.id === id)?.projectId ?? '');
        set((s) => ({ inspectionAppointments: s.inspectionAppointments.map((a) => (a.id === id ? { ...a, status: 'RESCHEDULED', date, time, remarks } : a)) }));
        const a = get().inspectionAppointments.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === a?.projectId);
        get().logAction(`Rescheduled inspection appointment to ${date} ${time}`, project?.name);
      },
      cancelAppointment: (id, remarks) => {
        const request = get().inspectionAppointments.find(a => a.id === id);
        if (request?.requestedByRole === 'CONTRACTOR' || request?.linkedInspectionId) throw new Error('Use the EE inspection request review workflow for this appointment.');
        assertJuniorInspectionAccess(get(), get().inspectionAppointments.find(a => a.id === id)?.projectId ?? '');
        set((s) => ({ inspectionAppointments: s.inspectionAppointments.map((a) => (a.id === id ? { ...a, status: 'CANCELLED', remarks } : a)) }));
        const a = get().inspectionAppointments.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === a?.projectId);
        get().logAction(`Cancelled inspection appointment`, project?.name);
      },
      completeAppointment: (id) => {
        const request = get().inspectionAppointments.find(a => a.id === id);
        if (request?.requestedByRole === 'CONTRACTOR' || request?.linkedInspectionId) throw new Error('Use the EE inspection request review workflow for this appointment.');
        assertJuniorInspectionAccess(get(), get().inspectionAppointments.find(a => a.id === id)?.projectId ?? '');
        set((s) => ({ inspectionAppointments: s.inspectionAppointments.map((a) => (a.id === id ? { ...a, status: 'COMPLETED' } : a)) }));
        const a = get().inspectionAppointments.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === a?.projectId);
        get().logAction(`Marked inspection appointment completed`, project?.name);
      },

      createDefect: (d) => {
        if (['CONTRACTOR', 'SITE_SUPERVISOR'].includes(get().currentUser?.role ?? '') && d.sourceInspectionId) {
          const source = assertInspectionOperator(get(), d.sourceInspectionId);
          if (source.projectId !== d.projectId || source.overallResult !== 'FAIL') throw new Error('A failed assigned inspection is required.');
        } else assertProjectAccess(get(), d.projectId, ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        const defect: Defect = { ...d, id: nid('DEF'), status: 'OPEN', createdDate: new Date().toISOString().slice(0, 10) };
        set((s) => ({ defects: [defect, ...s.defects] }));
        return defect;
      },
      assignDefect: (id, pocId) => {
        set((s) => ({ defects: s.defects.map((d) => (d.id === id ? { ...d, status: 'ASSIGNED', assignedPocId: pocId ?? d.assignedPocId } : d)) }));
        const d = get().defects.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === d?.projectId);
        get().logAction(`Assigned defect ${id} to contractor`, project?.name);
        get().pushNotification({ message: `Defect ${id} assigned — awaiting contractor acknowledgement.`, type: 'INFO', projectId: d?.projectId, targetRoles: ['CONTRACTOR'] });
      },
      acknowledgeDefect: (id) => {
        set((s) => ({ defects: s.defects.map((d) => (d.id === id ? { ...d, acknowledgedDate: new Date().toISOString().slice(0, 10) } : d)) }));
        const d = get().defects.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === d?.projectId);
        get().logAction(`Contractor acknowledged defect ${id}`, project?.name);
      },
      updateDefectStatus: (id, status) => {
        const original = get().defects.find(d => d.id === id);
        assertProjectAccess(get(), original?.projectId ?? '', ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER']);
        if (status === 'CLOSED') { get().closeDefect(id); return; }
        set((s) => ({ defects: s.defects.map((d) => (d.id === id ? { ...d, status } : d)) }));
        const d = get().defects.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === d?.projectId);
        get().logAction(`Updated defect ${id} status to ${status.replace('_', ' ')}`, project?.name);
      },
      addCorrectiveAction: (id, notes, photoSeed) => {
        assertProjectAccess(get(), get().defects.find(d => d.id === id)?.projectId ?? '', ['CONTRACTOR']);
        set((s) => ({ defects: s.defects.map((d) => (d.id === id ? { ...d, status: 'FIXED', correctiveActionNotes: notes, correctiveActionPhotoSeed: photoSeed } : d)) }));
        const d = get().defects.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === d?.projectId);
        get().logAction(`Contractor uploaded corrective-action evidence for defect ${id}`, project?.name);
        get().pushNotification({ message: `Corrective action submitted for defect ${id} — ready for re-inspection.`, type: 'INFO', projectId: d?.projectId, targetRoles: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'] });
      },
      closeDefect: (id) => {
        const original = get().defects.find(d => d.id === id);
        assertProjectAccess(get(), original?.projectId ?? '', ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER']);
        const proof = activeControls(get(), original!.projectId).find(r => r.kind === 'QUALITY' && r.fields.defectId === id && r.fields.result === 'PASS');
        if (!original?.correctiveActionNotes?.trim() || !proof) throw new Error('Corrective action and independently verified reinspection evidence are required.');
        set((s) => ({ defects: s.defects.map((d) => (d.id === id ? { ...d, status: 'CLOSED', closedDate: new Date().toISOString().slice(0, 10) } : d)) }));
        const d = get().defects.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === d?.projectId);
        get().logAction(`Closed defect ${id}`, project?.name);
      },

      addContractor: (c) => set((s) => ({ contractors: [{ ...c, id: nid('CNT') }, ...s.contractors] })),
      assignContractorToProject: (contractorId, projectId) => {
        set((s) => ({
          contractors: s.contractors.map((c) => (c.id === contractorId ? { ...c, assignedProjectIds: [...new Set([...c.assignedProjectIds, projectId])] } : c)),
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, contractorId } : p)),
        }));
        const project = get().projects.find((p) => p.id === projectId);
        get().logAction('Assigned contractor to project', project?.name);
      },
      addWorker: (w) => {
        assertProjectAccess(get(), w.projectId, ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER']);
        set((s) => ({ workers: [{ ...w, id: nid('WRK') }, ...s.workers] }));
        const project = get().projects.find((p) => p.id === w.projectId);
        get().logAction(`Added worker ${w.name} (${w.role})`, project?.name);
      },
      markAttendance: (workerId, projectId, method) => {
        const actor = get().currentUser;
        if (actor?.role === 'WORKFORCE') {
          if (actor.workerId !== workerId || !get().workers.some(w => w.id === workerId && w.projectId === projectId)) throw new Error('You can mark only your own attendance at your assigned site.');
        } else assertProjectAccess(get(), projectId, ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'SUPERADMIN']);
        if (!get().workers.some(w => w.id === workerId && w.projectId === projectId)) throw new Error('Worker does not belong to this hospital.');
        if (get().attendance.some(a => a.workerId === workerId && a.date === todayDate())) return;
        const now = new Date();
        const rec: AttendanceRecord = {
          id: nid('ATT'), workerId, projectId, date: todayDate(),
          checkIn: now.toTimeString().slice(0, 5), method: actor?.role === 'WORKFORCE' ? 'MANUAL' : method, shift: get().workers.find(w => w.id === workerId)!.shift,
        };
        set((s) => ({ attendance: [rec, ...s.attendance], workers: s.workers.map((w) => (w.id === workerId ? { ...w, attendanceStatus: 'PRESENT' } : w)) }));
        const project = get().projects.find((p) => p.id === projectId);
        get().logAction(`Marked attendance via ${method}`, project?.name);
      },

      submitBill: async (b) => {
        const validate = () => {
          const state = get();
          validateBillSubmission(b, state.currentUser, state.projects.find((p) => p.id === b.projectId), computeProjectScope(state.currentUser, state.projects, state.contractors).projectIds, state.bills);
          validateBillMeasurements(state, b);
        };
        validate();
        const submitterId = get().currentUser!.id;
        for (const attachment of b.attachments!) {
          const file = await readBillFile(attachment.id);
          if (file.size !== attachment.size || file.type !== attachment.mimeType) throw new Error('The attached evidence does not match the submitted file details.');
        }
        validate();
        if (get().currentUser!.id !== submitterId) throw new Error('Your account changed. Reopen the bill form.');
        const bill: Bill = { ...b, billNumber: b.billNumber.trim(), submittedById: submitterId, id: nid('BIL'), status: 'SUBMITTED', submittedDate: todayDate() };
        const project = get().projects.find((p) => p.id === b.projectId);
        const approval: ApprovalRequest = {
          id: nid('APR'), status: 'PENDING', currentStepIndex: 0, history: [],
          type: 'RA_BILL', projectId: b.projectId, amount: bill.netPayable, submittedBy: get().currentUser!.name,
          submittedDate: bill.submittedDate, documents: bill.attachments!.map((file) => file.name), comments: `RA Bill ${bill.billNumber}; MB ${bill.measurementBookId}`,
          chain: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'COMMISSIONER'], relatedBillId: bill.id,
        };
        const measurementRows: MeasurementEntry[] = bill.measurementLines!.map(line => {
          const item = get().boqItems.find(b => b.id === line.boqItemId)!;
          const previousQty = previousClaimedQuantity(get(), bill.projectId, item.id);
          return { id: nid('MEA'), projectId: bill.projectId, billId: bill.id, boqItemId: item.id, workItem: item.item, unit: item.unit, previousQty, currentQty: line.quantity, totalQty: previousQty + line.quantity, rate: item.rate, amount: Math.round(line.quantity * item.rate * 100) / 100, verified: false, location: line.location, measurementReference: line.measurementReference };
        });
        const previous = { bills: get().bills, approvals: get().approvals, measurements: get().measurements };
        try { set((s) => ({ bills: [bill, ...s.bills], approvals: [approval, ...s.approvals], measurements: [...s.measurements, ...measurementRows] })); }
        catch { try { set(previous); } catch { /* In-memory state is restored even if persistence is full. */ } throw new Error('The bill could not be saved. Free device storage and try again.'); }
        try { get().logAction(`Submitted RA Bill ${bill.billNumber}`, project?.name); } catch { /* The bill and approval have already been saved. */ }
        return bill;
      },
      verifyBillSite: (id) => {
        assertBillReviewer(get(), id, ['DEPUTY_ENGINEER']);
        const rows = get().measurements.filter(m => m.billId === id);
        if (!rows.length || rows.some(m => !m.verified)) throw new Error('Verify each measurement line before site certification.');
        if (get().bills.find((b) => b.id === id)?.status !== 'SUBMITTED') return;
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'SITE_VERIFIED', siteVerifiedBy: get().currentUser?.name } : b)) }));
        const b = get().bills.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === b?.projectId);
        get().logAction(`Site-verified bill ${b?.billNumber}`, project?.name);
      },
      verifyBillQuality: (id) => {
        assertBillReviewer(get(), id, ['EXECUTIVE_ENGINEER']);
        if (get().bills.find((b) => b.id === id)?.status !== 'SITE_VERIFIED') return;
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'QUALITY_VERIFIED', qualityVerifiedBy: get().currentUser?.name } : b)) }));
        const b = get().bills.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === b?.projectId);
        get().logAction(`Quality-verified bill ${b?.billNumber}`, project?.name);
      },
      approveBill: (id) => {
        assertBillReviewer(get(), id, ['EXECUTIVE_ENGINEER']);
        if (get().bills.find((b) => b.id === id)?.status !== 'QUALITY_VERIFIED') return;
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'APPROVED', approvedBy: get().currentUser?.name } : b)) }));
        const b = get().bills.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === b?.projectId);
        get().logAction(`Approved bill ${b?.billNumber}`, project?.name);
        get().pushNotification({ message: `Bill ${b?.billNumber} approved and pending payment.`, type: 'INFO', projectId: b?.projectId, targetRoles: ['COMMISSIONER'] });
      },
      rejectBill: (id, reason) => {
        assertBillReviewer(get(), id, ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'COMMISSIONER']);
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'REJECTED' } : b)) }));
        const b = get().bills.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === b?.projectId);
        get().logAction(`Rejected bill ${b?.billNumber}: ${reason}`, project?.name);
      },
      markBillPaid: (id) => {
        assertBillReviewer(get(), id, ['COMMISSIONER']);
        const b = get().bills.find((x) => x.id === id);
        if (b && b.status !== 'PAID') {
          const paid = actualTransactions(get(), b.projectId).filter(t => t.kind === 'PAYMENT' && t.fields.billId === id).reduce((n, t) => n + Number(t.fields.amount), 0);
          if (paid + 0.005 < b.netPayable) throw new Error('Record and independently verify the bank or treasury payment in Contract controls first.');
        }
        // Verified transaction reconciliation applies paid status atomically.
      },
      verifyMeasurement: (id, by) => {
        const state = get();
        const measurement = state.measurements.find((m) => m.id === id);
        if (!state.currentUser || !['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'].includes(state.currentUser.role) || !measurement || !computeProjectScope(state.currentUser, state.projects, state.contractors).projectIds.has(measurement.projectId)) throw new Error('Only an assigned engineer can verify measurements.');
        const bill = state.bills.find(b => b.id === measurement.billId);
        if (bill?.submittedById === state.currentUser.id || (bill && bill.status !== 'SUBMITTED')) throw new Error('Only an independent engineer can verify a submitted measurement.');
        set((s) => ({ measurements: s.measurements.map((m) => (m.id === id ? { ...m, verified: true, verifiedBy: state.currentUser!.name, verifiedById: state.currentUser!.id, verifiedAt: new Date().toISOString() } : m)) }));
        void by;
      },

      createApproval: (a) => {
        const req: ApprovalRequest = { ...a, id: nid('APR'), status: 'PENDING', currentStepIndex: 0, history: [] };
        set((s) => ({ approvals: [req, ...s.approvals] }));
      },
      decideApproval: (id, decision, comment) => {
        const req = get().approvals.find((a) => a.id === id);
        if (!req) return;
        const u = get().currentUser;
        if (req.relatedBillId) {
          assertBillReviewer(get(), req.relatedBillId, ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'COMMISSIONER']);
          if (req.status !== 'PENDING' || u?.role !== req.chain[req.currentStepIndex]) throw new Error('This bill is not awaiting your approval step.');
          if (decision === 'APPROVED' && u.role === 'DEPUTY_ENGINEER') {
            const rows = get().measurements.filter(m => m.billId === req.relatedBillId);
            if (!rows.length || rows.some(m => !m.verified)) throw new Error('Verify each measurement line before site certification.');
          }
        }
        const entry = { step: req.chain[req.currentStepIndex], approver: u?.name ?? 'Officer', designation: u?.designation ?? '', timestamp: new Date().toISOString(), decision, comment };
        let nextIndex = req.currentStepIndex;
        let status: ApprovalStatus = req.status;
        if (decision === 'APPROVED') {
          nextIndex = req.currentStepIndex + 1;
          status = nextIndex >= req.chain.length ? 'APPROVED' : 'PENDING';
        } else if (decision === 'REJECTED') status = 'REJECTED';
        else if (decision === 'SENT_BACK') { status = 'SENT_BACK'; nextIndex = 0; }
        else status = 'CLARIFICATION_REQUESTED';

        set((s) => ({
          approvals: s.approvals.map((a) => (a.id === id ? { ...a, status, currentStepIndex: nextIndex, history: [...a.history, entry] } : a)),
        }));
        const project = get().projects.find((p) => p.id === req.projectId);
        get().logAction(`${decision.replace('_', ' ')} approval request (${req.type.replace('_', ' ')})`, project?.name);

        if (req.relatedBillId) {
          const bill = get().bills.find((b) => b.id === req.relatedBillId);
          if (bill && decision === 'APPROVED') {
            const stepJustDone = req.chain[req.currentStepIndex];
            if (stepJustDone === 'DEPUTY_ENGINEER') get().verifyBillSite(bill.id);
            else if (stepJustDone === 'EXECUTIVE_ENGINEER') { get().verifyBillQuality(bill.id); get().approveBill(bill.id); }
            // Final approval authorizes payment; bank/treasury reconciliation records settlement.
          } else if (bill && decision === 'REJECTED') {
            get().rejectBill(bill.id, comment);
          }
        }
      },

      addMaterial: (m) => set((s) => ({ materials: [{ ...m, id: nid('MAT') }, ...s.materials] })),
      receiveMaterial: (id, qty) => {
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, receivedQty: m.receivedQty + qty, remainingQty: m.remainingQty + qty } : m)) }));
        const m = get().materials.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === m?.projectId);
        get().logAction(`Received ${qty} ${m?.unit} of ${m?.name}`, project?.name);
      },
      recordMaterialTest: (t) => {
        set((s) => ({ materialTests: [{ ...t, id: nid('MTS') }, ...s.materialTests] }));
        const project = get().projects.find((p) => p.id === t.projectId);
        get().logAction(`Recorded material test — ${t.material} (${t.result})`, project?.name);
      },

      addSafetyRecord: (sr) => {
        set((s) => ({ safetyRecords: [{ ...sr, id: nid('SAF') }, ...s.safetyRecords] }));
        const project = get().projects.find((p) => p.id === sr.projectId);
        get().logAction(`Logged safety record — ${sr.type.replace('_', ' ')}`, project?.name);
        if (sr.severity === 'CRITICAL') {
          get().pushNotification({ message: `Critical safety issue reported at ${project?.name}.`, type: 'CRITICAL', projectId: sr.projectId, targetRoles: ['EXECUTIVE_ENGINEER', 'COMMISSIONER', 'CIVIL_SURGEON'] });
        }
      },
      createRisk: (r) => {
        const score = r.probability * r.impact;
        const level = score >= 16 ? 'CRITICAL' : score >= 10 ? 'HIGH' : score >= 5 ? 'MEDIUM' : 'LOW';
        set((s) => ({ risks: [{ ...r, id: nid('RSK'), score, level }, ...s.risks] }));
        const project = get().projects.find((p) => p.id === r.projectId);
        get().logAction(`Added risk register entry: ${r.risk}`, project?.name);
      },
      updateRiskStatus: (id, status) => set((s) => ({ risks: s.risks.map((r) => (r.id === id ? { ...r, status } : r)) })),

      uploadDocument: (d) => {
        assertProjectAccess(get(), d.projectId);
        set((s) => ({ documents: [{ ...d, id: nid('DOC'), uploadDate: new Date().toISOString().slice(0, 10), version: 1, approvalStatus: 'PENDING' }, ...s.documents] }));
        const project = get().projects.find((p) => p.id === d.projectId);
        get().logAction(`Uploaded document — ${d.name}`, project?.name);
      },
      setDocumentStatus: (id, status) => {
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, approvalStatus: status } : d)) }));
        const doc = get().documents.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === doc?.projectId);
        get().logAction(`${status === 'APPROVED' ? 'Approved' : 'Reviewed'} document — ${doc?.name}`, project?.name);
      },

      updateCommissioningItem: (id, status, remarks) => {
        const original = get().commissioning.find(c => c.id === id);
        assertProjectAccess(get(), original?.projectId ?? '', ['EXECUTIVE_ENGINEER', 'DEPUTY_ENGINEER']);
        if (status === 'READY' && !activeControls(get(), original!.projectId).some(r => r.kind === 'CERTIFICATE' && r.category === 'Commissioning acceptance' && validControl(r))) throw new Error('Verify the commissioning acceptance certificate first.');
        set((s) => ({ commissioning: s.commissioning.map((c) => (c.id === id ? { ...c, status, remarks, updatedDate: new Date().toISOString().slice(0, 10) } : c)) }));
        const item = get().commissioning.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === item?.projectId);
        get().logAction(`Updated commissioning item "${item?.item}" to ${status.replace('_', ' ')}`, project?.name);
      },
      advanceHandoverStep: (id) => {
        const original = get().handoverSteps.find(h => h.id === id);
        assertProjectAccess(get(), original?.projectId ?? '', ['EXECUTIVE_ENGINEER', 'COMMISSIONER', 'CIVIL_SURGEON']);
        if (!original || original.status === 'COMPLETED') return;
        if (get().handoverSteps.some(h => h.projectId === original.projectId && h.order < original.order && h.status !== 'COMPLETED')) throw new Error('Complete the preceding handover step first.');
        if (!activeControls(get(), original.projectId).some(r => r.kind === 'CERTIFICATE' && r.category === 'Health authority acceptance' && validControl(r))) throw new Error('Verified receiving-authority acceptance is required.');
        set((s) => ({ handoverSteps: s.handoverSteps.map((h) => (h.id === id ? { ...h, status: 'COMPLETED', date: new Date().toISOString().slice(0, 10) } : h)) }));
        const step = get().handoverSteps.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === step?.projectId);
        get().logAction(`Completed handover step: ${step?.step}`, project?.name);
        if (step) {
          const remaining = get().handoverSteps.filter((h) => h.projectId === step.projectId);
          const idx = remaining.findIndex((h) => h.id === id);
          const next = remaining.find((h) => h.order === idx + 1);
          if (next && next.status === 'PENDING') {
            set((s) => ({ handoverSteps: s.handoverSteps.map((h) => (h.id === next.id ? { ...h, status: 'IN_PROGRESS' } : h)) }));
          }
        }
      },
      completeHandoverAndOperationalize: (projectId) => {
        assertProjectAccess(get(), projectId, ['EXECUTIVE_ENGINEER', 'COMMISSIONER', 'CIVIL_SURGEON']);
        const gaps = handoverGaps(get(), projectId);
        if (gaps.length) throw new Error(`Handover blocked: ${gaps.join(', ')}`);
        set(s => ({ projects: s.projects.map(p => p.id === projectId ? { ...p, status: 'COMPLETED', stage: 'OPERATIONAL', actualCompletionDate: todayDate() } : p) }));
        const project = get().projects.find((p) => p.id === projectId);
        get().logAction('Hospital marked OPERATIONAL — handover complete', project?.name);
        get().pushNotification({ message: `${project?.name} is now OPERATIONAL. Handover complete.`, type: 'INFO', projectId, targetRoles: ['COMMISSIONER', 'CIVIL_SURGEON', 'MEDICAL_OFFICER'] });
      },

      addObservation: (o) => {
        set((s) => ({ observations: [{ ...o, id: nid('OBS') }, ...s.observations] }));
        const project = get().projects.find((p) => p.id === o.projectId);
        get().logAction(`Added observation (${o.category})`, project?.name);
      },
      updateObservationStatus: (id, status) => set((s) => ({ observations: s.observations.map((o) => (o.id === id ? { ...o, status } : o)) })),

      markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      pushNotification: (n) => set((s) => ({ notifications: [{ ...n, id: nid('NOT'), read: false, date: new Date().toISOString().slice(0, 10) }, ...s.notifications] })),
    }),
    {
      name: 'hcms-maharashtra-store-v5',
      merge: (persisted, current) => {
        const saved = persisted as Partial<StoreState> | undefined;
        if (saved?.currentUser?.role === 'WORKFORCE') {
          const worker = (saved.workers ?? current.workers).find(w => w.id === saved.currentUser?.workerId);
          saved.currentUser = worker ? workforceAccount(worker) : null;
        }
        else if (saved?.currentUser?.role === 'CONTRACTOR') {
          const firm = (saved.contractors ?? current.contractors).find(c => c.id === saved.currentUser?.contractorId);
          const user = (saved.users ?? current.users).find(u => u.id === saved.currentUser?.id && u.role === 'CONTRACTOR');
          saved.currentUser = firm ? contractorAccount(firm, saved.projects ?? current.projects, user) : null;
        }
        else if (saved?.currentUser) {
          const user = (saved.users ?? current.users).find(u => u.id === saved.currentUser?.id && u.role === saved.currentUser?.role);
          saved.currentUser = user ?? null;
        }
        const merged = withPuneDemo({ ...current, ...saved, ...mergeDemoSamples({ ...current, ...saved }, current), currentUser: saved?.currentUser?.role === 'CONTRACTOR' && !saved.currentUser.contractorId ? null : saved?.currentUser ?? null, rolePermissions: { ...current.rolePermissions, ...saved?.rolePermissions, WORKFORCE: ['dashboard'], CONTRACTOR: (saved?.rolePermissions?.CONTRACTOR ?? current.rolePermissions.CONTRACTOR).filter(key => key !== 'workers') }, fundInstallments: saved?.fundInstallments ?? generateFundInstallments(saved?.projects ?? current.projects, todayDate()), puneDemoVersion: (saved as { puneDemoVersion?: number } | undefined)?.puneDemoVersion });
        if (merged.currentUser) {
          const account = merged.users.find(u => u.id === merged.currentUser!.id);
          const firm = merged.contractors.find(c => c.id === account?.contractorId);
          if (account) merged.currentUser = account.role === 'CONTRACTOR' && firm ? contractorAccount(firm, merged.projects, account) : account;
        }
        const controlRecords = withDemoFinance(merged.projects, seed.projects, merged.controlRecords);
        const users = proposalAccounts([...merged.users, ...current.users.filter(user => user.role === 'SITE_SUPERVISOR' && !merged.users.some(existing => existing.id === user.id))]);
        const photos = saved?.referencePhotosRestored ? merged.photos : [...merged.photos, ...seed.photos.filter(photo => !merged.photos.some(existing => existing.id === photo.id))];
        for (const role of ['MINISTER', 'COMMISSIONER', 'CHIEF_ENGINEER', 'SUPERINTENDING_ENGINEER', 'EXECUTIVE_ENGINEER', 'SUPERADMIN'] as Role[]) merged.rolePermissions[role] = [...new Set([...(merged.rolePermissions[role] ?? ROLE_NAV[role]), 'proposals'])];
        merged.rolePermissions.EXECUTIVE_ENGINEER = [...new Set([...merged.rolePermissions.EXECUTIVE_ENGINEER, 'tenders'])];
        return { ...merged, users, referencePhotosRestored: true, photos: photos.map(photo => ({ ...photo, isReference: !isRealSitePhoto(photo) })), controlRecords, projects: reconcileProjects(merged.projects, controlRecords) };
      },
      partialize: (state) => {
        const { logAction, login, logout, addProject, updateProject, setRoleNavAccess, updateUserRole, ...persisted } = state as any;
        return persisted;
      },
    },
  ),
);

function assertJuniorInspectionAccess(state: StoreState, projectId: string) {
  const actor = assertProjectAccess(state, projectId);
  if (actor.role !== 'DEPUTY_ENGINEER') throw new Error('Only a Junior Engineer may allocate inspections.');
}

function assertInspectionOperator(state: StoreState, id: string) {
  const inspection = state.inspections.find(i => i.id === id);
  if (!inspection) throw new Error('Inspection not found.');
  const actor = assertProjectAccess(state, inspection.projectId);
  if (!canManageInspection(actor, inspection)) throw new Error('Only the assigned Junior Engineer may conduct this inspection.');
  return inspection;
}

function inspectionAssignee(state: StoreState, projectId: string, userId: string) {
  const user = inspectionAccounts(state.users, state.projects, state.contractors).find(u => u.id === userId);
  if (!user || !inspectionAssignmentRoles(state.currentUser).includes(user.role) || !computeProjectScope(user, state.projects, state.contractors).projectIds.has(projectId)) throw new Error('Select an eligible assignee for this project.');
  return user;
}

export function assertProjectAccess(state: StoreState, projectId: string, roles?: Role[]) {
  if (!state.currentUser || (roles && state.currentUser.role !== 'SUPERADMIN' && !roles.includes(state.currentUser.role)) || !computeProjectScope(state.currentUser, state.projects, state.contractors).projectIds.has(projectId)) throw new Error('This action requires an assigned, authorized user.');
  return state.currentUser;
}

function requireQualityProof(state: StoreState, projectId: string, inspectionId: string) {
  if (!activeControls(state, projectId).some(r => r.kind === 'QUALITY' && r.fields.inspectionId === inspectionId && r.fields.result === 'PASS')) throw new Error('Verify traceable quality evidence in Contract controls before passing this inspection.');
}

function assertBillReviewer(state: StoreState, billId: string, roles: Role[]) {
  const bill = state.bills.find((item) => item.id === billId);
  if (!state.currentUser || (state.currentUser.role !== 'SUPERADMIN' && !roles.includes(state.currentUser.role)) || !bill || !computeProjectScope(state.currentUser, state.projects, state.contractors).projectIds.has(bill.projectId)) {
    throw new Error('This action requires an authorized reviewer for this project.');
  }
}
