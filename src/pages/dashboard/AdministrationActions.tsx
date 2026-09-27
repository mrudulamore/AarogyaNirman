import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../lib/constants';
import { uiText } from '../../i18n/ui';
import { Input, Table, THead, TBody, Tr, Th, Td } from '../../components/ui/primitives';

export function AdministrationActions() {
  const state = useStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const role = state.currentUser?.role;
  if (role !== 'IT_ADMIN' && role !== 'SUPERADMIN') return null;
  const panel = params.get('admin');
  const admin = role === 'SUPERADMIN';
  const permitted = new Set(state.rolePermissions[role]);
  const pending = state.users.filter(user => user.identityReview?.status === 'PENDING');
  const users = (panel === 'identities' ? pending : state.users).filter(user =>
    `${user.name} ${user.email} ${ROLE_LABELS[user.role]}`.toLowerCase().includes(query.trim().toLowerCase()));
  const linkClass = 'inline-flex min-h-11 items-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-800 hover:bg-blue-50';
  return <section className="mb-5 space-y-3" aria-label={uiText('IT administration')}>
    <h2 className="text-lg font-semibold text-blue-950">{uiText(admin ? 'Access and administration' : 'IT administration')}</h2>
    <nav className="flex flex-wrap gap-2">
      <Link className={linkClass} to={admin ? '/access?view=users' : '/dashboard?admin=accounts'}>{uiText('User accounts')} ({state.users.length})</Link>
      <Link className={linkClass} to={admin ? '/access?view=identities' : '/dashboard?admin=identities'}>{uiText('Identity reviews')} ({pending.length})</Link>
      {permitted.has('notifications') && <Link className={linkClass} to="/notifications">{uiText('Unread alerts')} ({state.notifications.filter(n => !n.read).length})</Link>}
      {permitted.has('documents') && <Link className={linkClass} to="/documents">{uiText('Documents stored')} ({state.documents.length})</Link>}
      {permitted.has('audit') && <Link className={linkClass} to="/audit">{uiText('Audit log')}</Link>}
      {permitted.has('search') && <Link className={linkClass} to="/search">{uiText('Search')}</Link>}
      {admin && <Link className={linkClass} to="/access">{uiText('Manage Access')}</Link>}
    </nav>
    {!admin && (panel === 'accounts' || panel === 'identities') && <div className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{uiText(panel === 'identities' ? 'Identity reviews' : 'User accounts')}</h3><button type="button" className={linkClass} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.delete('admin'); return next; })}>{uiText('Close')}</button></div>
      <p className="text-xs text-slate-500">{uiText('Only Super Administrators can change roles and review identities.')}</p>
      <Input aria-label={uiText('Search people')} placeholder={uiText('Search people')} value={query} onChange={event => setQuery(event.target.value)} />
      <Table><THead><Tr>{['User', 'Role', 'Email', 'Identity verification'].map(label => <Th key={label}>{uiText(label)}</Th>)}</Tr></THead><TBody>{users.map(user => <Tr key={user.id}><Td>{user.name}</Td><Td>{uiText(ROLE_LABELS[user.role])}</Td><Td>{user.email}</Td><Td>{uiText(user.identityReview?.status ?? 'Not submitted')}</Td></Tr>)}</TBody></Table>
      {!users.length && <p role="status">{uiText('No matching users')}</p>}
    </div>}
  </section>;
}
