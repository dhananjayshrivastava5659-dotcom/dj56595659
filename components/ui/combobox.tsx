'use client';
import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(
    () => options.filter(o => o.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  function select(option: string) {
    onChange(option);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm transition-colors hover:border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#DB620A] focus:border-transparent',
            !value && 'text-[#94A3B8]',
            value && 'text-[#0F172A]',
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown size={14} className="shrink-0 text-[#94A3B8]" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-[#E2E8F0] bg-white shadow-lg overflow-hidden"
          onOpenAutoFocus={e => { e.preventDefault(); inputRef.current?.focus(); }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E2E8F0]">
            <Search size={14} className="shrink-0 text-[#94A3B8]" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm text-[#0F172A] placeholder:text-[#94A3B8] bg-transparent outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[#94A3B8] hover:text-[#475569] text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-[#94A3B8]">No results found</div>
            ) : (
              filtered.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => select(option)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[#F8FAFC] transition-colors',
                    option === value && 'bg-[#FEF0E7] text-[#DB620A] font-semibold'
                  )}
                >
                  <Check
                    size={13}
                    className={cn('shrink-0', option === value ? 'opacity-100 text-[#DB620A]' : 'opacity-0')}
                  />
                  {option}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
