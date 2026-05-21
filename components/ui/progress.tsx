'use client';
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  color?: 'brand' | 'success' | 'warning' | 'danger' | 'navy';
}

const colorMap = {
  brand:   'bg-[#DB620A]',
  success: 'bg-[#059669]',
  warning: 'bg-[#D97706]',
  danger:  'bg-[#DC2626]',
  navy:    'bg-[#053C6D]',
};

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, color = 'brand', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full flex-1 rounded-full transition-all duration-500 ease-out', colorMap[color])}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
