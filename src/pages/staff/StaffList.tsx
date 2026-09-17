import { useProjectScope } from '../../lib/scope';
import { uiText, useUiLanguage } from '../../i18n/ui';
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

const STAFF_ROLES: Role[] = ['EXECUTIVE_ENGINEER', 'PROJECT_MANAGER', 'DEPUTY_ENGINEER', 'MEDICAL_OFFICER', 'VIGILANCE_AUDIT', 'CIVIL_SURGEON', 'REGIONAL_DIRECTOR', 'COMMISSIONER', 'SUPERADMIN', 'IT_ADMIN'];

export function StaffList() {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects, projectIds } = useProjectScope();
  const currentUser = useStore(s => s.currentUser);
  const restricted = ['CONTRACTOR', 'EXECUTIVE_ENGINEER', 'DEPUTY_ENGINEER', 'PROJECT_MANAGER'].includes(currentUser?.role ?? '');
  const users = useStore(s => s.users).filter(u => !restricted || u.id === currentUser?.id || u.assignedProjectIds.some(id => projectIds.has(id)) || projects.some(p => [p.executiveEngineerId, p.siteEngineerId, p.projectManagerId].includes(u.id)));
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = roleFilter === 'ALL' ? users : users.filter((u) => u.role === roleFilter);
  const active = users.find((u) => u.id === detailId);

  return (
    <div>
      <PageHeader title={uiText(t('pages.staff.title'))} description={uiText(t('pages.staff.desc', { count: users.length }))} />

      <div className="mb-3">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">{uiText("All Roles")}</SelectItem>{STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{t(`roles.${r}`)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Name")}</Th><Th>{uiText("Designation")}</Th><Th>{uiText("Department")}</Th><Th>{uiText("District")}</Th><Th>{uiText("Assigned Projects")}</Th><Th>{uiText("Availability")}</Th><Th>{uiText("Last Site Visit")}</Th></Tr></THead>
          <TBody>
            {filtered.map((u) => (
              <Tr key={u.id} onClick={() => setDetailId(u.id)}>
                <Td><div className="flex items-center gap-2"><Avatar name={u.name} size={26} /><span className="font-medium text-slate-800">{u.name}</span></div></Td>
                <Td>{uiText(u.designation)}</Td>
                <Td className="max-w-[180px] truncate">{uiText(u.department)}</Td>
                <Td>{uiText(u.district)}</Td>
                <Td>{u.assignedProjectIds.filter(id => projectIds.has(id)).length}</Td>
                <Td><StatusBadge status={u.availability === 'AVAILABLE' ? 'APPROVED' : u.availability === 'ON_SITE' ? 'ACTIVE' : 'PENDING'} label={uiText(u.availability?.replace('_', ' '))} /></Td>
                <Td>{uiText(formatDate(u.lastSiteVisit))}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        {active && (
          <DialogContent title={uiText(active.name)} description={uiText(active.designation)}>
            <div className="space-y-2 text-xs">
              <Row label={uiText("Department")} value={active.department} />
              <Row label={uiText("Email")} value={active.email} />
              <Row label={uiText("Phone")} value={active.phone} />
              <Row label={uiText("District")} value={active.district ?? '—'} />
              <Row label={uiText("Availability")} value={active.availability ?? '—'} />
              <Row label={uiText("Last Site Visit")} value={formatDate(active.lastSiteVisit)} />
            </div>
            <p className="mb-2 mt-4 text-xs font-semibold text-slate-600">{uiText("Assigned Projects")}</p>
            <div className="flex flex-wrap gap-1.5">
              {active.assignedProjectIds.length === 0 && <p className="text-xs text-slate-400">{uiText("No projects assigned.")}</p>}
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
  useUiLanguage();
  return <div className="flex justify-between border-b border-slate-50 pb-1.5"><span className="text-slate-400">{uiText(label)}</span><span className="font-medium text-slate-700">{uiText(value)}</span></div>;
}
