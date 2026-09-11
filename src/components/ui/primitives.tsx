import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { STATUS_COLORS } from '../../lib/constants';

// ---------------- Button ----------------
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-navy-700 text-white hover:bg-navy-800 shadow-sm',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
};
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-1',
        variantClasses[variant], sizeClasses[size], className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

// ---------------- Badge / Status ----------------
export function Badge({ className, children, variant = 'default' }: { className?: string; children: React.ReactNode; variant?: 'default' | 'outline' }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      variant === 'default' ? 'bg-slate-100 text-slate-700' : 'border border-slate-300 text-slate-600',
      className,
    )}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { t } = useTranslation();
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', c.bg, c.text, c.border)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
      {label ?? t(`status.${status}`, { defaultValue: status.replace(/_/g, ' ') })}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <StatusBadge status={severity} />;
}

// ---------------- Card ----------------
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-slate-200 bg-white shadow-card', className)} {...props}>{children}</div>;
}
export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex items-center justify-between border-b border-slate-100 px-5 py-4', className)}>{children}</div>;
}
export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn('text-sm font-semibold text-slate-800', className)}>{children}</h3>;
}
export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

// ---------------- Input / Textarea / Label ----------------
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50', className)}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50', className)}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-xs font-medium text-slate-600', className)} {...props}>{children}</label>;
}

export function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function NativeSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500', className)}
      {...props}
    >
      {children}
    </select>
  );
}

// ---------------- Separator ----------------
export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-slate-200', className)} />;
}

// ---------------- Progress ----------------
export function ProgressBar({ value, className, colorClass }: { value: number; className?: string; colorClass?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = colorClass ?? (v >= 90 ? 'bg-emerald-500' : v >= 60 ? 'bg-blue-500' : v >= 35 ? 'bg-amber-500' : 'bg-red-500');
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${v}%` }} />
    </div>
  );
}

// ---------------- Table ----------------
export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="table-scroll">
      <table className={cn('w-full border-collapse text-sm', className)}>{children}</table>
    </div>
  );
}
export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</thead>;
}
export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}
export function Tr({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <tr onClick={onClick} className={cn(onClick && 'cursor-pointer hover:bg-slate-50', className)}>{children}</tr>;
}
export function Th({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-2.5 font-semibold', className)} {...props}>{children}</th>;
}
export function Td({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-2.5 align-middle text-slate-700', className)} {...props}>{children}</td>;
}

// ---------------- Empty state ----------------
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-6 py-14 text-center">
      {icon && <div className="mb-1 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-400">{description}</p>}
      {action}
    </div>
  );
}

// ---------------- Loading ----------------
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin text-current', className)} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-200', className)} />;
}
