import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List className={cn('flex flex-wrap gap-1 rounded-t-xl border-b border-slate-200', className)}>
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className="relative min-h-11 rounded-t-lg px-3.5 py-2.5 text-sm font-medium text-slate-500 outline-none transition-colors hover:text-slate-800 data-[state=active]:bg-navy-50 data-[state=active]:text-navy-700 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-navy-700"
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('pt-5 focus:outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}
