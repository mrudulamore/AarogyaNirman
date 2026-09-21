import { useNavigate } from 'react-router-dom';
import { activeControls, CERTIFICATES, validControl } from '../../lib/projectControls';
import { useStore } from '../../store/useStore';
import { uiText } from '../../i18n/ui';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '../ui/primitives';

export function RegulatoryCertificateGrid({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const state = useStore();
  const records = activeControls(state, projectId).filter(record => record.kind === 'CERTIFICATE');
  return <Card><CardHeader><CardTitle>{uiText('Regulatory certificates and evidence')}</CardTitle></CardHeader><CardContent className="grid gap-2 p-4 sm:grid-cols-2">
    {CERTIFICATES.map(category => {
      const record = records.find(item => item.category === category);
      const ready = !!record && validControl(record);
      return <button key={category} type="button" onClick={() => navigate(`/projects/${projectId}?tab=controls&kind=CERTIFICATE`)} className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50">
        <div className="flex items-start justify-between gap-2"><strong className="text-sm text-slate-800">{uiText(category)}</strong><StatusBadge status={ready ? 'APPROVED' : 'PENDING'} label={uiText(ready ? 'Verified' : 'Pending')} /></div>
        <p className="mt-2 text-xs text-slate-600">{uiText('Issuing authority')}: {record?.fields.authority || '—'} · {uiText('Issue date')}: {record?.fields.issueDate ? formatDate(record.fields.issueDate) : '—'}</p>
        <p className="mt-1 text-xs text-slate-600">{uiText('Expiry date')}: {record?.fields.expiryDate ? formatDate(record.fields.expiryDate) : '—'} · {uiText('Supporting proof')}: {record?.attachments.length ?? 0}</p>
      </button>;
    })}
  </CardContent></Card>;
}
