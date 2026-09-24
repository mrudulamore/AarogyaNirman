import type { Contractor, Inspection, InspectionAppointment, Project, QualityFailure, QualityReport, User } from '../types';

type DemoPeople = {
  users: User[]; projects: Project[]; contractors: Contractor[];
  inspections?: Inspection[]; inspectionAppointments?: InspectionAppointment[];
  qualityFailures?: QualityFailure[]; qualityReports?: QualityReport[];
};

/** Repair generated demo identities only; retain real allocations and their history. */
export function withInspectionDemoPeople<T extends DemoPeople>(data: T): T {
  const generated = (id: string, prefix: string) => new RegExp(`^(?:DEMO24-\\d+-)?${prefix}-\\d{4}$`).test(id);
  const people = (projectId: string) => {
    const project = data.projects.find(p => p.id === projectId);
    if (project?.division !== 'Pune Division') return undefined;
    const je = data.users.find(u => u.id === project.siteEngineerId);
    const ee = data.users.find(u => u.id === project.executiveEngineerId);
    const firm = data.contractors.find(c => c.id === project.contractorId);
    const contractor = data.users.find(u => u.role === 'CONTRACTOR' && u.contractorId === firm?.id && u.assignedProjectIds.includes(projectId));
    return je && ee ? { je, ee, contractorName: contractor?.name ?? firm?.contactPerson, contractorId: contractor?.id ?? (firm ? `ACCOUNT-${firm.id}` : undefined) } : undefined;
  };
  const repaired = new Set<string>();
  const inspections = data.inspections?.map(inspection => {
    const assigned = people(inspection.projectId);
    if (!assigned || !generated(inspection.id, 'INS') || inspection.assignedToId || inspection.createdById || inspection.assignmentHistory?.length) return inspection;
    repaired.add(inspection.id);
    return { ...inspection, inspector: assigned.je.name, assignedToId: assigned.je.id, assignedRole: assigned.je.role, createdById: assigned.ee.id,
      assignmentHistory: [{ assignedToId: assigned.je.id, assignedToName: assigned.je.name, role: assigned.je.role, assignedBy: assigned.ee.name, date: inspection.scheduledDate, reason: 'Demo hospital allocation' }],
    };
  });
  const inspectionAppointments = data.inspectionAppointments?.map(appointment => {
    const assigned = people(appointment.projectId);
    if (!assigned || !generated(appointment.id, 'APT') || appointment.requestedById || appointment.assignedById) return appointment;
    const requester = appointment.requestedByRole === 'DEPUTY_ENGINEER' ? assigned.je
      : appointment.requestedByRole === 'EXECUTIVE_ENGINEER' ? assigned.ee
        : appointment.requestedByRole === 'CONTRACTOR' ? { id: assigned.contractorId, name: assigned.contractorName } : undefined;
    return { ...appointment, requestedBy: requester?.name ?? appointment.requestedBy, requestedById: requester?.id,
      assignedInspector: assigned.je.name, assignedInspectorId: assigned.je.id,
      assignedBy: assigned.ee.name, assignedById: assigned.ee.id,
      governmentPoc: assigned.je.name, contractorPoc: assigned.contractorName,
      attendees: [assigned.je.name, assigned.ee.name, ...(assigned.contractorName ? [assigned.contractorName] : [])],
    };
  });
  return { ...data, inspections, inspectionAppointments,
    qualityReports: data.qualityReports?.map(report => report.inspectionId && repaired.has(report.inspectionId) ? { ...report, inspector: people(report.projectId)!.je.name } : report),
    qualityFailures: data.qualityFailures?.map(failure => repaired.has(failure.inspectionId) ? { ...failure, inspector: people(failure.projectId)!.je.name } : failure),
    puneDemoVersion: 4,
  };
}
