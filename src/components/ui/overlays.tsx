import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ---------------- Dialog / Modal ----------------
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({ className, children, title, description, size = 'md' }: { className?: string; children: React.ReactNode; title: string; description?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
      <DialogPrimitive.Content className={cn(
        'fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
        widths[size], className,
      )}>
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <DialogPrimitive.Title className="text-base font-semibold text-slate-900">{title}</DialogPrimitive.Title>
            {description && <DialogPrimitive.Description className="mt-0.5 text-xs text-slate-500">{description}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </DialogPrimitive.Close>
        </div>
        <div className="p-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export const DialogClose = DialogPrimitive.Close;
export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">{children}</div>;
}

// ---------------- Confirm dialog helper ----------------
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', destructive, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; confirmLabel?: string; destructive?: boolean; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} size="sm">
        <DialogFooter>
          <ButtonGhostClose onOpenChange={onOpenChange} />
          <button
            onClick={() => { onConfirm(); onOpenChange(false); }}
            className={cn('inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white', destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-navy-700 hover:bg-navy-800')}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function ButtonGhostClose({ onOpenChange }: { onOpenChange: (v: boolean) => void }) {
  return <button onClick={() => onOpenChange(false)} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>;
}

// ---------------- Dropdown Menu ----------------
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export function DropdownMenuContent({ children, align = 'end' }: { children: React.ReactNode; align?: 'start' | 'end' | 'center' }) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content align={align} sideOffset={6} className="z-50 min-w-[180px] rounded-md border border-slate-200 bg-white p-1 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95">
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}
export function DropdownMenuItem({ children, onSelect, className, destructive }: { children: React.ReactNode; onSelect?: () => void; className?: string; destructive?: boolean }) {
  return (
    <DropdownPrimitive.Item
      onSelect={onSelect}
      className={cn('flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-1.5 text-sm outline-none hover:bg-slate-100', destructive ? 'text-red-600' : 'text-slate-700', className)}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}
export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 py-1.5 text-xs font-semibold uppercase text-slate-400">{children}</div>;
}
export function DropdownMenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-slate-100" />;
}

// ---------------- Popover ----------------
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export function PopoverContent({ children, className, align = 'end' }: { children: React.ReactNode; className?: string; align?: 'start' | 'end' | 'center' }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align={align} sideOffset={8} className={cn('z-50 rounded-lg border border-slate-200 bg-white shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95', className)}>
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

// ---------------- Tooltip ----------------
export const TooltipProvider = TooltipPrimitive.Provider;
export function SimpleTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content sideOffset={6} className="z-50 rounded bg-slate-800 px-2 py-1 text-xs text-white shadow-lg">
          {label}
          <TooltipPrimitive.Arrow className="fill-slate-800" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
