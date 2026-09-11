import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Checkbox({ checked, onCheckedChange, className }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; className?: string }) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(v) => onCheckedChange?.(v === true)}
      className={cn('flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white data-[state=checked]:border-navy-700 data-[state=checked]:bg-navy-700', className)}
    >
      <CheckboxPrimitive.Indicator><Check size={12} className="text-white" /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative h-5 w-9 rounded-full bg-slate-200 outline-none transition-colors data-[state=checked]:bg-navy-700"
    >
      <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

const AVATAR_COLORS = ['bg-navy-700', 'bg-govblue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600', 'bg-rose-600'];
function colorForString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ name, className, size = 32 }: { name: string; className?: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <AvatarPrimitive.Root className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white font-semibold', colorForString(name), className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      <AvatarPrimitive.Fallback>{initials}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
