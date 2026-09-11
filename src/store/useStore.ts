import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateMockData } from '../mock/seed';
import type {
  Project, User, Milestone, ProgressReport, SitePhoto, Inspection, Defect, ApprovalRequest,
  Contractor, Worker, AttendanceRecord, Bill, MeasurementEntry, BoqItem, Material, MaterialTest,
  SafetyRecord, Risk, ProjectDocument, CommissioningItem, HandoverStep, Notification, AuditEntry,
  Observation, Role, DefectStatus, ApprovalStatus, InspectionResult, Tender,
  ChangeOrder, ExtensionOfTime, SiteIssue, Decision,
  ContractorPoc, QualityFailure, QualityReport, InspectionAppointment,
} from '../types';

const seed = generateMockData();
let auditSeq = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}${(auditSeq++).toString(36)}`;

interface StoreState {
  currentUser: User | null;
  users: User[];
  projects: Project[];
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

  // generic audit
  logAction: (action: string, project?: string, previousValue?: string, newValue?: string) => void;

  // projects
  addProject: (p: Partial<Project> & { name: string }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;

  // progress
  addProgressReport: (r: Omit<ProgressReport, 'id'>) => void;
  addPhoto: (p: Omit<SitePhoto, 'id'>) => SitePhoto;
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
  resolveDecision: (id: string, outcome: string) => void;

  // inspections
  scheduleInspection: (i: Omit<Inspection, 'id' | 'items' | 'score' | 'overallResult' | 'status' | 'isReinspection'> & { category: Inspection['category'] }) => Inspection;
  submitInspection: (id: string, items: Inspection['items'], result: InspectionResult, comments: string) => void;
  reinspect: (defectId: string) => Inspection;
  passReinspection: (inspectionId: string) => void;

  // defects
  createDefect: (d: Omit<Defect, 'id' | 'status' | 'createdDate'>) => Defect;
  assignDefect: (id: string, pocId?: string) => void;
  acknowledgeDefect: (id: string) => void;
  updateDefectStatus: (id: string, status: DefectStatus) => void;
  addCorrectiveAction: (id: string, notes: string, photoSeed: number) => void;
  closeDefect: (id: string) => void;

  // inspection appointments
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
  submitBill: (b: Omit<Bill, 'id' | 'status' | 'submittedDate'>) => Bill;
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
      currentUser: null,
      ...seed,

      login: (role, userId) => {
        const user = userId ? get().users.find((u) => u.id === userId) : get().users.find((u) => u.role === role);
        set({ currentUser: user ?? { ...get().users[0], role } });
      },
      logout: () => set({ currentUser: null }),

      logAction: (action, project, previousValue, newValue) => {
        const u = get().currentUser;
        set((s) => ({
          auditLog: [{
            id: nid('AUD'), user: u?.name ?? 'System', role: u?.role ?? 'COMMISSIONER', action,
            project, timestamp: new Date().toISOString(), previousValue, newValue,
          }, ...s.auditLog],
        }));
      },

      addProject: (p) => {
        const project: Project = {
          id: nid('PRJ'), status: 'ON_TRACK', stage: 'ADMIN_SANCTION', reportedProgress: 0, verifiedProgress: 0, physicalProgress: 0, financialProgress: 0,
          bedCount: 50, sanctionedBudget: 0, tenderAmount: 0, workOrderValue: 0, revisedEstimate: 0,
          amountReleased: 0, amountSpent: 0, contractorId: '', pmcName: '', executiveEngineerId: '', siteEngineerId: '',
          startDate: new Date().toISOString().slice(0, 10), originalCompletionDate: new Date().toISOString().slice(0, 10), plannedCompletionDate: new Date().toISOString().slice(0, 10),
          delayDays: 0, lat: 50, lng: 50, siteLat: 19.5, siteLng: 76.0, description: '', qualityScore: 0, imageSeed: Math.floor(Math.random() * 1000),
          division: '', district: '', taluka: '', type: 'District Hospital', scheme: 'State Plan', facilityType: 'District / Civil Hospital',
          projectManagerId: get().currentUser?.id ?? '', ownerDirectorId: get().currentUser?.id ?? '', ...p,
        } as Project;
        set((s) => ({ projects: [project, ...s.projects] }));
        get().logAction(`Created new project`, project.name);
        return project;
      },
      updateProject: (id, patch) => {
        const before = get().projects.find((p) => p.id === id);
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        if (before) get().logAction('Updated project details', before.name);
      },

      addProgressReport: (r) => {
        const report: ProgressReport = { ...r, id: nid('PRG') };
        set((s) => ({ progressReports: [report, ...s.progressReports] }));
        const project = get().projects.find((p) => p.id === r.projectId);
        get().updateProject(r.projectId, { physicalProgress: Math.max(project?.physicalProgress ?? 0, r.progressPct) });
        get().logAction(`Submitted daily progress report (${r.stage})`, project?.name);
      },
      addPhoto: (p) => {
        const photo: SitePhoto = { ...p, id: nid('PHO') };
        set((s) => ({ photos: [photo, ...s.photos] }));
        const project = get().projects.find((pr) => pr.id === p.projectId);
        get().logAction(`Uploaded ${p.type.toLowerCase()} site photograph — ${p.stage}`, project?.name);
        return photo;
      },
      deletePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),

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
        set((s) => ({ changeOrders: [{ ...c, id: nid('CHG'), status: 'PENDING_APPROVAL' }, ...s.changeOrders] }));
        const project = get().projects.find((p) => p.id === c.projectId);
        get().logAction(`Raised change order: ${c.title}`, project?.name);
      },
      decideChangeOrder: (id, status) => {
        set((s) => ({ changeOrders: s.changeOrders.map((c) => (c.id === id ? { ...c, status, approvedBy: get().currentUser?.name, approvedDate: new Date().toISOString().slice(0, 10) } : c)) }));
        const c = get().changeOrders.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === c?.projectId);
        get().logAction(`${status === 'APPROVED' ? 'Approved' : 'Rejected'} change order: ${c?.title}`, project?.name);
      },
      raiseExtensionOfTime: (e) => {
        set((s) => ({ extensionsOfTime: [{ ...e, id: nid('EOT'), status: 'PENDING' }, ...s.extensionsOfTime] }));
        const project = get().projects.find((p) => p.id === e.projectId);
        get().logAction(`Requested extension of time (${e.daysRequested} days)`, project?.name);
      },
      decideExtensionOfTime: (id, status, approvedDays) => {
        set((s) => ({ extensionsOfTime: s.extensionsOfTime.map((e) => (e.id === id ? { ...e, status, approvedDays: status === 'APPROVED' ? (approvedDays ?? e.daysRequested) : undefined, approvedDate: new Date().toISOString().slice(0, 10) } : e)) }));
        const e = get().extensionsOfTime.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === e?.projectId);
        get().logAction(`${status === 'APPROVED' ? 'Approved' : 'Rejected'} extension of time`, project?.name);
        if (status === 'APPROVED' && e && project) {
          get().updateProject(project.id, { plannedCompletionDate: new Date(new Date(project.plannedCompletionDate).getTime() + (approvedDays ?? e.daysRequested) * 86400000).toISOString().slice(0, 10) });
        }
      },
      raiseSiteIssue: (i) => {
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
      resolveDecision: (id, outcome) => {
        set((s) => ({ decisions: s.decisions.map((d) => (d.id === id ? { ...d, status: 'DECIDED', decisionOutcome: outcome, decidedDate: new Date().toISOString().slice(0, 10) } : d)) }));
        const d = get().decisions.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === d?.projectId);
        get().logAction(`Decision recorded: ${d?.decisionRequired} — ${outcome}`, project?.name);
      },

      scheduleInspection: (i) => {
        const insp: Inspection = {
          id: nid('INS'), status: 'SCHEDULED', items: [], score: 0, overallResult: 'NOT_INSPECTED', isReinspection: false, ...i,
        };
        set((s) => ({ inspections: [insp, ...s.inspections] }));
        const project = get().projects.find((p) => p.id === i.projectId);
        get().logAction(`Scheduled ${i.category.replace('_', ' ')} inspection`, project?.name);
        get().pushNotification({ message: `${i.category.replace('_', ' ')} inspection scheduled for ${project?.name}.`, type: 'INFO', projectId: i.projectId, targetRoles: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'] });
        return insp;
      },
      submitInspection: (id, items, result, comments) => {
        const passCount = items.filter((it) => it.result === 'PASS').length;
        const score = items.length ? Math.round((passCount / items.length) * 100) : 0;
        set((s) => ({
          inspections: s.inspections.map((ins) => (ins.id === id ? { ...ins, items, overallResult: result, score, comments, status: 'COMPLETED', completedDate: new Date().toISOString().slice(0, 10) } : ins)),
        }));
        const insp = get().inspections.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === insp?.projectId);
        get().logAction(`Marked ${insp?.category.replace('_', ' ')} inspection as ${result}`, project?.name, 'IN_PROGRESS', result);
        if (result === 'FAIL' && insp) {
          const defect = get().createDefect({
            projectId: insp.projectId, location: 'Site — flagged during inspection', category: insp.category,
            severity: 'HIGH', description: `${insp.category.replace('_', ' ')} inspection failed. ${comments}`,
            imageSeed: Math.floor(Math.random() * 9999), reportedBy: insp.inspector, contractorId: project?.contractorId ?? '',
            dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), sourceInspectionId: insp.id,
          });
          get().pushNotification({ message: `Quality inspection FAILED — ${project?.name}. Defect ${defect.id} created.`, type: 'CRITICAL', projectId: insp.projectId, targetRoles: ['EXECUTIVE_ENGINEER', 'CONTRACTOR', 'CIVIL_SURGEON', 'COMMISSIONER'] });
        } else if (project) {
          get().pushNotification({ message: `${insp?.category.replace('_', ' ')} inspection ${result} — ${project.name}.`, type: 'INFO', projectId: project.id, targetRoles: ['EXECUTIVE_ENGINEER', 'COMMISSIONER'] });
        }
      },
      reinspect: (defectId) => {
        const defect = get().defects.find((d) => d.id === defectId);
        const src = get().inspections.find((i) => i.id === defect?.sourceInspectionId);
        const insp: Inspection = {
          id: nid('INS'), projectId: defect!.projectId, category: defect?.category ?? 'STRUCTURAL',
          scheduledDate: new Date().toISOString().slice(0, 10), inspector: src?.inspector ?? 'Deputy Engineer',
          status: 'IN_PROGRESS', items: [], score: 0, overallResult: 'NOT_INSPECTED', comments: '',
          isReinspection: true, parentInspectionId: src?.id,
        };
        set((s) => ({ inspections: [insp, ...s.inspections], defects: s.defects.map((d) => (d.id === defectId ? { ...d, status: 'REINSPECTION' } : d)) }));
        const project = get().projects.find((p) => p.id === insp.projectId);
        get().logAction(`Started re-inspection for defect ${defectId}`, project?.name);
        return insp;
      },
      passReinspection: (inspectionId) => {
        const insp = get().inspections.find((i) => i.id === inspectionId);
        if (!insp) return;
        const items = buildPassItems();
        set((s) => ({
          inspections: s.inspections.map((i) => (i.id === inspectionId ? { ...i, items, score: 100, overallResult: 'PASS', status: 'COMPLETED', completedDate: new Date().toISOString().slice(0, 10) } : i)),
        }));
        const defect = get().defects.find((d) => d.sourceInspectionId === insp.parentInspectionId && d.status === 'REINSPECTION');
        if (defect) {
          set((s) => ({ defects: s.defects.map((d) => (d.id === defect.id ? { ...d, status: 'CLOSED', closedDate: new Date().toISOString().slice(0, 10) } : d)) }));
        }
        const project = get().projects.find((p) => p.id === insp.projectId);
        get().updateProject(insp.projectId, { physicalProgress: Math.min(100, (project?.physicalProgress ?? 0) + 2), qualityScore: Math.min(100, (project?.qualityScore ?? 0) + 5) });
        get().logAction(`Re-inspection PASSED — defect resolved`, project?.name, 'FAIL', 'PASS');
        get().pushNotification({ message: `Re-inspection PASSED at ${project?.name}. Defect closed and project progress updated.`, type: 'INFO', projectId: insp.projectId, targetRoles: ['EXECUTIVE_ENGINEER', 'COMMISSIONER', 'CIVIL_SURGEON'] });
      },

      requestAppointment: (a) => {
        const appt: InspectionAppointment = { ...a, id: nid('APT'), status: 'REQUESTED' };
        set((s) => ({ inspectionAppointments: [appt, ...s.inspectionAppointments] }));
        const project = get().projects.find((p) => p.id === a.projectId);
        get().logAction(`Requested ${a.inspectionType.replace(/_/g, ' ')} inspection appointment`, project?.name);
        get().pushNotification({ message: `${a.inspectionType.replace(/_/g, ' ')} inspection requested — ${project?.name}.`, type: 'INFO', projectId: a.projectId, targetRoles: ['EXECUTIVE_ENGINEER', 'DEPUTY_ENGINEER'] });
        return appt;
      },
      scheduleAppointment: (id, date, time, inspector) => {
        set((s) => ({ inspectionAppointments: s.inspectionAppointments.map((a) => (a.id === id ? { ...a, status: 'SCHEDULED', date, time, assignedInspector: inspector } : a)) }));
        const a = get().inspectionAppointments.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === a?.projectId);
        get().logAction(`Scheduled inspection appointment for ${date} ${time}`, project?.name);
        get().pushNotification({ message: `Inspection scheduled for ${date} — ${project?.name}.`, type: 'INFO', projectId: a?.projectId, targetRoles: ['CONTRACTOR', 'DEPUTY_ENGINEER'] });
      },
      rescheduleAppointment: (id, date, time, remarks) => {
        set((s) => ({ inspectionAppointments: s.inspectionAppointments.map((a) => (a.id === id ? { ...a, status: 'RESCHEDULED', date, time, remarks } : a)) }));
        const a = get().inspectionAppointments.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === a?.projectId);
        get().logAction(`Rescheduled inspection appointment to ${date} ${time}`, project?.name);
      },
      cancelAppointment: (id, remarks) => {
        set((s) => ({ inspectionAppointments: s.inspectionAppointments.map((a) => (a.id === id ? { ...a, status: 'CANCELLED', remarks } : a)) }));
        const a = get().inspectionAppointments.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === a?.projectId);
        get().logAction(`Cancelled inspection appointment`, project?.name);
      },
      completeAppointment: (id) => {
        set((s) => ({ inspectionAppointments: s.inspectionAppointments.map((a) => (a.id === id ? { ...a, status: 'COMPLETED' } : a)) }));
        const a = get().inspectionAppointments.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === a?.projectId);
        get().logAction(`Marked inspection appointment completed`, project?.name);
      },

      createDefect: (d) => {
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
        set((s) => ({ defects: s.defects.map((d) => (d.id === id ? { ...d, status } : d)) }));
        const d = get().defects.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === d?.projectId);
        get().logAction(`Updated defect ${id} status to ${status.replace('_', ' ')}`, project?.name);
      },
      addCorrectiveAction: (id, notes, photoSeed) => {
        set((s) => ({ defects: s.defects.map((d) => (d.id === id ? { ...d, status: 'FIXED', correctiveActionNotes: notes, correctiveActionPhotoSeed: photoSeed } : d)) }));
        const d = get().defects.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === d?.projectId);
        get().logAction(`Contractor uploaded corrective-action evidence for defect ${id}`, project?.name);
        get().pushNotification({ message: `Corrective action submitted for defect ${id} — ready for re-inspection.`, type: 'INFO', projectId: d?.projectId, targetRoles: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'] });
      },
      closeDefect: (id) => {
        set((s) => ({ defects: s.defects.map((d) => (d.id === id ? { ...d, status: 'CLOSED', closedDate: new Date().toISOString().slice(0, 10), reinspectionPhotoSeed: d.reinspectionPhotoSeed ?? d.imageSeed * 11 + 5 } : d)) }));
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
        set((s) => ({ workers: [{ ...w, id: nid('WRK') }, ...s.workers] }));
        const project = get().projects.find((p) => p.id === w.projectId);
        get().logAction(`Added worker ${w.name} (${w.role})`, project?.name);
      },
      markAttendance: (workerId, projectId, method) => {
        const now = new Date();
        const rec: AttendanceRecord = {
          id: nid('ATT'), workerId, projectId, date: now.toISOString().slice(0, 10),
          checkIn: now.toTimeString().slice(0, 5), method, shift: 'Day',
        };
        set((s) => ({ attendance: [rec, ...s.attendance], workers: s.workers.map((w) => (w.id === workerId ? { ...w, attendanceStatus: 'PRESENT' } : w)) }));
        const project = get().projects.find((p) => p.id === projectId);
        get().logAction(`Marked attendance via ${method}`, project?.name);
      },

      submitBill: (b) => {
        const bill: Bill = { ...b, id: nid('BIL'), status: 'SUBMITTED', submittedDate: new Date().toISOString().slice(0, 10) };
        set((s) => ({ bills: [bill, ...s.bills] }));
        const project = get().projects.find((p) => p.id === b.projectId);
        get().logAction(`Submitted RA Bill ${bill.billNumber}`, project?.name);
        get().createApproval({
          type: 'RA_BILL', projectId: b.projectId, amount: bill.netPayable, submittedBy: get().currentUser?.name ?? 'Contractor',
          submittedDate: bill.submittedDate, documents: ['Measurement Book Extract', 'RA Bill Form'], comments: `RA Bill ${bill.billNumber}`,
          chain: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'COMMISSIONER'], relatedBillId: bill.id,
        });
        return bill;
      },
      verifyBillSite: (id) => {
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'SITE_VERIFIED', siteVerifiedBy: get().currentUser?.name } : b)) }));
        const b = get().bills.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === b?.projectId);
        get().logAction(`Site-verified bill ${b?.billNumber}`, project?.name);
      },
      verifyBillQuality: (id) => {
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'QUALITY_VERIFIED', qualityVerifiedBy: get().currentUser?.name } : b)) }));
        const b = get().bills.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === b?.projectId);
        get().logAction(`Quality-verified bill ${b?.billNumber}`, project?.name);
      },
      approveBill: (id) => {
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'APPROVED', approvedBy: get().currentUser?.name } : b)) }));
        const b = get().bills.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === b?.projectId);
        get().logAction(`Approved bill ${b?.billNumber}`, project?.name);
        get().pushNotification({ message: `Bill ${b?.billNumber} approved and pending payment.`, type: 'INFO', projectId: b?.projectId, targetRoles: ['COMMISSIONER'] });
      },
      rejectBill: (id, reason) => {
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'REJECTED' } : b)) }));
        const b = get().bills.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === b?.projectId);
        get().logAction(`Rejected bill ${b?.billNumber}: ${reason}`, project?.name);
      },
      markBillPaid: (id) => {
        const b = get().bills.find((x) => x.id === id);
        set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, status: 'PAID', paidDate: new Date().toISOString().slice(0, 10) } : x)) }));
        if (b) {
          const project = get().projects.find((p) => p.id === b.projectId);
          if (project) {
            const newSpent = project.amountSpent + b.netPayable;
            get().updateProject(project.id, {
              amountSpent: newSpent,
              financialProgress: Math.min(100, Math.round((newSpent / project.sanctionedBudget) * 100)),
            });
          }
          get().logAction(`Payment released for bill ${b.billNumber}`, project?.name);
          get().pushNotification({ message: `Payment of ₹${b.netPayable.toLocaleString('en-IN')} released for ${b.billNumber}.`, type: 'INFO', projectId: b.projectId, targetRoles: ['CONTRACTOR', 'COMMISSIONER'] });
        }
      },
      verifyMeasurement: (id, by) => set((s) => ({ measurements: s.measurements.map((m) => (m.id === id ? { ...m, verified: true, verifiedBy: by } : m)) })),

      createApproval: (a) => {
        const req: ApprovalRequest = { ...a, id: nid('APR'), status: 'PENDING', currentStepIndex: 0, history: [] };
        set((s) => ({ approvals: [req, ...s.approvals] }));
      },
      decideApproval: (id, decision, comment) => {
        const req = get().approvals.find((a) => a.id === id);
        if (!req) return;
        const u = get().currentUser;
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
            else if (stepJustDone === 'COMMISSIONER') get().markBillPaid(bill.id);
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
        set((s) => ({ commissioning: s.commissioning.map((c) => (c.id === id ? { ...c, status, remarks, updatedDate: new Date().toISOString().slice(0, 10) } : c)) }));
        const item = get().commissioning.find((x) => x.id === id);
        const project = get().projects.find((p) => p.id === item?.projectId);
        get().logAction(`Updated commissioning item "${item?.item}" to ${status.replace('_', ' ')}`, project?.name);
      },
      advanceHandoverStep: (id) => {
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
        set((s) => ({
          handoverSteps: s.handoverSteps.map((h) => (h.projectId === projectId ? { ...h, status: 'COMPLETED', date: h.date ?? new Date().toISOString().slice(0, 10) } : h)),
        }));
        get().updateProject(projectId, { status: 'COMPLETED', stage: 'OPERATIONAL', physicalProgress: 100, financialProgress: 100, actualCompletionDate: new Date().toISOString().slice(0, 10) });
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
      name: 'hcms-maharashtra-store-v1',
      partialize: (state) => {
        const { logAction, login, logout, addProject, updateProject, ...persisted } = state as any;
        return persisted;
      },
    },
  ),
);

function buildPassItems() {
  return [{ id: `chk-${Date.now()}`, requirement: 'Re-inspection of rectified work', measurement: 'Within tolerance', standard: 'Applicable IS Standard', result: 'PASS' as const, evidence: 'Photo & instrument reading logged', remarks: 'Corrective action verified and accepted.' }];
}
