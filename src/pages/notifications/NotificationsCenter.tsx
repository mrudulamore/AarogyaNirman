import { uiText, useUiLanguage } from '../../i18n/ui';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, Button, EmptyState } from '../../components/ui/primitives';
import { formatDateTime, cn } from '../../lib/utils';
import { Bell, ShieldAlert, ClipboardCheck, Info, AlertTriangle } from 'lucide-react';

const TYPE_ICON: Record<string, any> = { CRITICAL: ShieldAlert, APPROVAL: ClipboardCheck, INFO: Info, WARNING: AlertTriangle, ALERT: AlertTriangle };
const TYPE_COLOR: Record<string, string> = { CRITICAL: 'text-red-600 bg-red-50', APPROVAL: 'text-govblue-700 bg-govblue-50', INFO: 'text-slate-600 bg-slate-100', WARNING: 'text-amber-600 bg-amber-50', ALERT: 'text-orange-600 bg-orange-50' };

export function NotificationsCenter() {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const notifications = useStore((s) => s.notifications);
  const currentUser = useStore((s) => s.currentUser);
  const markNotificationRead = useStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead);

  const mine = notifications.filter((n) => currentUser && n.targetRoles.includes(currentUser.role)).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <PageHeader title={uiText(t('pages.notifications.title'))} description={uiText(t('pages.notifications.desc', { count: mine.filter((n) => !n.read).length }))} actions={<Button variant="outline" size="sm" onClick={() => markAllNotificationsRead()}>{t('header.markAllRead')}</Button>} />

      {mine.length === 0 ? <EmptyState icon={<Bell size={32} />} title={uiText("No notifications")} /> : (
        <div className="space-y-2">
          {mine.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Info;
            return (
              <Card key={n.id} className={cn('cursor-pointer p-4', !n.read && 'border-l-4 border-l-govblue-500')} onClick={() => { markNotificationRead(n.id); if (n.projectId) navigate(`/projects/${n.projectId}`); }}>
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TYPE_COLOR[n.type])}><Icon size={15} /></div>
                  <div className="flex-1">
                    <p className={cn('text-sm', n.read ? 'text-slate-600' : 'font-semibold text-slate-800')}>{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{uiText(formatDateTime(n.date))}</p>
                  </div>
                  {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-govblue-600" />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
