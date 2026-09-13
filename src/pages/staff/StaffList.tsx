import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, StatusBadge, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent } from '../../components/ui/overlays';
import { Avatar } from '../../components/ui/forms';
import { formatDate } from '../../lib/utils';
import type { Role } from '../../types';

const STAFF_ROLES: Role[] = ['EXECUTIVE_ENGINEER', 'DEPUTY_ENGINEER', 'MEDICAL_OFFICER', 'VIGILANCE_AUDIT', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR', 'COMMISSIONER', 'SUPERADMIN', 'IT_ADMIN'];

export function StaffList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const users = useStore((s) => s.users);
  const projects = useStore((s) => s.projects);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = roleFilter === 'ALL' ? users : users.filter((u) => u.role === roleFilter);
  const active = users.find((u) => u.id === detailId);

  return (
    <div>
      <PageHeader title={t('pages.staff.title')} description={t('pages.staff.desc', { count: users.length })} />

      <div className="mb-3">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All Roles</SelectItem>{STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{t(`roles.${r}`)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>Name</Th><Th>Designation</Th><Th>Department</Th><Th>District</Th><Th>Assigned Projects</Th><Th>Availability</Th><Th>Last Site Visit</Th></Tr></THead>
          <TBody>
            {filtered.map((u) => (
              <Tr key={u.id} onClick={() => setDetailId(u.id)}>
                <Td><div className="flex items-center gap-2"><Avatar name={u.name} size={26} /><span className="font-medium text-slate-800">{u.name}</span></div></Td>
                <Td>{u.designation}</Td>
                <Td className="max-w-[180px] truncate">{u.department}</Td>
                <Td>{u.district}</Td>
                <Td>{u.assignedProjectIds.length}</Td>
                <Td><StatusBadge status={u.availability === 'AVAILABLE' ? 'APPROVED' : u.availability === 'ON_SITE' ? 'ACTIVE' : 'PENDING'} label={u.availability?.replace('_', ' ')} /></Td>
                <Td>{formatDate(u.lastSiteVisit)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={active.name} description={active.designation}>
            <div className="space-y-2 text-xs">
              <Row label="Department" value={active.department} />
              <Row label="Email" value={active.email} />
              <Row label="Phone" value={active.phone} />
              <Row label="District" value={active.district ?? '—'} />
              <Row label="Availability" value={active.availability ?? '—'} />
              <Row label="Last Site Visit" value={formatDate(active.lastSiteVisit)} />
            </div>
            <p className="mb-2 mt-4 text-xs font-semibold text-slate-600">Assigned Projects</p>
            <div className="flex flex-wrap gap-1.5">
              {active.assignedProjectIds.length === 0 && <p className="text-xs text-slate-400">No projects assigned.</p>}
              {active.assignedProjectIds.map((pid) => {
                const p = projects.find((x) => x.id === pid);
                return p && <button key={pid} onClick={() => navigate(`/projects/${pid}`)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100">{p.name}</button>;
              })}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{label}</span><span className="font-medium text-slate-700">{value}</span></div>;
}
