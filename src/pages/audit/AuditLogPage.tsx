import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { formatDateTime } from '../../lib/utils';
import { ROLE_LABELS } from '../../lib/constants';
import type { Role } from '../../types';

export function AuditLogPage() {
  const { t } = useTranslation();
  const { projects, isStatewide } = useProjectScope();
  const allAuditLog = useStore((s) => s.auditLog);
  const scopedNames = new Set(projects.map((p) => p.name));
  // District Admins etc. see entries for projects in their jurisdiction, plus system-level entries with no project attached.
  const auditLog = isStatewide ? allAuditLog : allAuditLog.filter((a) => !a.project || scopedNames.has(a.project));
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filtered = auditLog.filter((a) => (projectFilter === 'ALL' || a.project === projectFilter) && (roleFilter === 'ALL' || a.role === roleFilter));

  return (
    <div>
      <PageHeader title={t('pages.audit.title')} description={t('pages.audit.desc', { count: auditLog.length })} />

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All Projects</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All Roles</SelectItem>{(Object.keys(ROLE_LABELS) as Role[]).map((r) => <SelectItem key={r} value={r}>{t(`roles.${r}`)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>Timestamp</Th><Th>User</Th><Th>Role</Th><Th>Action</Th><Th>Project</Th><Th>Change</Th></Tr></THead>
          <TBody>
            {filtered.slice(0, 200).map((a) => (
              <Tr key={a.id}>
                <Td className="whitespace-nowrap">{formatDateTime(a.timestamp)}</Td>
                <Td className="font-medium text-slate-800">{a.user}</Td>
                <Td>{t(`roles.${a.role}`)}</Td>
                <Td>{a.action}</Td>
                <Td className="max-w-[180px] truncate">{a.project ?? '—'}</Td>
                <Td>{a.previousValue && a.newValue ? <span className="font-mono text-[11px]">{a.previousValue} → {a.newValue}</span> : '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
