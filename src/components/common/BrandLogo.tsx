import { cn } from '../../lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return <img src="/aarogya-nirman-logo.png" alt="AarogyaNirman" width={64} height={64} className={cn('shrink-0 rounded-lg object-contain', className)} />;
}
