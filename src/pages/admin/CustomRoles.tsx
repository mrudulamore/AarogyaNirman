import { useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../lib/constants';
import type { Role } from '../../types';
import { Button, Card, CardContent, Input, NativeSelect } from '../../components/ui/primitives';
import { uiText } from '../../i18n/ui';
export function CustomRoles() {
  const state=useStore(); const [name,setName]=useState('');const [base,setBase]=useState<Role>('PROJECT_MANAGER');
  const [user,setUser]=useState('');const [role,setRole]=useState('');
  if(state.currentUser?.role!=='SUPERADMIN')return null;
  return <Card className="mb-5"><CardContent><h2 className="text-lg font-semibold">{uiText('Custom staff roles')}</h2><p className="mt-2 text-sm text-slate-600">{uiText('Create a named role based on an existing staff role. It inherits that role’s module permissions and project scope; it does not create a new permission tier.')}</p>
    <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();try{state.createCustomRole(name,base);setName('');toast.success(uiText('Role created.'));}catch(e){toast.error((e as Error).message)}}}><Input aria-label="Custom role name" required minLength={3} value={name} onChange={e=>setName(e.target.value)} placeholder={uiText('Custom role name')}/><NativeSelect aria-label="Base authorization role" value={base} onChange={e=>setBase(e.target.value as Role)}>{Object.entries(ROLE_LABELS).filter(([r])=>!['SUPERADMIN','CONTRACTOR','WORKFORCE'].includes(r)).map(([r,n])=><option key={r} value={r}>{uiText(n)}</option>)}</NativeSelect><Button type="submit">{uiText('Create role')}</Button></form>
    {state.customRoles.length>0 && <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();try{state.assignCustomRole(user,role);toast.success(uiText('Role assigned.'));}catch(e){toast.error((e as Error).message)}}}><NativeSelect required aria-label="Staff account" value={user} onChange={e=>setUser(e.target.value)}><option value="">{uiText('Select staff account')}</option>{state.users.filter(u=>!['SUPERADMIN','CONTRACTOR','WORKFORCE'].includes(u.role)).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</NativeSelect><NativeSelect required aria-label="Custom role" value={role} onChange={e=>setRole(e.target.value)}><option value="">{uiText('Select custom role')}</option>{state.customRoles.map(r=><option key={r.id} value={r.id}>{r.name} · {ROLE_LABELS[r.baseRole]}</option>)}</NativeSelect><Button type="submit">{uiText('Assign custom role')}</Button></form>}
  </CardContent></Card>;
}
