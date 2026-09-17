import { uiMessage, uiText, useUiLanguage } from '../../i18n/ui';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { KeyRound, Users, LayoutGrid, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageHeader } from '../../components/layout/Breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch, Avatar } from '../../components/ui/forms';
import { KpiCard } from '../../components/common/KpiCard';
import { NAV_ITEMS } from '../../components/layout/navConfig';
import { ROLE_LABELS } from '../../lib/constants';
import type { Role } from '../../types';

const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];
const ALL_NAV_KEYS = Object.keys(NAV_ITEMS);

export function AccessManagement() {
  useUiLanguage();
  const { t } = useTranslation();
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.currentUser);
  const rolePermissions = useStore((s) => s.rolePermissions);
  const setRoleNavAccess = useStore((s) => s.setRoleNavAccess);
  const updateUserRole = useStore((s) => s.updateUserRole);
  const [roleFilter, setRoleFilter] = useState('ALL');

  function toggleModule(role: Role, key: string, enabled: boolean) {
    if (role === 'SUPERADMIN' && key === 'access' && !enabled) {
      toast.error(uiText('Superadmin must always retain Access Management.'));
      return;
    }
    const current = rolePermissions[role] ?? [];
    const next = enabled ? [...current, key] : current.filter((k) => k !== key);
    setRoleNavAccess(role, next);
    toast.success(uiMessage("{{0}} \"{{1}}\" for {{2}}", [enabled ? 'Granted' : 'Revoked', NAV_ITEMS[key].label, ROLE_LABELS[role]]));
  }

  function changeRole(userId: string, role: Role) {
    updateUserRole(userId, role);
    toast.success(uiText('User role updated.'));
  }

  const filteredUsers = roleFilter === 'ALL' ? users : users.filter((u) => u.role === roleFilter);
  const superadminCount = users.filter((u) => u.role === 'SUPERADMIN').length;

  return (
    <div>
      <PageHeader title={uiText(t('pages.access.title', { defaultValue: 'Access Management' }))} description={uiText(t('pages.access.desc', { defaultValue: 'Grant or revoke module-level access per role, and reassign user roles' }))} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Users} label={uiText("Total Users")} value={users.length} />
        <KpiCard icon={ShieldAlert} label={uiText("Role Tiers")} value={ALL_ROLES.length} />
        <KpiCard icon={LayoutGrid} label={uiText("Modules")} value={ALL_NAV_KEYS.length} />
        <KpiCard icon={KeyRound} label={uiText("Superadmins")} value={superadminCount} />
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>{uiText("Role Access Matrix")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Plain grid, not a <table> — position:sticky on a <td>/<th> inside a
              border-collapse table renders inconsistently (columns visually overlap).
              A div-grid keeps the Module column fixed while the role columns scroll. */}
          <div className="overflow-x-auto">
            <div className="grid text-sm" style={{ gridTemplateColumns: `180px repeat(${ALL_ROLES.length}, 150px)` }}>
              <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-[4px_0_6px_-4px_rgba(15,23,42,0.12)]">{uiText("Module")}</div>
              {ALL_ROLES.map((r) => (
                <div key={r} className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t(`roles.${r}`, { defaultValue: ROLE_LABELS[r] })}
                </div>
              ))}

              {ALL_NAV_KEYS.map((key) => (
                <Fragment key={key}>
                  <div className="sticky left-0 z-10 flex items-center border-b border-r border-slate-100 bg-white px-4 py-2.5 font-medium text-slate-800 shadow-[4px_0_6px_-4px_rgba(15,23,42,0.08)]">
                    {uiText(NAV_ITEMS[key].label)}
                  </div>
                  {ALL_ROLES.map((r) => (
                    <div key={r} className="flex items-center justify-center border-b border-slate-100 px-3 py-2.5">
                      <Switch
                        checked={(rolePermissions[r] ?? []).includes(key)}
                        onCheckedChange={(v) => toggleModule(r, key, v)}
                      />
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-wrap gap-2">
          <CardTitle>{uiText("User Role Assignments")}</CardTitle>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{uiText("All Roles")}</SelectItem>
              {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{t(`roles.${r}`, { defaultValue: ROLE_LABELS[r] })}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <Tr><Th>{uiText("User")}</Th><Th>{uiText("Department")}</Th><Th>{uiText("Current Role")}</Th><Th>{uiText("Reassign Role")}</Th></Tr>
            </THead>
            <TBody>
              {filteredUsers.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} size={26} />
                      <div>
                        <p className="font-medium text-slate-800">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{uiText(u.designation)}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="max-w-[220px] truncate">{uiText(u.department)}</Td>
                  <Td>{t(`roles.${u.role}`, { defaultValue: ROLE_LABELS[u.role] })}</Td>
                  <Td>
                    <Select
                      value={u.role}
                      onValueChange={(v) => changeRole(u.id, v as Role)}
                      disabled={u.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{t(`roles.${r}`, { defaultValue: ROLE_LABELS[r] })}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
