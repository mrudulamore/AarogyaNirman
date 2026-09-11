import { useTranslation } from 'react-i18next';
import type { Project } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { Card, Table, THead, TBody, Tr, Th, Td, EmptyState } from '../../../../components/ui/primitives';
import { formatDateTime } from '../../../../lib/utils';
import { History } from 'lucide-react';

export function AuditTab({ project }: { project: Project }) {
  const { t } = useTranslation();
  const auditLog = useStore((s) => s.auditLog).filter((a) => a.project === project.name);

  return (
    <Card>
      {auditLog.length === 0 ? <EmptyState icon={<History size={32} />} title="No audit entries for this project yet" /> : (
        <Table>
          <THead><Tr><Th>Timestamp</Th><Th>User</Th><Th>Role</Th><Th>Action</Th><Th>Change</Th></Tr></THead>
          <TBody>
            {auditLog.map((a) => (
              <Tr key={a.id}>
                <Td className="whitespace-nowrap">{formatDateTime(a.timestamp)}</Td>
                <Td className="font-medium text-slate-800">{a.user}</Td>
                <Td>{t(`roles.${a.role}`)}</Td>
                <Td>{a.action}</Td>
                <Td>{a.previousValue && a.newValue ? <span className="font-mono text-[11px]">{a.previousValue} → {a.newValue}</span> : '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
