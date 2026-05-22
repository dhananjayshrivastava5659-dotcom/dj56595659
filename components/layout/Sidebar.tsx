'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Palette, LogOut, ChevronRight } from 'lucide-react';
import { cn, ROLE_LABELS, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { User } from '@/types';

const NAV_ITEMS = [
  { label: 'Dashboard',       href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Events',          href: '/events',     icon: Calendar },
  { label: 'Invite Creative', href: '/creatives',  icon: Palette },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0A0F1E] border-r border-white/5">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[#DB620A] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-sm">iE</span>
        </div>
        <div>
          <div className="text-white font-extrabold text-base leading-none">iEvent</div>
          <div className="text-white/40 text-[10px] mt-0.5 font-medium tracking-wider uppercase">ICICI Bank</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <div className="px-3 mb-3">
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Navigation</span>
        </div>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 group',
                isActive
                  ? 'bg-[#DB620A] text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              )}
            >
              <Icon size={18} className={cn('flex-shrink-0', isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80')} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={14} className="text-white/70" />}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5">
          <Avatar size="sm">
            <AvatarFallback className="bg-[#DB620A] text-[10px]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-none truncate">{user.name}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{ROLE_LABELS[user.role]} · {user.employeeId}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-white/8 hover:text-white/90 transition-all font-medium"
        >
          <LogOut size={16} className="flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
