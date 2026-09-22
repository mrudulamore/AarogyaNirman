import { useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../lib/constants';
import { Button, Card, CardContent, NativeSelect } from '../../components/ui/primitives';
import { uiText } from '../../i18n/ui';
export function CustomRoles() {
  const state=useStore();
  const [user,setUser]=useState('');const [role,setRole]=useState('');
  if(state.currentUser?.role!=='SUPERADMIN' || !state.customRoles.length)return null;
  return <Card className="mb-5"><CardContent><h2 className="text-lg font-semibold">{uiText('Custom staff roles')}</h2>    {state.customRoles.length>0 && <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();try{state.assignCustomRole(user,role);toast.success(uiText('Role assigned.'));}catch(e){toast.error((e as Error).message)}}}><NativeSelect required aria-label="Staff account" value={user} onChange={e=>setUser(e.target.value)}><option value="">{uiText('Select staff account')}</option>{state.users.filter(u=>!['SUPERADMIN','CONTRACTOR','WORKFORCE'].includes(u.role)).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</NativeSelect><NativeSelect required aria-label="Custom role" value={role} onChange={e=>setRole(e.target.value)}><option value="">{uiText('Select custom role')}</option>{state.customRoles.map(r=><option key={r.id} value={r.id}>{r.name} · {ROLE_LABELS[r.baseRole]}</option>)}</NativeSelect><Button type="submit">{uiText('Assign custom role')}</Button></form>}
  </CardContent></Card>;
}
