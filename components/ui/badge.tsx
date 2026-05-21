import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'navy' | 'outline';
  dot?: boolean;
}

const variantMap: Record<string, string> = {
  default: 'bg-[#F1F5F9] text-[#475569]',
  success: 'bg-[#ECFDF5] text-[#059669]',
  warning: 'bg-[#FFFBEB] text-[#D97706]',
  danger:  'bg-[#FEF2F2] text-[#DC2626]',
  info:    'bg-[#EFF6FF] text-[#2563EB]',
  navy:    'bg-[#EBF2FF] text-[#053C6D]',
  outline: 'border border-[#E2E8F0] text-[#475569] bg-transparent',
};

const dotMap: Record<string, string> = {
  default: 'bg-[#94A3B8]',
  success: 'bg-[#059669]',
  warning: 'bg-[#D97706]',
  danger:  'bg-[#DC2626]',
  info:    'bg-[#2563EB]',
  navy:    'bg-[#053C6D]',
  outline: 'bg-[#94A3B8]',
};

export function Badge({ className, variant = 'default', dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variantMap[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotMap[variant])} />}
      {children}
    </span>
  );
}
