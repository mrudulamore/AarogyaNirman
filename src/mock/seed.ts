import type {
  Project, User, Milestone, ProgressReport, SitePhoto, Inspection, ChecklistItem,
  Defect, ApprovalRequest, Contractor, Worker, AttendanceRecord, Bill, MeasurementEntry,
  BoqItem, Material, MaterialTest, SafetyRecord, Risk, ProjectDocument, CommissioningItem,
  HandoverStep, Notification, AuditEntry, Observation, Role, ProjectType, ProjectStatus,
  InspectionCategory, DocumentType, WorkerRole, Tender, TenderStatus, TenderType,
  ChangeOrder, ExtensionOfTime, SiteIssue, Decision, LocationSource,
  FacilityType, ContractorClassification, ContractorPoc, QualityFailure, QualityReport,
  QualityReportType, InspectionAppointment, AppointmentStatus,
} from '../types';
import { MAHARASHTRA_HIERARCHY, MILESTONE_WEIGHTAGE, INSPECTION_CATEGORIES, COMMISSIONING_ITEMS, HANDOVER_STEPS, SCHEMES } from '../lib/constants';
import { districtCoords } from '../lib/geo';
import { randomFullName, CONTRACTOR_COMPANIES, PMC_FIRMS, seedRng } from './names';

const rng = seedRng(42);
let seq = 0;
const id = (p: string) => `${p}-${(++seq).toString().padStart(4, '0')}`;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const int = (min: number, max: number) => Math.floor(min + rng() * (max - min + 1));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };

const TODAY = new Date('2026-09-08');

const PROJECT_TYPES: ProjectType[] = ['District Hospital', 'Rural Hospital', 'Sub-District Hospital', 'Women & Child Hospital', 'Tribal Area Hospital', 'Community Health Centre'];

interface SeedResult {
  users: User[];
  projects: Project[];
  tenders: Tender[];
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
  changeOrders: ChangeOrder[];
  extensionsOfTime: ExtensionOfTime[];
  siteIssues: SiteIssue[];
  decisions: Decision[];
  contractorPocs: ContractorPoc[];
  qualityFailures: QualityFailure[];
  qualityReports: QualityReport[];
  inspectionAppointments: InspectionAppointment[];
}

function buildChecklistItems(category: InspectionCategory, allPass: boolean): ChecklistItem[] {
  const reqsByCat: Record<string, string[]> = {
    STRUCTURAL: ['Column reinforcement as per drawing', 'Concrete cube strength (M25)', 'Slab thickness tolerance', 'Shuttering alignment'],
    CIVIL: ['Plaster thickness', 'Brick masonry bond', 'DPC level', 'Wall plumb check'],
    ELECTRICAL: ['Cable sizing as per load', 'Earthing resistance', 'DB panel labelling', 'Conduit concealment'],
    PLUMBING: ['Pipe pressure test', 'Slope of drainage line', 'Fixture fitment', 'Leak test'],
    FIRE_SAFETY: ['Sprinkler spacing', 'Fire hydrant pressure', 'Smoke detector coverage', 'Fire door rating'],
    HVAC: ['Duct insulation', 'AHU airflow rate', 'Chiller capacity check', 'Damper operation'],
    WATERPROOFING: ['Membrane overlap', 'Ponding test — terrace', 'Bathroom sunken slab test', 'Expansion joint sealing'],
    MEDICAL_GAS: ['Pipeline pressure test', 'Outlet labelling', 'Alarm panel function', 'Manifold room ventilation'],
    LIFT: ['Governor rope tension', 'Door interlock safety', 'Emergency rescue operation', 'Load test'],
    ACCESSIBILITY: ['Ramp gradient (1:12)', 'Handrail height', 'Accessible toilet clearance', 'Tactile flooring'],
    FINISHING: ['Tile alignment', 'Paint uniformity', 'False ceiling level', 'Door/window hardware'],
    SITE_SAFETY: ['PPE compliance', 'Scaffolding stability', 'Barricading', 'Fire extinguisher availability'],
  };
  const standards: Record<string, string> = {
    STRUCTURAL: 'IS 456:2000', CIVIL: 'IS 1905', ELECTRICAL: 'IS 732', PLUMBING: 'IS 2065',
    FIRE_SAFETY: 'NBC 2016 Part 4', HVAC: 'ISHRAE Standard', WATERPROOFING: 'IS 3067',
    MEDICAL_GAS: 'HTM 02-01', LIFT: 'IS 14665', ACCESSIBILITY: 'Harmonised Guidelines 2021',
    FINISHING: 'IS 1542', SITE_SAFETY: 'BOCW Act 1996',
  };
  const reqs = reqsByCat[category] ?? ['General requirement check'];
  return reqs.map((r, i) => {
    const isFailItem = !allPass && i === reqs.length - 1;
    return {
      id: id('CHK'),
      requirement: r,
      measurement: isFailItem ? 'Below tolerance' : 'Within tolerance',
      standard: standards[category] ?? 'IS Standard',
      result: isFailItem ? 'FAIL' : 'PASS',
      evidence: `Photo & instrument reading logged`,
      remarks: isFailItem ? 'Rectification required before re-inspection' : 'Conforms to specification',
    };
  });
}

export function generateMockData(): SeedResult {
  // ---------- USERS ----------
  const users: User[] = [];
  const roleDefs: { role: Role; count: number; deptPrefix: string }[] = [
    { role: 'SUPERADMIN', count: 1, deptPrefix: 'System Administration Cell' },
    { role: 'IT_ADMIN', count: 2, deptPrefix: 'IT & Systems Cell' },
    { role: 'MINISTER', count: 1, deptPrefix: 'Ministry of Public Health' },
    { role: 'COMMISSIONER', count: 2, deptPrefix: 'Directorate of Health Services' },
    { role: 'REGIONAL_DIRECTOR', count: 4, deptPrefix: 'Regional Directorate of Health Services' },
    { role: 'CIVIL_SURGEON', count: 6, deptPrefix: 'District Health Office' },
    { role: 'EXECUTIVE_ENGINEER', count: 6, deptPrefix: 'PWD Circle' },
    { role: 'DEPUTY_ENGINEER', count: 10, deptPrefix: 'PWD Sub-Division' },
    { role: 'MEDICAL_OFFICER', count: 4, deptPrefix: 'Hospital Administration' },
    { role: 'VIGILANCE_AUDIT', count: 4, deptPrefix: 'Vigilance & Audit Cell' },
  ];
  const designationByRole: Record<string, string> = {
    SUPERADMIN: 'Super Administrator, System Access', IT_ADMIN: 'IT / System Administrator',
    MINISTER: 'Minister of State, Public Health', COMMISSIONER: 'Commissioner, Health Services', REGIONAL_DIRECTOR: 'Regional Deputy Director, Health Services',
    CIVIL_SURGEON: 'District Health Officer / Civil Surgeon', EXECUTIVE_ENGINEER: 'Executive Engineer, PWD', DEPUTY_ENGINEER: 'Junior Engineer / Deputy Engineer',
    MEDICAL_OFFICER: 'Medical Officer (Facility In-Charge)', VIGILANCE_AUDIT: 'Vigilance & Audit Officer',
  };
  for (const rd of roleDefs) {
    for (let i = 0; i < rd.count; i++) {
      const name = randomFullName(rng);
      const initials = name.split(' ').map((n) => n[0]).join('');
      const divisionPick = pick(MAHARASHTRA_HIERARCHY);
      users.push({
        id: id('USR'),
        name,
        role: rd.role,
        designation: designationByRole[rd.role],
        department: `${rd.deptPrefix}, Govt. of Maharashtra`,
        email: `${name.toLowerCase().replace(' ', '.')}@maharashtra.gov.in`,
        phone: `9${int(100000000, 999999999)}`,
        // The first Regional Deputy Director / Civil Surgeon is pinned to the flagship project's
        // division/district so those demo logins land on the guided-demo project.
        division: rd.role === 'REGIONAL_DIRECTOR' && i === 0 ? 'Pune Division' : rd.role === 'REGIONAL_DIRECTOR' || rd.role === 'CIVIL_SURGEON' ? divisionPick.division : undefined,
        district: rd.role === 'CIVIL_SURGEON' && i === 0 ? 'Pune' : rd.role === 'CIVIL_SURGEON' ? pick(divisionPick.districts).district : undefined,
        assignedProjectIds: [],
        avatarInitials: initials,
        lastSiteVisit: iso(addDays(TODAY, -int(1, 20))),
        availability: pick(['AVAILABLE', 'ON_SITE', 'ON_LEAVE', 'AVAILABLE', 'AVAILABLE'] as const),
      });
    }
  }

  // ---------- CONTRACTORS ----------
  const CONTRACTOR_CLASSES: ContractorClassification[] = ['Class 1-A', 'Class 1-A', 'Class 1-B', 'Class 2', 'Class 3'];
  const contractors: Contractor[] = CONTRACTOR_COMPANIES.map((company, i) => ({
    id: id('CNT'),
    company,
    regId: `MH/PWD/CONT/${2018 + (i % 6)}/${1000 + i}`,
    classification: pick(CONTRACTOR_CLASSES),
    status: 'ACTIVE',
    contactPerson: randomFullName(rng),
    phone: `9${int(100000000, 999999999)}`,
    email: `contact@${company.toLowerCase().replace(/[^a-z]+/g, '')}.in`,
    assignedProjectIds: [],
    contractAmount: int(300, 4500) * 100000,
    startDate: iso(addDays(TODAY, -int(200, 900))),
    endDate: iso(addDays(TODAY, int(60, 500))),
    performanceScore: int(58, 96),
    scheduleAdherence: int(50, 98),
    qualityScoreAvg: int(60, 97),
    safetyScore: int(55, 98),
    billProcessingScore: int(60, 95),
    openDefects: 0,
    delaysCount: int(0, 5),
  }));
  // Flag a couple of consistently underperforming contractors as ON_WATCH — decision-support only.
  contractors.forEach((c) => { if (c.performanceScore < 65) c.status = 'ON_WATCH'; });

  // Company-wide contractor POC roster.
  const POC_ROLES: ContractorPoc['role'][] = ['Project Manager', 'Site Engineer', 'Safety Officer', 'Billing Engineer', 'Quality Engineer', 'Supervisor'];
  const contractorPocs: ContractorPoc[] = [];
  for (const c of contractors) {
    POC_ROLES.forEach((role, i) => {
      contractorPocs.push({
        id: id('POC'), contractorId: c.id, name: randomFullName(rng), designation: role,
        role, phone: `9${int(100000000, 999999999)}`, email: `${role.toLowerCase().replace(/ /g, '.')}@${c.company.toLowerCase().replace(/[^a-z]+/g, '')}.in`,
        responsibility: role === 'Project Manager' ? 'Overall contract coordination and client liaison' : role === 'Site Engineer' ? 'Day-to-day execution supervision' : role === 'Safety Officer' ? 'Site safety compliance and PPE enforcement' : role === 'Billing Engineer' ? 'Measurement records and RA bill preparation' : role === 'Quality Engineer' ? 'Material testing and quality checklist coordination' : 'Labour and sub-contractor supervision',
        siteAvailability: pick(['ON_SITE', 'ON_SITE', 'AVAILABLE', 'OFF_SITE']),
        isPrimary: i === 0,
        assignedProjectIds: [],
      });
    });
  }

  // ---------- PROJECTS ----------
  const flagshipDefs: { name: string; type: ProjectType; district: string; taluka: string; division: string; lat: number; lng: number }[] = [
    { name: 'District Government Hospital Expansion — Pune', type: 'District Hospital', district: 'Pune', taluka: 'Haveli', division: 'Pune Division', lat: 62, lng: 42 },
    { name: 'Rural Hospital Construction — Nashik', type: 'Rural Hospital', district: 'Nashik', taluka: 'Niphad', division: 'Nashik Division', lat: 42, lng: 38 },
    { name: 'Sub-District Hospital — Nagpur', type: 'Sub-District Hospital', district: 'Nagpur', taluka: 'Kamptee', division: 'Nagpur Division', lat: 38, lng: 82 },
    { name: 'Women & Child Hospital — Kolhapur', type: 'Women & Child Hospital', district: 'Kolhapur', taluka: 'Karvir', division: 'Pune Division', lat: 82, lng: 30 },
    { name: 'Tribal Area Hospital — Nandurbar', type: 'Tribal Area Hospital', district: 'Nandurbar', taluka: 'Nandurbar', division: 'Nashik Division', lat: 22, lng: 20 },
    { name: 'Community Health Centre — Gadchiroli', type: 'Community Health Centre', district: 'Gadchiroli', taluka: 'Gadchiroli', division: 'Nagpur Division', lat: 55, lng: 92 },
  ];

  const allDistrictsFlat = MAHARASHTRA_HIERARCHY.flatMap((div) => div.districts.map((d) => ({ ...d, division: div.division })));

  const projects: Project[] = [];
  const milestones: Milestone[] = [];
  const stagesForStatus = {
    ON_TRACK: 'CONSTRUCTION', AT_RISK: 'QUALITY_INSPECTION', DELAYED: 'CONSTRUCTION', COMPLETED: 'OPERATIONAL',
  } as const;

  function makeProject(def: { name: string; type: ProjectType; district: string; taluka: string; division: string; lat: number; lng: number }, index: number): Project {
    const isFlagship = index === 0;
    const status: ProjectStatus = isFlagship ? 'AT_RISK' : pick<ProjectStatus>(['ON_TRACK', 'ON_TRACK', 'AT_RISK', 'DELAYED', 'COMPLETED']);
    const physicalProgress = isFlagship ? 62 : status === 'COMPLETED' ? 100 : int(8, 95);
    const financialProgress = isFlagship ? 68 : status === 'COMPLETED' ? 100 : Math.min(100, physicalProgress + int(-8, 18));
    // Progress traceability: contractor-reported >= engineer-verified >= certified (physicalProgress).
    // The gap between these is exactly the "reported vs. verified vs. certified" transparency signal.
    const verifiedProgress = status === 'COMPLETED' ? 100 : Math.min(100, physicalProgress + (isFlagship ? 4 : int(0, 6)));
    const reportedProgress = status === 'COMPLETED' ? 100 : Math.min(100, verifiedProgress + (isFlagship ? 5 : int(1, 10)));
    const sanctioned = int(800, 9500) * 100000;
    const contractor = pick(contractors);
    const eeUsers = users.filter((u) => u.role === 'EXECUTIVE_ENGINEER');
    const seUsers = users.filter((u) => u.role === 'DEPUTY_ENGINEER');
    // The flagship project anchors the guided demo (failed inspection -> defect -> reinspect,
    // RA bill approval chain). Pin it to the FIRST engineer of each role so that logging in as
    // "Executive Engineer" / "Site Engineer" (which resolves to that same first user) always
    // lands on this project under role-based data scoping, instead of a random one.
    const ee = isFlagship ? eeUsers[0] : pick(eeUsers);
    const se = isFlagship ? seUsers[0] : pick(seUsers);
    const siteCoords = districtCoords(def.district, index + 1);
    const start = addDays(TODAY, -int(180, 1000));
    const plannedCompletion = addDays(start, int(400, 900));
    const delayDays = status === 'DELAYED' ? int(15, 120) : status === 'AT_RISK' ? int(1, 20) : 0;
    // Project Manager (operational coordinator) and Owner/Director (accountable senior owner) are
    // deliberately distinct from the Executive Engineer — a real project answers to both.
    const pmUser = pick(eeUsers.filter((u) => u.id !== ee.id).length ? eeUsers.filter((u) => u.id !== ee.id) : eeUsers);
    const districtCivilSurgeon = users.find((u) => u.role === 'CIVIL_SURGEON' && u.district === def.district);
    const divisionRegionalDirector = users.find((u) => u.role === 'REGIONAL_DIRECTOR' && u.division === def.division);
    const ownerDirector = districtCivilSurgeon ?? divisionRegionalDirector ?? pick(users.filter((u) => u.role === 'COMMISSIONER'));
    const facilityTypeMap: Record<ProjectType, FacilityType> = {
      'District Hospital': 'District / Civil Hospital', 'Rural Hospital': 'Rural Hospital', 'Sub-District Hospital': 'Sub-District Hospital',
      'Women & Child Hospital': 'Women Hospital', 'Tribal Area Hospital': 'CHC', 'Community Health Centre': 'CHC',
    };
    const p: Project = {
      id: id('PRJ'),
      name: def.name,
      type: def.type,
      scheme: pick(SCHEMES),
      facilityType: facilityTypeMap[def.type],
      projectManagerId: pmUser.id,
      ownerDirectorId: ownerDirector.id,
      division: def.division,
      district: def.district,
      taluka: def.taluka,
      status,
      stage: status === 'COMPLETED' ? 'OPERATIONAL' : (stagesForStatus[status] as Project['stage']),
      reportedProgress,
      verifiedProgress,
      physicalProgress,
      financialProgress,
      bedCount: pick([30, 50, 100, 150, 200, 300]),
      sanctionedBudget: sanctioned,
      tenderAmount: Math.round(sanctioned * 0.97),
      workOrderValue: Math.round(sanctioned * 0.97),
      revisedEstimate: Math.round(sanctioned * (rng() > 0.7 ? 1.06 : 1.0)),
      amountReleased: Math.round(sanctioned * (financialProgress / 100) * 1.05),
      amountSpent: Math.round(sanctioned * (financialProgress / 100)),
      contractorId: contractor.id,
      pmcName: pick(PMC_FIRMS),
      executiveEngineerId: ee.id,
      siteEngineerId: se.id,
      startDate: iso(start),
      originalCompletionDate: iso(plannedCompletion),
      plannedCompletionDate: iso(plannedCompletion),
      actualCompletionDate: status === 'COMPLETED' ? iso(addDays(plannedCompletion, int(-10, 30))) : undefined,
      delayDays,
      delayReason: delayDays > 0 ? pick(['Land', 'Design', 'Approval', 'Contractor', 'Labour', 'Material', 'Weather', 'Utility', 'Funding', 'Other'] as const) : undefined,
      recoveryPlan: delayDays > 0 ? 'Deploy additional workforce in two shifts and expedite pending material procurement to recover lost schedule.' : undefined,
      lat: def.lat,
      lng: def.lng,
      siteLat: siteCoords.lat,
      siteLng: siteCoords.lng,
      description: `Construction of a ${pick([30, 50, 100, 150, 200, 300])}-bed ${def.type.toLowerCase()} at ${def.taluka}, ${def.district} district, under the Government of Maharashtra hospital infrastructure augmentation programme.`,
      qualityScore: isFlagship ? 74 : int(55, 98),
      imageSeed: index + 1,
    };
    contractor.assignedProjectIds.push(p.id);
    ee.assignedProjectIds.push(p.id);
    se.assignedProjectIds.push(p.id);
    contractorPocs.filter((poc) => poc.contractorId === contractor.id).forEach((poc) => poc.assignedProjectIds.push(p.id));
    return p;
  }

  flagshipDefs.forEach((def, i) => projects.push(makeProject(def, i)));

  // Fill remaining projects up to 20 using other districts
  const usedDistricts = new Set(flagshipDefs.map((d) => d.district));
  let dIdx = 0;
  while (projects.length < 20) {
    const d = allDistrictsFlat[dIdx % allDistrictsFlat.length];
    dIdx++;
    if (usedDistricts.has(d.district) && rng() > 0.4) continue;
    usedDistricts.add(d.district);
    const type = pick(PROJECT_TYPES);
    const taluka = pick(d.talukas);
    projects.push(makeProject({
      name: `${type} — ${d.district}`,
      type, district: d.district, taluka, division: d.division,
      lat: int(10, 90), lng: int(10, 90),
    }, projects.length));
  }

  // ---------- TENDERS ----------
  // One tender per project, consistent with that project's contractor as the awarded bidder
  // (except a deliberate slice of "pipeline" projects held back at an earlier tender stage,
  // for demo variety — real project.stage tracks post-award construction phases only, so it
  // can't drive tender status on its own).
  const tenders: Tender[] = [];
  const tenderTypes: TenderType[] = ['OPEN', 'OPEN', 'LIMITED', 'EPC', 'ITEM_RATE'];
  const PRE_AWARD_STATUSES = ['PENDING_APPROVAL', 'PUBLISHED', 'BID_SUBMISSION', 'TECHNICAL_EVALUATION', 'FINANCIAL_EVALUATION', 'AWARD_APPROVAL', 'LOA_ISSUED', 'AGREEMENT_SIGNED'] as const;
  for (const [pIdx, p] of projects.entries()) {
    // Every 5th-6th project (deterministic on index, not chance, so the flagship/demo projects
    // stay consistent across reloads) is still working through pre-award tender stages.
    const isPreAward = pIdx % 5 === 4;
    const publish = addDays(new Date(p.startDate), -int(60, 150));
    const preBid = addDays(publish, 10);
    const deadline = addDays(publish, 30);
    const techOpen = addDays(deadline, 2);
    const finOpen = addDays(techOpen, int(5, 15));
    const awardedContractor = contractors.find((c) => c.id === p.contractorId)!;
    const otherBidders = [pick(contractors), pick(contractors)].filter((c) => c.id !== awardedContractor.id);
    const bidderNames = new Set([awardedContractor.company, ...otherBidders.map((c) => c.company)]);
    const status: TenderStatus = isPreAward ? pick(PRE_AWARD_STATUSES) : 'WORK_ORDER_ISSUED';
    const LIFECYCLE_ORDER = [...PRE_AWARD_STATUSES, 'WORK_ORDER_ISSUED'] as const;
    const stepIdx = LIFECYCLE_ORDER.indexOf(status as (typeof LIFECYCLE_ORDER)[number]);
    const pastBidSubmission = stepIdx >= LIFECYCLE_ORDER.indexOf('BID_SUBMISSION');
    const pastTechnicalEval = stepIdx >= LIFECYCLE_ORDER.indexOf('TECHNICAL_EVALUATION');
    const pastFinancialEval = stepIdx >= LIFECYCLE_ORDER.indexOf('FINANCIAL_EVALUATION');
    const pastAward = stepIdx >= LIFECYCLE_ORDER.indexOf('AWARD_APPROVAL');
    const bidders: Tender['bidders'] = Array.from(bidderNames).map((name) => ({
      name,
      technicalScore: pastTechnicalEval ? int(58, 96) : undefined,
      financialBid: pastFinancialEval ? Math.round(p.sanctionedBudget * (0.88 + rng() * 0.2)) : undefined,
      qualified: rng() > 0.15,
    }));
    tenders.push({
      id: id('TND'),
      projectId: p.id,
      title: `Construction of ${p.name}`,
      estimatedCost: p.sanctionedBudget,
      tenderType: pick(tenderTypes),
      publishDate: iso(publish),
      preBidDate: iso(preBid),
      submissionDeadline: iso(deadline),
      technicalOpeningDate: pastBidSubmission ? iso(techOpen) : undefined,
      financialOpeningDate: pastTechnicalEval ? iso(finOpen) : undefined,
      bidders,
      selectedBidder: pastAward ? awardedContractor.company : undefined,
      awardValue: pastAward ? p.workOrderValue : undefined,
      status,
      loaDate: stepIdx >= LIFECYCLE_ORDER.indexOf('LOA_ISSUED') ? iso(addDays(finOpen, 10)) : undefined,
      agreementDate: stepIdx >= LIFECYCLE_ORDER.indexOf('AGREEMENT_SIGNED') ? iso(addDays(finOpen, 20)) : undefined,
      workOrderDate: status === 'WORK_ORDER_ISSUED' ? p.startDate : undefined,
    });
    p.tenderId = tenders[tenders.length - 1].id;
  }

  // Milestones per project
  for (const p of projects) {
    const start = new Date(p.startDate);
    const contractValue = p.workOrderValue || p.sanctionedBudget;
    MILESTONE_WEIGHTAGE.forEach(({ name, weightagePct }, i) => {
      const planned = addDays(start, i * 45);
      const plannedStart = i === 0 ? start : addDays(start, (i - 1) * 45 + 20);
      // Three progress lines drive milestone status realism: certified (physicalProgress) governs
      // what's actually CERTIFIED/BILL_ELIGIBLE/PAID; verified/reported push earlier milestones
      // further along the submission pipeline without jumping straight to certification.
      const certifiedRatio = p.physicalProgress / 100;
      const verifiedRatio = p.verifiedProgress / 100;
      const reportedRatio = p.reportedProgress / 100;
      const milestoneRatio = i / (MILESTONE_WEIGHTAGE.length - 1);
      let mstatus: Milestone['status'];
      if (p.status === 'COMPLETED') mstatus = 'PAID';
      else if (milestoneRatio < certifiedRatio - 0.06) mstatus = pick(['CERTIFIED', 'BILL_ELIGIBLE', 'PAID'] as const);
      else if (milestoneRatio < verifiedRatio - 0.03) mstatus = 'VERIFIED';
      else if (milestoneRatio < reportedRatio - 0.02) mstatus = pick(['SUBMITTED_FOR_VERIFICATION', 'INSPECTION_PENDING'] as const);
      else if (milestoneRatio < reportedRatio + 0.06) mstatus = p.status === 'AT_RISK' && rng() > 0.7 ? 'CORRECTION_REQUIRED' : 'IN_PROGRESS';
      else mstatus = 'NOT_STARTED';
      const isDelivered = mstatus === 'CERTIFIED' || mstatus === 'BILL_ELIGIBLE' || mstatus === 'PAID';
      const isStarted = mstatus !== 'NOT_STARTED';
      const plannedValue = Math.round(contractValue * (weightagePct / 100));
      const claimedValue = isStarted && mstatus !== 'NOT_STARTED' && mstatus !== 'IN_PROGRESS' ? Math.round(plannedValue * (0.95 + rng() * 0.1)) : 0;
      const certifiedValue = isDelivered ? Math.round(claimedValue * (0.92 + rng() * 0.08)) : 0;
      milestones.push({
        id: id('MIL'),
        projectId: p.id,
        name,
        description: `${name} — as per approved work programme and contract BOQ.`,
        order: i,
        plannedStart: iso(plannedStart),
        plannedDate: iso(planned),
        actualStart: isStarted ? iso(plannedStart) : undefined,
        actualDate: isDelivered ? iso(addDays(planned, int(-5, 12))) : undefined,
        status: mstatus,
        weightagePct,
        linkedBoqItemIds: [],
        plannedValue,
        claimedValue,
        certifiedValue,
        paymentSlabPct: isDelivered ? (mstatus === 'PAID' ? 100 : 95) : 0,
        responsibleContractorId: p.contractorId,
        responsibleEngineerId: p.siteEngineerId,
        evidenceRequired: true,
        inspectionRequired: name !== 'Administrative Sanction' && name !== 'Technical Sanction' && name !== 'Tender' && name !== 'Work Order',
        dependencies: [], // backfilled to the prior milestone's id once this project's array is complete, below
        evidenceCount: isStarted ? int(1, 8) : 0,
        comments: mstatus === 'CORRECTION_REQUIRED' ? 'Engineer flagged discrepancies during verification — corrective resubmission required.' : isDelivered ? 'Certified and consistent with verified field evidence.' : isStarted ? 'Work in progress at site.' : 'Awaiting commencement.',
      });
    });
    // Backfill sequential dependencies now that all of this project's milestone ids exist.
    const projMilestones = milestones.filter((m) => m.projectId === p.id).sort((a, b) => a.order - b.order);
    projMilestones.forEach((m, i) => { if (i > 0) m.dependencies = [projMilestones[i - 1].id]; });
  }

  // ---------- PROGRESS REPORTS & PHOTOS ----------
  const DEVICE_POOL = ['Android 14 · Samsung Galaxy A54 · Camera GPS', 'Android 13 · Xiaomi Redmi Note 12 · Camera GPS', 'iOS 17 · iPhone 13 · Camera GPS', 'Android 12 · Realme 9 Pro · Camera GPS'];
  const metersToDegrees = (m: number) => m / 111000; // rough conversion, fine at this scale
  /** Most captures land tightly within the geo-fence; a small share are deliberately flagged
   * (manually typed coordinates, or a device fix well outside the registered site) so the
   * geo-fence UI has something real to demonstrate. */
  function makeCapturedLocation(p: Project) {
    const roll = rng();
    if (roll < 0.06) {
      // Manually entered — never presented as device-verified.
      return {
        lat: p.siteLat + jitterM(300), lng: p.siteLng + jitterM(300),
        locationSource: 'MANUAL' as LocationSource, gpsAccuracyM: undefined, deviceInfo: undefined,
      };
    }
    if (roll < 0.14) {
      // Device GPS fix, but well outside the registered site — flagged as suspicious.
      const distance = 700 + rng() * 2200;
      return {
        lat: p.siteLat + jitterM(distance), lng: p.siteLng + jitterM(distance),
        locationSource: 'CAPTURED' as LocationSource, gpsAccuracyM: Math.round(4 + rng() * 30), deviceInfo: pick(DEVICE_POOL),
      };
    }
    return {
      lat: p.siteLat + jitterM(20 + rng() * 250), lng: p.siteLng + jitterM(20 + rng() * 250),
      locationSource: 'CAPTURED' as LocationSource, gpsAccuracyM: Math.round(4 + rng() * 18), deviceInfo: pick(DEVICE_POOL),
    };
  }
  function jitterM(meters: number) { return (rng() - 0.5) * 2 * metersToDegrees(meters); }

  const progressReports: ProgressReport[] = [];
  const photos: SitePhoto[] = [];
  const stagesCycle = ['Foundation', 'Structure', 'Roofing', 'MEP', 'Finishing', 'Medical Infrastructure'];
  for (const p of projects) {
    const reportsCount = p.id === projects[0].id ? 6 : int(1, 4);
    for (let i = 0; i < reportsCount; i++) {
      const date = addDays(TODAY, -((reportsCount - i) * 9));
      const stage = stagesCycle[Math.min(stagesCycle.length - 1, Math.floor((i / reportsCount) * stagesCycle.length))];
      const photoIds: string[] = [];
      const shotCount = int(2, 4);
      for (let s = 0; s < shotCount; s++) {
        const seed = p.imageSeed * 97 + i * 13 + s;
        const captureTime = new Date(date); captureTime.setHours(9 + int(0, 8), int(0, 59));
        const uploadDelayMin = rng() > 0.85 ? int(30, 600) : int(0, 8); // occasional offline-sync lag
        const loc = makeCapturedLocation(p);
        const photo: SitePhoto = {
          id: id('PHO'),
          projectId: p.id,
          stage,
          type: i === 0 ? 'BEFORE' : (p.status === 'COMPLETED' && i === reportsCount - 1) ? 'COMPLETION' : 'PROGRESS',
          date: iso(date),
          location: `${p.taluka}, ${p.district}`,
          uploadedBy: users.find((u) => u.id === p.siteEngineerId)?.name ?? 'Deputy Engineer',
          uploadedByRole: 'DEPUTY_ENGINEER',
          description: `${stage} work — ${p.name}`,
          seed,
          ...loc,
          capturedAt: captureTime.toISOString(),
          uploadedAt: new Date(captureTime.getTime() + uploadDelayMin * 60000).toISOString(),
        };
        photos.push(photo);
        photoIds.push(photo.id);
      }
      progressReports.push({
        id: id('PRG'),
        projectId: p.id,
        date: iso(date),
        stage,
        progressPct: Math.round((i + 1) / reportsCount * p.physicalProgress),
        workersPresent: int(15, 90),
        weather: pick(['Clear', 'Cloudy', 'Rain', 'Heavy Rain', 'Extreme Heat'] as const),
        materialsReceived: pick(['Cement 200 bags, Steel 5MT', 'Sand 20 brass, Bricks 15000 nos', 'Tiles 400 boxes', 'Electrical cable 1200m', 'None']),
        materialsUsed: pick(['Cement 180 bags', 'Steel 4.2MT', 'RMC 40 cum', 'Bricks 12000 nos']),
        issues: rng() > 0.75 ? pick(['Minor rainfall delay', 'Cement delivery delayed by 1 day', 'Labour shortage — 5 workers absent', 'Equipment breakdown — mixer']) : 'None reported',
        photoIds,
        videoCount: rng() > 0.6 ? 1 : 0,
        submittedBy: users.find((u) => u.id === p.siteEngineerId)?.name ?? 'Deputy Engineer',
        location: `${p.taluka}, ${p.district}`,
        timestamp: date.toISOString(),
      });
    }
  }

  // ---------- INSPECTIONS & DEFECTS ----------
  const inspections: Inspection[] = [];
  const defects: Defect[] = [];
  const flagship = projects[0];

  function createInspection(p: Project, category: InspectionCategory, forceFail = false, daysAgo = 5): Inspection {
    const inspector = pick(users.filter((u) => u.role === 'DEPUTY_ENGINEER'));
    const fail = forceFail || rng() > 0.85;
    const items = buildChecklistItems(category, !fail);
    const score = Math.round((items.filter((it) => it.result === 'PASS').length / items.length) * 100);
    return {
      id: id('INS'),
      projectId: p.id,
      category,
      scheduledDate: iso(addDays(TODAY, -daysAgo)),
      completedDate: iso(addDays(TODAY, -daysAgo + 1)),
      inspector: inspector.name,
      status: 'COMPLETED',
      items,
      overallResult: fail ? 'FAIL' : score >= 90 ? 'PASS' : 'CONDITIONAL',
      score,
      comments: fail ? 'Non-conformance identified; corrective action required before re-inspection.' : 'Work conforms to specified standards.',
      isReinspection: false,
    };
  }

  // Flagship: the guided demo inspection — concrete/structural FAIL with linked defect
  const flagshipFailInspection = createInspection(flagship, 'STRUCTURAL', true, 6);
  inspections.push(flagshipFailInspection);
  const flagshipContractor = contractors.find((c) => c.id === flagship.contractorId)!;
  const flagshipDefect: Defect = {
    id: id('DEF'),
    projectId: flagship.id,
    location: 'Ward Block B — Column Grid C3',
    category: 'STRUCTURAL',
    severity: 'CRITICAL',
    description: 'Concrete cube strength test at Ward Block B (Grid C3) recorded below M25 design strength. Column casting does not meet structural design requirement.',
    imageSeed: flagship.imageSeed * 51 + 3,
    reportedBy: flagshipFailInspection.inspector,
    contractorId: flagship.contractorId,
    dueDate: iso(addDays(TODAY, 5)),
    status: 'ASSIGNED',
    createdDate: flagshipFailInspection.completedDate!,
    sourceInspectionId: flagshipFailInspection.id,
  };
  defects.push(flagshipDefect);

  for (const p of projects) {
    if (p.id === flagship.id) {
      // a couple more historical inspections for the flagship project
      inspections.push(createInspection(p, 'ELECTRICAL', false, 20));
      inspections.push(createInspection(p, 'FIRE_SAFETY', false, 30));
      inspections.push({ ...createInspection(p, 'PLUMBING', false, 2), status: 'SCHEDULED', overallResult: 'NOT_INSPECTED', completedDate: undefined, scheduledDate: iso(addDays(TODAY, 4)) });
      continue;
    }
    const count = int(1, 3);
    for (let i = 0; i < count; i++) {
      const cat = pick(INSPECTION_CATEGORIES);
      const insp = createInspection(p, cat, false, int(2, 90));
      if (rng() > 0.85 && insp.status === 'COMPLETED') insp.overallResult = 'FAIL';
      inspections.push(insp);
      if (insp.overallResult === 'FAIL') {
        defects.push({
          id: id('DEF'),
          projectId: p.id,
          location: pick(['Ward Block A', 'OPD Block', 'Main Entrance Canopy', 'Staff Quarters', 'Boundary Wall', 'ICU Block', 'Basement Parking']),
          category: cat,
          severity: pick(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
          description: `${cat.replace('_', ' ')} non-conformance identified during inspection; requires corrective action as per checklist remarks.`,
          imageSeed: p.imageSeed * 33 + i,
          reportedBy: insp.inspector,
          contractorId: p.contractorId,
          dueDate: iso(addDays(TODAY, int(-5, 15))),
          status: pick(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FIXED', 'REINSPECTION', 'CLOSED']),
          createdDate: insp.completedDate!,
          sourceInspectionId: insp.id,
          closedDate: undefined,
        });
      }
    }
    // ensure some standalone scheduled/upcoming inspections
    if (rng() > 0.5) {
      inspections.push({
        id: id('INS'), projectId: p.id, category: pick(INSPECTION_CATEGORIES),
        scheduledDate: iso(addDays(TODAY, int(1, 15))), inspector: pick(users.filter((u) => u.role === 'DEPUTY_ENGINEER')).name,
        status: 'SCHEDULED', items: [], overallResult: 'NOT_INSPECTED', score: 0, comments: 'Inspection scheduled.', isReinspection: false,
      });
    }
  }

  // extra standalone defects to reach ~25 total
  while (defects.length < 25) {
    const p = pick(projects);
    defects.push({
      id: id('DEF'), projectId: p.id, location: pick(['Ward Block A', 'OPD Block', 'Kitchen & Laundry', 'Mortuary Block', 'Ramp Area']),
      category: pick(INSPECTION_CATEGORIES), severity: pick(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      description: 'Defect identified during routine site walkthrough by quality team.',
      imageSeed: p.imageSeed * 61 + defects.length, reportedBy: pick(users.filter((u) => u.role === 'DEPUTY_ENGINEER')).name,
      contractorId: p.contractorId, dueDate: iso(addDays(TODAY, int(-3, 20))),
      status: pick(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FIXED', 'CLOSED']), createdDate: iso(addDays(TODAY, -int(1, 40))),
    });
  }
  defects.forEach((d) => {
    const c = contractors.find((c) => c.id === d.contractorId);
    if (c && d.status !== 'CLOSED') c.openDefects++;
  });
  // Backfill contractor-accountability fields (Part 11): who's assigned, which engineer verifies,
  // which government officer has oversight, and when the contractor acknowledged it.
  for (const d of defects) {
    const p = projects.find((pr) => pr.id === d.projectId);
    if (!p) continue;
    const pocPool = contractorPocs.filter((poc) => poc.contractorId === d.contractorId && (poc.role === 'Site Engineer' || poc.role === 'Project Manager'));
    if (d.status !== 'OPEN' && pocPool.length) d.assignedPocId = pick(pocPool).id;
    d.responsibleEngineerId = p.siteEngineerId;
    d.responsibleOfficerId = p.executiveEngineerId;
    if (d.status !== 'OPEN') d.acknowledgedDate = iso(addDays(new Date(d.createdDate), int(1, 3)));
    if (d.status === 'CLOSED' || d.status === 'FIXED' || d.status === 'REINSPECTION') d.correctiveActionPhotoSeed = d.correctiveActionPhotoSeed ?? d.imageSeed * 7 + 3;
    if (d.status === 'CLOSED') d.reinspectionPhotoSeed = d.imageSeed * 11 + 5;
  }

  // ---------- CRITICAL QUALITY FAILURES ----------
  // A curated subset of FAILed inspections promoted to a fuller monitoring/compliance record —
  // deliberately narrative and non-prescriptive (no engineering remediation instructions).
  const FAILURE_NARRATIVES: Partial<Record<InspectionCategory, { description: string; impact: string; action: string }>> = {
    STRUCTURAL: { description: 'Honeycombing observed in RCC column at the inspected grid location.', impact: 'Potential structural durability concern.', action: 'Structural engineer assessment and repair methodology approval required before further finishing work.' },
    WATERPROOFING: { description: 'Ponding and membrane discontinuity observed during terrace waterproofing check.', impact: 'Risk of water ingress and dampness in occupied areas below.', action: 'Re-application of waterproofing membrane per approved specification, followed by a fresh ponding test.' },
    ELECTRICAL: { description: 'Earthing resistance reading exceeded the permissible threshold at the tested panel.', impact: 'Electrical safety risk for equipment and occupants.', action: 'Earthing system rework and re-testing by a licensed electrical contractor before energisation.' },
    FIRE_SAFETY: { description: 'Fire hydrant pressure below the required standard at the tested outlet.', impact: 'Reduced fire-fighting readiness in an emergency.', action: 'Pump/pressure system review and re-test coordinated with the fire safety consultant.' },
    MEDICAL_GAS: { description: 'Pipeline pressure drop observed during the medical gas system test.', impact: 'Risk to critical patient-care gas supply reliability.', action: 'Leak investigation and rectification by the certified medical-gas contractor, followed by re-testing.' },
    CIVIL: { description: 'Plaster thickness and DPC level found outside tolerance at the inspected wall section.', impact: 'Potential finishing and moisture-ingress issues.', action: 'Corrective plastering as per specification and re-inspection of the affected section.' },
  };
  const qualityFailures: QualityFailure[] = [];
  const failedInspections = inspections.filter((i) => i.overallResult === 'FAIL' && i.status === 'COMPLETED');
  for (const insp of failedInspections) {
    const p = projects.find((pr) => pr.id === insp.projectId)!;
    const narrative = FAILURE_NARRATIVES[insp.category] ?? { description: `${insp.category.replace(/_/g, ' ')} non-conformance identified during inspection.`, impact: 'Potential quality and compliance concern requiring verification.', action: 'Corrective action per checklist remarks, followed by re-inspection.' };
    const linkedDefect = defects.find((d) => d.sourceInspectionId === insp.id);
    qualityFailures.push({
      id: id('QF'), projectId: p.id, inspectionId: insp.id,
      location: pick(['Ward Block A', 'Ward Block B', 'OPD Block', 'ICU Block', 'Basement', 'Terrace']),
      category: insp.category, severity: insp === flagshipFailInspection ? 'CRITICAL' : pick(['CRITICAL', 'HIGH', 'HIGH', 'MEDIUM']),
      inspectionDate: insp.completedDate!, inspector: insp.inspector,
      description: narrative.description, possibleImpact: narrative.impact, requiredAction: narrative.action,
      assignedContractorId: p.contractorId, targetClosure: iso(addDays(new Date(insp.completedDate!), 10)),
      reinspectionStatus: linkedDefect?.status === 'CLOSED' ? 'PASS' : linkedDefect?.status === 'REINSPECTION' ? 'SCHEDULED' : 'PENDING',
    });
  }

  // ---------- QUALITY REPORTS ----------
  const QUALITY_REPORT_TYPES: QualityReportType[] = ['Inspection Report', 'Material Test Report', 'Concrete Test Report', 'Steel Test Report', 'Waterproofing Report', 'Electrical Test Report', 'Plumbing Test Report', 'Fire Safety Report', 'MEP Report'];
  const TEST_AGENCIES = ['Govt. Approved Materials Testing Lab, Pune', 'Regional Quality Control Laboratory', 'Third-Party Empanelled Testing Agency', 'PWD Quality Control Circle'];
  const qualityReports: QualityReport[] = [];
  for (const p of projects) {
    const projInspections = inspections.filter((i) => i.projectId === p.id && i.status === 'COMPLETED');
    const reportCount = p.id === flagship.id ? 6 : int(1, 3);
    for (let i = 0; i < reportCount; i++) {
      const linkedInsp = projInspections[i % Math.max(1, projInspections.length)];
      const reportType = linkedInsp ? 'Inspection Report' : pick(QUALITY_REPORT_TYPES);
      qualityReports.push({
        id: id('QR'), projectId: p.id, reportType: i === 0 ? reportType : pick(QUALITY_REPORT_TYPES),
        inspectionId: linkedInsp?.id, reportNo: `QR/${p.district.slice(0, 3).toUpperCase()}/${2025 + Math.floor(i / 10)}/${int(100, 999)}`,
        date: linkedInsp?.completedDate ?? iso(addDays(TODAY, -int(5, 120))),
        inspector: linkedInsp?.inspector ?? pick(users.filter((u) => u.role === 'DEPUTY_ENGINEER')).name,
        agency: pick(TEST_AGENCIES), testType: linkedInsp ? linkedInsp.category.replace(/_/g, ' ') : 'Routine quality check',
        status: pick(['APPROVED', 'APPROVED', 'PENDING', 'REJECTED']),
        observations: linkedInsp ? linkedInsp.comments : 'Report filed as part of routine quality monitoring.',
        linkedDefectIds: linkedInsp ? defects.filter((d) => d.sourceInspectionId === linkedInsp.id).map((d) => d.id) : [],
      });
    }
  }

  // ---------- INSPECTION APPOINTMENTS ----------
  const inspectionAppointments: InspectionAppointment[] = [];
  const REQUIRED_DOCS_BY_CATEGORY: Partial<Record<InspectionCategory, string[]>> = {
    STRUCTURAL: ['Concrete Cube Test Reports', 'Approved Structural Drawing'],
    ELECTRICAL: ['Earthing Test Certificate', 'Approved Electrical Drawing'],
    FIRE_SAFETY: ['Fire NOC Application', 'Hydrant Layout Drawing'],
    MEDICAL_GAS: ['Pipeline Pressure Test Log', 'Manifold Room Layout'],
  };
  for (const insp of inspections) {
    const p = projects.find((pr) => pr.id === insp.projectId)!;
    const se = users.find((u) => u.id === p.siteEngineerId);
    const contractor = contractors.find((c) => c.id === p.contractorId);
    const contractorPm = contractorPocs.find((poc) => poc.contractorId === p.contractorId && poc.role === 'Project Manager');
    const status: AppointmentStatus = insp.status === 'COMPLETED' ? 'COMPLETED' : insp.status === 'SCHEDULED' ? pick(['SCHEDULED', 'SCHEDULED', 'REQUESTED', 'RESCHEDULED'] as const) : 'SCHEDULED';
    inspectionAppointments.push({
      id: id('APT'), projectId: p.id, inspectionType: insp.category,
      requestedBy: contractor?.contactPerson ?? 'Contractor', requestedByRole: 'CONTRACTOR',
      assignedInspector: insp.inspector, date: insp.scheduledDate, time: `${String(9 + Math.floor(int(0, 7))).padStart(2, '0')}:${pick(['00', '30'])}`,
      site: `${p.taluka}, ${p.district}`, attendees: [se?.name ?? 'Deputy Engineer', insp.inspector],
      contractorPoc: contractorPm?.name, governmentPoc: se?.name,
      requiredDocuments: REQUIRED_DOCS_BY_CATEGORY[insp.category] ?? ['Site Readiness Checklist'],
      remarks: status === 'RESCHEDULED' ? 'Rescheduled due to site readiness.' : '',
      status, linkedInspectionId: insp.status === 'COMPLETED' ? insp.id : undefined,
    });
  }

  // ---------- BOQ, MATERIALS, MEASUREMENTS, BILLS ----------
  const boqCategories = ['Earthwork', 'RCC', 'Steel', 'Brickwork', 'Flooring', 'Electrical', 'Plumbing', 'HVAC', 'Fire Safety', 'Medical Gas', 'Finishing'] as const;
  const boqItemNames: Record<string, string[]> = {
    Earthwork: ['Excavation for foundation', 'Backfilling with murum'],
    RCC: ['M25 grade column concrete', 'M25 grade slab concrete', 'Footing concrete'],
    Steel: ['Fe500 reinforcement bars', 'Structural steel trusses'],
    Brickwork: ['230mm brick masonry', '115mm partition wall'],
    Flooring: ['Vitrified tile flooring', 'Kota stone flooring'],
    Electrical: ['Internal wiring & conduiting', 'DB panel installation'],
    Plumbing: ['CPVC pipeline', 'Sanitary fixtures installation'],
    HVAC: ['Ducting installation', 'AHU installation'],
    'Fire Safety': ['Sprinkler piping', 'Fire hydrant system'],
    'Medical Gas': ['Oxygen pipeline', 'Vacuum pipeline'],
    Finishing: ['Interior POP punning', 'External texture paint'],
  };
  const units: Record<string, string> = {
    Earthwork: 'cum', RCC: 'cum', Steel: 'MT', Brickwork: 'sqm', Flooring: 'sqm',
    Electrical: 'point', Plumbing: 'point', HVAC: 'sqm', 'Fire Safety': 'rmt', 'Medical Gas': 'rmt', Finishing: 'sqm',
  };

  const boqItems: BoqItem[] = [];
  const materials: Material[] = [];
  const materialTests: MaterialTest[] = [];
  const measurements: MeasurementEntry[] = [];
  const bills: Bill[] = [];

  const materialCatalog = [
    { name: 'OPC 53 Grade Cement', unit: 'bags' }, { name: 'TMT Steel Bars Fe500', unit: 'MT' },
    { name: 'River Sand', unit: 'brass' }, { name: '20mm Aggregate', unit: 'brass' },
    { name: 'Fly Ash Bricks', unit: 'nos' }, { name: 'Vitrified Tiles', unit: 'boxes' },
    { name: 'Electrical Cable (Cu, 2.5sqmm)', unit: 'coil' }, { name: 'CPVC Pipes', unit: 'nos' },
  ];

  for (const p of projects) {
    for (const cat of boqCategories) {
      for (const item of boqItemNames[cat]) {
        const plannedQty = int(50, 5000);
        boqItems.push({
          id: id('BOQ'), projectId: p.id, category: cat, item, unit: units[cat],
          plannedQty, completedQty: Math.round(plannedQty * (p.physicalProgress / 100) * (0.7 + rng() * 0.5)),
          rate: int(150, 9500),
        });
      }
    }
    for (const mat of materialCatalog) {
      const ordered = int(200, 5000);
      const received = Math.round(ordered * (0.6 + rng() * 0.4));
      const used = Math.round(received * (0.4 + rng() * 0.5));
      materials.push({
        id: id('MAT'), projectId: p.id, name: mat.name, supplier: pick(['Ambuja Cements Ltd.', 'JSW Steel Ltd.', 'Local Approved Vendor', 'Ultratech Cement Ltd.', 'Kajaria Ceramics']),
        orderedQty: ordered, receivedQty: received, usedQty: used, remainingQty: received - used, unit: mat.unit,
        deliveryDate: iso(addDays(TODAY, -int(1, 60))), qualityStatus: pick(['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'UNDER_TESTING', 'REJECTED']),
      });
    }
    const testCount = int(1, 3);
    for (let i = 0; i < testCount; i++) {
      const mat = pick(materialCatalog);
      materialTests.push({
        id: id('MTS'), projectId: p.id, sampleId: `SMP-${int(1000, 9999)}`, material: mat.name,
        supplier: pick(['Ambuja Cements Ltd.', 'JSW Steel Ltd.', 'Ultratech Cement Ltd.']),
        date: iso(addDays(TODAY, -int(1, 60))), test: mat.name.includes('Steel') ? 'Tensile Strength Test' : mat.name.includes('Cement') ? 'Compressive Strength Test' : 'Dimensional & Quality Check',
        result: pick(['PASS', 'PASS', 'PASS', 'FAIL', 'PENDING']), standard: mat.name.includes('Steel') ? 'IS 1786' : 'IS 12269',
        inspector: pick(users.filter((u) => u.role === 'DEPUTY_ENGINEER')).name, reportRef: `RPT-${int(10000, 99999)}`,
      });
    }

    const billCount = p.id === flagship.id ? 3 : int(1, 2);
    for (let b = 0; b < billCount; b++) {
      const gross = int(15, 180) * 100000;
      const deductions = Math.round(gross * 0.02);
      const gst = Math.round(gross * 0.18);
      const retention = Math.round(gross * 0.05);
      const penalty = rng() > 0.85 ? Math.round(gross * 0.01) : 0;
      const net = gross - deductions + gst - retention - penalty;
      const isLatestForFlagship = p.id === flagship.id && b === billCount - 1;
      const status = isLatestForFlagship ? 'SUBMITTED' : pick(['DRAFT', 'SUBMITTED', 'SITE_VERIFIED', 'QUALITY_VERIFIED', 'APPROVED', 'PAID', 'PAID', 'REJECTED'] as const);
      const bill: Bill = {
        id: id('BIL'), billNumber: `RA/${p.district.slice(0, 3).toUpperCase()}/${100 + measurements.length + b}`,
        contractorId: p.contractorId, projectId: p.id,
        periodFrom: iso(addDays(TODAY, -(b + 1) * 30)), periodTo: iso(addDays(TODAY, -b * 30)),
        grossAmount: gross, deductions, gst, retention, penalty, netPayable: net, status,
        submittedDate: iso(addDays(TODAY, -(b * 30 + 5))),
        siteVerifiedBy: ['SITE_VERIFIED', 'QUALITY_VERIFIED', 'APPROVED', 'PAID'].includes(status) ? users.find((u) => u.id === p.siteEngineerId)?.name : undefined,
        qualityVerifiedBy: ['QUALITY_VERIFIED', 'APPROVED', 'PAID'].includes(status) ? pick(users.filter((u) => u.role === 'DEPUTY_ENGINEER')).name : undefined,
        approvedBy: ['APPROVED', 'PAID'].includes(status) ? users.find((u) => u.id === p.executiveEngineerId)?.name : undefined,
        paidDate: status === 'PAID' ? iso(addDays(TODAY, -(b * 30 - 10))) : undefined,
      };
      bills.push(bill);
      const relatedBoq = boqItems.filter((bo) => bo.projectId === p.id).slice(0, 3);
      for (const bo of relatedBoq) {
        const prevQty = Math.round(bo.completedQty * 0.7);
        measurements.push({
          id: id('MEA'), projectId: p.id, billId: bill.id, workItem: bo.item, boqItemId: bo.id, unit: bo.unit,
          previousQty: prevQty, currentQty: bo.completedQty - prevQty, totalQty: bo.completedQty, rate: bo.rate,
          amount: Math.round((bo.completedQty - prevQty) * bo.rate), verifiedBy: bill.siteVerifiedBy, verified: !!bill.siteVerifiedBy,
        });
      }
    }
  }

  // Backfill milestone -> BOQ item linkage now that boqItems exist for every project.
  for (const m of milestones) {
    const projBoq = boqItems.filter((bo) => bo.projectId === m.projectId);
    if (projBoq.length) m.linkedBoqItemIds = [pick(projBoq).id, pick(projBoq).id].filter((v, i, arr) => arr.indexOf(v) === i);
  }

  // ---------- APPROVALS ----------
  const approvals: ApprovalRequest[] = [];
  const chainMap: Record<string, ApprovalRequest['chain']> = {
    RA_BILL: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'COMMISSIONER'],
    DESIGN_CHANGE: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER', 'CIVIL_SURGEON'],
    MILESTONE_COMPLETION: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'],
    MATERIAL_APPROVAL: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'],
    EXTENSION_OF_TIME: ['EXECUTIVE_ENGINEER', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR'],
    REVISED_ESTIMATE: ['EXECUTIVE_ENGINEER', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR', 'COMMISSIONER'],
  };
  for (const bill of bills) {
    const p = projects.find((pr) => pr.id === bill.projectId)!;
    const chain = chainMap.RA_BILL;
    let currentStepIndex = 0;
    const history: ApprovalRequest['history'] = [];
    const stepUserFor = (role: string) => role === 'DEPUTY_ENGINEER' ? users.find((u) => u.id === p.siteEngineerId) : role === 'EXECUTIVE_ENGINEER' ? users.find((u) => u.id === p.executiveEngineerId) : users.find((u) => u.role === role as Role);
    const statusIndex: Record<string, number> = { DRAFT: 0, SUBMITTED: 0, SITE_VERIFIED: 1, QUALITY_VERIFIED: 2, APPROVED: 3, PAID: 3, REJECTED: 0 };
    currentStepIndex = Math.min(statusIndex[bill.status] ?? 0, chain.length);
    for (let i = 0; i < currentStepIndex; i++) {
      const u = stepUserFor(chain[i]);
      history.push({ step: chain[i], approver: u?.name ?? 'Officer', designation: u?.designation ?? '', timestamp: iso(addDays(TODAY, -(currentStepIndex - i) * 3)), decision: 'APPROVED', comment: 'Verified and forwarded.' });
    }
    approvals.push({
      id: id('APR'), type: 'RA_BILL', projectId: p.id, amount: bill.netPayable, submittedBy: users.find((u) => u.id === p.siteEngineerId)?.name ?? 'Deputy Engineer',
      submittedDate: bill.submittedDate, documents: ['Measurement Book Extract', 'RA Bill Form', 'Site Photographs'],
      comments: `RA Bill ${bill.billNumber} for period ${bill.periodFrom} to ${bill.periodTo}.`,
      status: bill.status === 'REJECTED' ? 'REJECTED' : bill.status === 'PAID' || bill.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
      chain, currentStepIndex, history, relatedBillId: bill.id,
    });
  }
  // a few non-bill approvals
  for (const p of projects.slice(0, 8)) {
    const type = pick(['DESIGN_CHANGE', 'MILESTONE_COMPLETION', 'MATERIAL_APPROVAL', 'EXTENSION_OF_TIME'] as const);
    const chain = chainMap[type];
    approvals.push({
      id: id('APR'), type, projectId: p.id, submittedBy: users.find((u) => u.id === p.siteEngineerId)?.name ?? 'Deputy Engineer',
      submittedDate: iso(addDays(TODAY, -int(1, 25))), documents: ['Supporting Document.pdf'],
      comments: type === 'EXTENSION_OF_TIME' ? `Requesting extension of time due to ${p.delayReason ?? 'site'} constraints.` : 'Please review and approve.',
      status: pick(['PENDING', 'PENDING', 'APPROVED', 'SENT_BACK']), chain, currentStepIndex: int(0, chain.length - 1), history: [],
    });
  }

  // ---------- WORKERS & ATTENDANCE ----------
  const workers: Worker[] = [];
  const attendance: AttendanceRecord[] = [];
  const workerRoles: WorkerRole[] = ['Mason', 'Electrician', 'Plumber', 'Carpenter', 'Steel Worker', 'Equipment Operator', 'General Worker', 'Safety Worker'];
  for (let i = 0; i < 50; i++) {
    const p = pick(projects);
    const role = pick(workerRoles);
    const w: Worker = {
      id: id('WRK'), name: randomFullName(rng), role, contractorId: p.contractorId, projectId: p.id,
      skillLevel: role === 'General Worker' ? 'Unskilled' : pick(['Skilled', 'Semi-Skilled']),
      shift: pick(['Day', 'Day', 'Day', 'Night']), attendanceStatus: pick(['PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'ON_LEAVE']),
      safetyTrainingStatus: pick(['COMPLETED', 'COMPLETED', 'PENDING', 'EXPIRED']),
      phone: `9${int(100000000, 999999999)}`, joinDate: iso(addDays(TODAY, -int(30, 500))),
    };
    workers.push(w);
    for (let d = 0; d < 7; d++) {
      const date = addDays(TODAY, -d);
      if (rng() > 0.12) {
        attendance.push({
          id: id('ATT'), workerId: w.id, projectId: p.id, date: iso(date),
          checkIn: `0${int(7, 8)}:${int(10, 55)}`, checkOut: `1${int(7, 8)}:${int(10, 55)}`,
          method: pick(['QR', 'MANUAL']), shift: w.shift,
        });
      }
    }
  }

  // ---------- SAFETY ----------
  const safetyRecords: SafetyRecord[] = [];
  for (const p of projects) {
    const count = int(1, 4);
    for (let i = 0; i < count; i++) {
      const type = pick(['INSPECTION', 'ACCIDENT', 'NEAR_MISS', 'VIOLATION', 'TRAINING'] as const);
      safetyRecords.push({
        id: id('SAF'), projectId: p.id, type, date: iso(addDays(TODAY, -int(1, 90))),
        description: type === 'ACCIDENT' ? 'Minor hand injury during formwork removal; first aid administered.' : type === 'NEAR_MISS' ? 'Load swing near scaffolding, no injury reported.' : type === 'VIOLATION' ? 'Worker found without safety helmet in casting zone.' : type === 'TRAINING' ? 'Toolbox talk conducted on working-at-height safety.' : 'Routine safety walkthrough of site.',
        severity: pick(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        correctiveAction: type === 'ACCIDENT' || type === 'VIOLATION' ? 'Safety briefing reinforced; PPE compliance check increased.' : 'No action required.',
        status: pick(['OPEN', 'CLOSED', 'CLOSED']),
        ppeCompliance: int(65, 100),
      });
    }
  }

  // ---------- RISKS ----------
  const risks: Risk[] = [];
  const riskCatalog = [
    { risk: 'Monsoon delay to structural works', category: 'Weather' },
    { risk: 'Cement price escalation', category: 'Financial' },
    { risk: 'Delay in electrical materials supply', category: 'Material' },
    { risk: 'Land encroachment dispute', category: 'Land' },
    { risk: 'Skilled labour shortage', category: 'Labour' },
    { risk: 'Design change from client', category: 'Design' },
    { risk: 'Contractor cash-flow constraint', category: 'Financial' },
    { risk: 'Utility shifting delay (electric line)', category: 'Utility' },
  ];
  for (const p of projects) {
    const count = int(1, 3);
    for (let i = 0; i < count; i++) {
      const r = pick(riskCatalog);
      const probability = int(1, 5);
      const impact = int(1, 5);
      const score = probability * impact;
      risks.push({
        id: id('RSK'), projectId: p.id, risk: r.risk, category: r.category, probability, impact, score,
        level: score >= 16 ? 'CRITICAL' : score >= 10 ? 'HIGH' : score >= 5 ? 'MEDIUM' : 'LOW',
        owner: users.find((u) => u.id === p.executiveEngineerId)?.name ?? 'Executive Engineer',
        mitigation: 'Weekly monitoring and mitigation plan tracked with contractor coordination.',
        dueDate: iso(addDays(TODAY, int(5, 60))), status: pick(['OPEN', 'MITIGATED', 'CLOSED']),
      });
    }
  }

  // ---------- DOCUMENTS ----------
  const documents: ProjectDocument[] = [];
  const docTypes: DocumentType[] = ['DPR', 'Administrative Sanction', 'Technical Sanction', 'Tender', 'Work Order', 'Agreement', 'BOQ', 'Drawings', 'Inspection Report', 'Test Report', 'Bills', 'Approvals', 'Completion Certificate', 'Handover Documents'];
  let docCount = 0;
  for (const p of projects) {
    const numDocs = docCount < 45 ? int(2, 4) : 1;
    for (let i = 0; i < numDocs && docCount < 50; i++) {
      const type = pick(docTypes);
      documents.push({
        id: id('DOC'), projectId: p.id, name: `${type} — ${p.name}`.slice(0, 70), type,
        uploadedBy: users.find((u) => u.id === p.siteEngineerId)?.name ?? 'Deputy Engineer',
        uploadDate: iso(addDays(TODAY, -int(1, 300))), version: int(1, 3),
        approvalStatus: pick(['APPROVED', 'APPROVED', 'PENDING', 'REJECTED']), sizeKb: int(120, 8000),
      });
      docCount++;
    }
  }

  // ---------- COMMISSIONING & HANDOVER ----------
  const commissioning: CommissioningItem[] = [];
  const handoverSteps: HandoverStep[] = [];
  for (const p of projects) {
    const nearComplete = p.physicalProgress >= 85 || p.status === 'COMPLETED';
    for (const item of COMMISSIONING_ITEMS) {
      commissioning.push({
        id: id('COM'), projectId: p.id, item,
        status: p.status === 'COMPLETED' ? 'READY' : nearComplete ? pick(['READY', 'READY', 'PENDING', 'NOT_READY']) : 'NOT_READY',
        remarks: p.status === 'COMPLETED' ? 'Verified and ready.' : nearComplete ? 'Under final verification.' : 'Pending construction completion.',
        updatedDate: iso(addDays(TODAY, -int(1, 30))),
      });
    }
    HANDOVER_STEPS.forEach((step, i) => {
      const ratio = i / (HANDOVER_STEPS.length - 1);
      let status: HandoverStep['status'] = 'PENDING';
      if (p.status === 'COMPLETED') status = 'COMPLETED';
      else if (nearComplete && ratio < 0.3) status = pick(['COMPLETED', 'IN_PROGRESS']);
      handoverSteps.push({
        id: id('HND'), projectId: p.id, step, order: i, status,
        date: status === 'COMPLETED' ? iso(addDays(TODAY, -int(1, 60))) : undefined,
        responsible: i < 2 ? 'Deputy Engineer' : i < 5 ? 'Executive Engineer' : i < 6 ? 'District Health Officer / Civil Surgeon' : 'Medical Officer',
      });
    });
  }

  // ---------- GOVERNANCE REGISTERS ----------
  // Change / Variation Management
  const changeOrders: ChangeOrder[] = [];
  const changeReasons = ['Additional flooring works in OPD block', 'Revised electrical load requirement', 'Addition of ramp for accessibility compliance', 'Upgraded fire safety specification', 'Site condition variance requiring redesign of foundation'];
  for (const p of projects.slice(0, 12)) {
    if (rng() > 0.55) continue;
    const costImpact = Math.round(p.sanctionedBudget * (0.01 + rng() * 0.05)) * (rng() > 0.15 ? 1 : -1);
    const status = pick(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'APPROVED', 'REJECTED'] as const);
    changeOrders.push({
      id: id('CHG'), projectId: p.id, title: pick(changeReasons), reason: pick(changeReasons),
      costImpact, scheduleImpactDays: int(0, 30),
      requestedBy: users.find((u) => u.id === p.executiveEngineerId)?.name ?? 'Executive Engineer',
      requestedDate: iso(addDays(TODAY, -int(5, 90))),
      supportingDocument: 'Variation Justification Note.pdf', status,
      approvedBy: status === 'APPROVED' ? users.find((u) => u.id === p.executiveEngineerId)?.name : undefined,
      approvedDate: status === 'APPROVED' ? iso(addDays(TODAY, -int(1, 30))) : undefined,
    });
  }

  // Extension of Time
  const extensionsOfTime: ExtensionOfTime[] = [];
  for (const p of projects) {
    if (p.delayDays === 0 || rng() > 0.6) continue;
    const status = pick(['PENDING', 'RECOMMENDED', 'APPROVED', 'APPROVED', 'REJECTED'] as const);
    const daysRequested = Math.max(15, p.delayDays + int(-10, 20));
    extensionsOfTime.push({
      id: id('EOT'), projectId: p.id, reason: p.delayReason ?? 'Other', daysRequested,
      requestedBy: users.find((u) => u.id === p.executiveEngineerId)?.name ?? 'Executive Engineer',
      requestedDate: iso(addDays(TODAY, -int(10, 60))),
      supportingDocument: 'EOT Request with Delay Analysis.pdf',
      recommendation: status !== 'PENDING' ? 'Delay substantiated by site records; recommended for approval with cost neutrality.' : undefined,
      recommendedBy: status !== 'PENDING' ? users.find((u) => u.id === p.executiveEngineerId)?.name : undefined,
      status,
      approvedDays: status === 'APPROVED' ? daysRequested - int(0, 5) : undefined,
      approvedDate: status === 'APPROVED' ? iso(addDays(TODAY, -int(1, 20))) : undefined,
      revisedCompletionDate: status === 'APPROVED' ? iso(addDays(new Date(p.plannedCompletionDate), daysRequested - int(0, 5))) : undefined,
    });
  }

  // Site Issue / Hindrance Register
  const siteIssues: SiteIssue[] = [];
  const issueCatalog: { category: SiteIssue['category']; description: string; impact: SiteIssue['impact'] }[] = [
    { category: 'LAND', description: 'Boundary dispute with adjoining landowner delaying compound wall construction.', impact: 'SCHEDULE' },
    { category: 'UTILITY_SHIFTING', description: 'Existing HT electrical line requires shifting before foundation work can proceed.', impact: 'BOTH' },
    { category: 'PERMISSION_DELAY', description: 'Tree-cutting permission from Forest Department pending.', impact: 'SCHEDULE' },
    { category: 'DRAWING_DELAY', description: 'Revised structural drawings for basement awaited from design consultant.', impact: 'SCHEDULE' },
    { category: 'MATERIAL_SHORTAGE', description: 'TMT steel delivery delayed due to supplier capacity constraints.', impact: 'SCHEDULE' },
    { category: 'HOSPITAL_OPERATIONAL_CONSTRAINT', description: 'Construction near OPD block restricted to non-working hours due to ongoing hospital operations.', impact: 'SCHEDULE' },
  ];
  for (const p of projects.slice(0, 14)) {
    if (rng() > 0.45) continue;
    const issue = pick(issueCatalog);
    const status = pick(['OPEN', 'IN_PROGRESS', 'IN_PROGRESS', 'RESOLVED'] as const);
    siteIssues.push({
      id: id('ISS'), projectId: p.id, category: issue.category, description: issue.description,
      raisedBy: users.find((u) => u.id === p.siteEngineerId)?.name ?? 'Deputy Engineer',
      raisedDate: iso(addDays(TODAY, -int(5, 60))),
      owner: users.find((u) => u.id === p.executiveEngineerId)?.name ?? 'Executive Engineer',
      targetResolutionDate: status !== 'RESOLVED' ? iso(addDays(TODAY, int(5, 30))) : undefined,
      status, resolvedDate: status === 'RESOLVED' ? iso(addDays(TODAY, -int(1, 15))) : undefined,
      impact: issue.impact,
    });
  }

  // Decision Tracker — surfaced on Secretary/Commissioner dashboards.
  const decisions: Decision[] = [];
  const decisionCatalog = [
    { text: 'Approve revised estimate for structural design change', role: 'COMMISSIONER' as Role, priority: 'HIGH' as const },
    { text: 'Approve extension of time due to utility shifting delay', role: 'REGIONAL_DIRECTOR' as Role, priority: 'MEDIUM' as const },
    { text: 'Decide on contractor show-cause response for repeated delays', role: 'COMMISSIONER' as Role, priority: 'CRITICAL' as const },
    { text: 'Approve additional budget allocation for medical gas infrastructure', role: 'MINISTER' as Role, priority: 'HIGH' as const },
    { text: 'Approve change in project scope — additional floor', role: 'COMMISSIONER' as Role, priority: 'MEDIUM' as const },
    { text: 'Ratify emergency repair works undertaken without prior approval', role: 'CIVIL_SURGEON' as Role, priority: 'HIGH' as const },
  ];
  for (let i = 0; i < 6; i++) {
    const p = projects[i % projects.length];
    const d = decisionCatalog[i % decisionCatalog.length];
    decisions.push({
      id: id('DEC'), projectId: p.id, decisionRequired: d.text,
      financialImpact: rng() > 0.3 ? Math.round(p.sanctionedBudget * (0.02 + rng() * 0.08)) : undefined,
      scheduleImpactDays: rng() > 0.4 ? int(10, 60) : undefined,
      recommendedAction: 'Field and technical teams recommend approval subject to standard conditions.',
      pendingWith: d.role, pendingSince: iso(addDays(TODAY, -int(3, 45))),
      priority: d.priority, status: 'PENDING',
    });
  }

  // ---------- NOTIFICATIONS ----------
  const notifications: Notification[] = [
    { id: id('NOT'), message: `Quality inspection FAILED at Ward Block B — ${flagship.name}.`, type: 'CRITICAL', date: flagshipFailInspection.completedDate!, read: false, projectId: flagship.id, targetRoles: ['MINISTER', 'COMMISSIONER', 'EXECUTIVE_ENGINEER', 'CIVIL_SURGEON', 'VIGILANCE_AUDIT'] },
    { id: id('NOT'), message: `RA Bill requires your approval — ${flagship.name}.`, type: 'APPROVAL', date: iso(addDays(TODAY, -1)), read: false, projectId: flagship.id, targetRoles: ['EXECUTIVE_ENGINEER', 'COMMISSIONER', 'DEPUTY_ENGINEER'] },
    { id: id('NOT'), message: `${flagship.name} is ${flagship.delayDays || 18} days behind schedule.`, type: 'WARNING', date: iso(addDays(TODAY, -2)), read: false, projectId: flagship.id, targetRoles: ['MINISTER', 'COMMISSIONER', 'CIVIL_SURGEON', 'EXECUTIVE_ENGINEER'] },
    { id: id('NOT'), message: 'Fire safety inspection is pending at Sub-District Hospital — Nagpur.', type: 'WARNING', date: iso(addDays(TODAY, -1)), read: false, projectId: projects[2].id, targetRoles: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'] },
    { id: id('NOT'), message: `Contractor ${flagshipContractor.company} has ${flagshipContractor.openDefects} overdue defects.`, type: 'ALERT', date: iso(addDays(TODAY, -1)), read: false, projectId: flagship.id, targetRoles: ['EXECUTIVE_ENGINEER', 'CONTRACTOR', 'CIVIL_SURGEON'] },
    { id: id('NOT'), message: `Budget utilization has crossed 80% at ${projects[3].name}.`, type: 'WARNING', date: iso(addDays(TODAY, -3)), read: true, projectId: projects[3].id, targetRoles: ['MINISTER', 'COMMISSIONER'] },
    { id: id('NOT'), message: `Site progress report has not been submitted for 3 days — ${projects[5].name}.`, type: 'ALERT', date: iso(addDays(TODAY, -1)), read: false, projectId: projects[5].id, targetRoles: ['DEPUTY_ENGINEER', 'EXECUTIVE_ENGINEER'] },
    { id: id('NOT'), message: 'New defect assigned requiring corrective action within 5 days.', type: 'ALERT', date: flagshipFailInspection.completedDate!, read: false, projectId: flagship.id, targetRoles: ['CONTRACTOR'] },
  ];

  // ---------- AUDIT LOG ----------
  const auditLog: AuditEntry[] = [
    { id: id('AUD'), user: flagshipFailInspection.inspector, role: 'DEPUTY_ENGINEER', action: 'Marked Structural Inspection as FAILED', project: flagship.name, timestamp: flagshipFailInspection.completedDate! + 'T11:04:00', previousValue: 'IN_PROGRESS', newValue: 'FAIL' },
    { id: id('AUD'), user: users.find((u) => u.id === flagship.siteEngineerId)?.name ?? 'Deputy Engineer', role: 'DEPUTY_ENGINEER', action: 'Uploaded 4 foundation progress photographs', project: flagship.name, timestamp: iso(addDays(TODAY, -6)) + 'T15:20:00' },
    { id: id('AUD'), user: users.find((u) => u.id === flagship.executiveEngineerId)?.name ?? 'Executive Engineer', role: 'EXECUTIVE_ENGINEER', action: 'Approved RA Bill', project: flagship.name, timestamp: iso(addDays(TODAY, -3)) + 'T10:32:00' },
  ];
  for (let i = 0; i < 30; i++) {
    const p = pick(projects);
    const u = pick(users);
    auditLog.push({
      id: id('AUD'), user: u.name, role: u.role,
      action: pick(['Updated site progress report', 'Uploaded site photographs', 'Reviewed quality checklist', 'Verified measurement book entry', 'Updated project status', 'Added risk register entry', 'Marked defect as fixed', 'Scheduled quality inspection']),
      project: p.name, timestamp: `${iso(addDays(TODAY, -int(1, 60)))}T${int(8, 18)}:${int(10, 55)}:00`,
    });
  }
  auditLog.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  // ---------- OBSERVATIONS ----------
  const observations: Observation[] = [];
  const observerUsers = users.filter((u) => u.role === 'VIGILANCE_AUDIT');
  for (const p of projects.slice(0, 10)) {
    if (rng() > 0.5) continue;
    observations.push({
      id: id('OBS'), projectId: p.id, observer: pick(observerUsers).name, date: iso(addDays(TODAY, -int(1, 20))),
      category: pick(['Quality', 'Safety', 'Progress', 'Documentation']),
      note: pick(['Site cleanliness and material stacking needs improvement.', 'Progress consistent with reported physical percentage.', 'PPE compliance observed to be satisfactory.', 'Discrepancy noted between reported and observed progress.']),
      recommendedAction: pick(['Continue monitoring', 'Flag to Executive Engineer', 'Schedule follow-up visit', 'No action required']),
      status: pick(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
      imageSeed: p.imageSeed * 71 + observations.length,
    });
  }

  return {
    users, projects, tenders, milestones, progressReports, photos, inspections, defects, approvals,
    contractors, workers, attendance, bills, measurements, boqItems, materials, materialTests,
    safetyRecords, risks, documents, commissioning, handoverSteps, notifications, auditLog, observations,
    changeOrders, extensionsOfTime, siteIssues, decisions,
    contractorPocs, qualityFailures, qualityReports, inspectionAppointments,
  };
}
