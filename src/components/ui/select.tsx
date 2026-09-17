import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <SelectPrimitive.Trigger className={cn('ui-input flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500', className)}>
      {children}
      <SelectPrimitive.Icon><ChevronDown size={14} className="text-slate-400" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className="z-50 max-h-72 max-w-[calc(100vw-2rem)] min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" position="popper" sideOffset={4}>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <SelectPrimitive.Item value={value} className="ui-menu-item relative flex cursor-pointer select-none items-center rounded px-6 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100 hover:bg-slate-100 data-[state=checked]:font-medium">
      <SelectPrimitive.ItemIndicator className="absolute left-1.5"><Check size={14} className="text-navy-700" /></SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
