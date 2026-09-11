import { useNavigate } from 'react-router-dom';
import { UserRound, HardHat, Building2, Landmark, Crown, Briefcase } from 'lucide-react';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, CardContent, CardHeader, CardTitle, Badge, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../../../components/ui/primitives';
import { ROLE_LABELS } from '../../../../lib/constants';
import { Avatar } from '../../../../components/ui/forms';
import { ContractorSummaryCard } from '../../../../components/common/ContractorSummaryCard';

export function TeamTab({ project }: { project: Project }) {
  const navigate = useNavigate();
  const users = useStore((s) => s.users);
  const contractors = useStore((s) => s.contractors);
  const contractorPocs = useStore((s) => s.contractorPocs);
  const defects = useStore((s) => s.defects);

  const ownerDirector = users.find((u) => u.id === project.ownerDirectorId);
  const projectManager = users.find((u) => u.id === project.projectManagerId);
  const ee = users.find((u) => u.id === project.executiveEngineerId);
  const se = users.find((u) => u.id === project.siteEngineerId);
  const contractor = contractors.find((c) => c.id === project.contractorId);
  const projectPocs = contractorPocs.filter((poc) => poc.contractorId === project.contractorId && poc.assignedProjectIds.includes(project.id));

  const members = [
    ownerDirector && { user: ownerDirector, role: 'Owner / Director', icon: Crown, note: 'Senior government owner accountable for project outcome.' },
    projectManager && projectManager.id !== ownerDirector?.id && { user: projectManager, role: 'Project Manager', icon: Briefcase, note: 'Operationally responsible for day-to-day coordination.' },
    ee && { user: ee, role: 'Executive Engineer', icon: HardHat, note: 'Technical sanction, certification & governance approvals for this project.' },
    se && { user: se, role: 'Junior / Deputy Engineer', icon: UserRound, note: 'Field verification, quality checks and daily site oversight.' },
  ].filter(Boolean) as { user: (typeof users)[number]; role: string; icon: any; note: string }[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {members.map(({ user, role, icon: Icon, note }) => (
          <Card key={user.id}>
            <CardContent className="flex gap-3 p-4">
              <Avatar name={user.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                  <Badge className="flex items-center gap-1"><Icon size={11} /> {role}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{user.designation}</p>
                <p className="text-[11px] text-slate-400">{user.department}</p>
                <p className="mt-1.5 text-[11px] text-slate-500">{note}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                  <span>{user.email}</span>
                  <span>{user.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {contractor && (
          <Card>
            <CardContent className="flex gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Building2 size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-800">{contractor.company}</p>
                  <Badge className="flex items-center gap-1"><HardHat size={11} /> Contractor</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Reg. {contractor.regId} · {contractor.contactPerson}</p>
                <p className="mt-1.5 text-[11px] text-slate-500">Responsible for construction execution, field submissions and RA bill claims.</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                  <span>{contractor.email}</span>
                  <span>{contractor.phone}</span>
                </div>
                <button onClick={() => navigate(`/contractors/${contractor.id}?from=${project.id}`)} className="mt-2 text-[11px] font-medium text-navy-700 underline">View Contractor Profile →</button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Landmark size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-800">{project.pmcName}</p>
                <Badge>PMC / Design Consultancy</Badge>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">Project management consultancy supporting technical supervision and drawings.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {contractor && (
        <ContractorSummaryCard
          contractor={contractor}
          projectId={project.id}
          openDefects={defects.filter((d) => d.contractorId === contractor.id && d.status !== 'CLOSED').length}
          totalDefects={defects.filter((d) => d.projectId === project.id && d.contractorId === contractor.id).length}
        />
      )}

      {contractor && (
        <Card>
          <CardHeader><CardTitle>{contractor.company} — Project Points of Contact</CardTitle></CardHeader>
          {projectPocs.length === 0 ? (
            <CardContent className="p-4 text-xs text-slate-400">No points of contact assigned to this project yet.</CardContent>
          ) : (
            <Table>
              <THead><Tr><Th>Name</Th><Th>Designation</Th><Th>Role</Th><Th>Phone</Th><Th>Email</Th><Th>Responsibility</Th><Th>Availability</Th><Th>Primary</Th></Tr></THead>
              <TBody>
                {projectPocs.map((poc) => (
                  <Tr key={poc.id}>
                    <Td className="font-medium text-slate-800">{poc.name}</Td>
                    <Td>{poc.designation}</Td>
                    <Td>{poc.role}</Td>
                    <Td>{poc.phone}</Td>
                    <Td className="max-w-[160px] truncate">{poc.email}</Td>
                    <Td className="max-w-[200px] truncate">{poc.responsibility}</Td>
                    <Td><StatusBadge status={poc.siteAvailability === 'ON_SITE' ? 'ACTIVE' : poc.siteAvailability === 'AVAILABLE' ? 'APPROVED' : 'PENDING'} label={poc.siteAvailability.replace('_', ' ')} /></Td>
                    <Td>{poc.isPrimary ? <Badge className="border-navy-200 bg-navy-50 text-navy-700">Primary</Badge> : <span className="text-slate-400">Secondary</span>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">Jurisdiction Chain of Custody</p>
          <p className="text-[11px] text-slate-500">
            {project.division} → {project.district} District → {project.taluka} → {project.name}. Governance escalation for this project flows: Deputy Engineer → Executive Engineer → {ROLE_LABELS.CIVIL_SURGEON} → {ROLE_LABELS.REGIONAL_DIRECTOR} → {ROLE_LABELS.COMMISSIONER} → {ROLE_LABELS.MINISTER}, with the {ROLE_LABELS.VIGILANCE_AUDIT} holding independent statewide oversight at every level.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
