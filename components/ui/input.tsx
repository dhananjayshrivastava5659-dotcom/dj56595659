import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="relative flex flex-col gap-1">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8]',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#DB620A] focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[#F8FAFC]',
            error && 'border-[#DC2626] focus:ring-[#DC2626]',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
            {rightIcon}
          </div>
        )}
        {error && <p className="text-xs text-[#DC2626]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
