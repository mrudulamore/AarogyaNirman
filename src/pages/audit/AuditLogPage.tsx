import { uiText, useUiLanguage } from '../../i18n/ui';
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
  useUiLanguage();
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
      <PageHeader title={uiText(t('pages.audit.title'))} description={uiText(t('pages.audit.desc', { count: auditLog.length }))} />

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">{uiText("All Projects")}</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">{uiText("All Roles")}</SelectItem>{(Object.keys(ROLE_LABELS) as Role[]).map((r) => <SelectItem key={r} value={r}>{t(`roles.${r}`)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <THead><Tr><Th>{uiText("Timestamp")}</Th><Th>{uiText("User")}</Th><Th>{uiText("Role")}</Th><Th>{uiText("Action")}</Th><Th>{uiText("Project")}</Th><Th>{uiText("Change")}</Th></Tr></THead>
          <TBody>
            {filtered.slice(0, 200).map((a) => (
              <Tr key={a.id}>
                <Td className="whitespace-nowrap">{uiText(formatDateTime(a.timestamp))}</Td>
                <Td className="font-medium text-slate-800">{uiText(a.user)}</Td>
                <Td>{t(`roles.${a.role}`)}</Td>
                <Td>{uiText(a.action)}</Td>
                <Td className="max-w-[180px] truncate">{uiText(a.project ?? '—')}</Td>
                <Td>{a.previousValue && a.newValue ? <span className="font-mono text-[11px]">{uiText(a.previousValue)} → {uiText(a.newValue)}</span> : '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
