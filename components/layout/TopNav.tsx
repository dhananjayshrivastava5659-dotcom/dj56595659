'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Bell, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getInitials, ROLE_LABELS } from '@/lib/utils';
import type { User, Notification } from '@/types';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle2 size={14} className="text-[#15803D] shrink-0 mt-0.5" />,
  ERROR:   <XCircle size={14} className="text-[#DC2626] shrink-0 mt-0.5" />,
  WARNING: <AlertTriangle size={14} className="text-[#A16207] shrink-0 mt-0.5" />,
  INFO:    <Info size={14} className="text-[#2563EB] shrink-0 mt-0.5" />,
};

export function TopNav({ user }: { user: User }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) setNotifications((await res.json()).notifications || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      await fetch('/api/notifications', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }

  return (
    <header className="fixed top-0 left-[260px] right-0 z-30 h-16 flex items-center gap-4 px-6 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
      <div className="flex-1">
        <div className="text-sm text-[#475569]">
          <span className="font-semibold text-[#0F172A]">iEvent</span> — ICICI Bank Event Management
        </div>
      </div>

      <Button size="sm" asChild>
        <Link href="/events/new">
          <Plus size={15} />
          New Event
        </Link>
      </Button>

      {/* Notification bell */}
      <DropdownMenu open={open} onOpenChange={handleOpen}>
        <DropdownMenuTrigger asChild>
          <button className="relative p-2 rounded-lg hover:bg-[#F1F5F9] transition-colors">
            <Bell size={18} className="text-[#475569]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-[#DB620A] text-white text-[9px] font-black rounded-full px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[#94A3B8]">No notifications yet.</div>
          ) : (
            notifications.slice(0, 10).map(n => (
              <DropdownMenuItem key={n.id} asChild className={n.read ? 'opacity-60' : ''}>
                <Link href={n.link || '#'} className="flex items-start gap-2.5 py-2.5">
                  {NOTIF_ICONS[n.type]}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0F172A] leading-snug">{n.title}</p>
                    <p className="text-xs text-[#475569] mt-0.5 leading-snug">{n.message}</p>
                  </div>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#DB620A] shrink-0 mt-1.5 ml-auto" />}
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#0F172A] leading-none">{user.name}</p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">{ROLE_LABELS[user.role]} · {user.employeeId}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="normal-case">
            <p className="text-sm font-bold text-[#0F172A]">{user.name}</p>
            <p className="text-xs text-[#94A3B8]">ID: {user.employeeId}</p>
            <p className="text-xs text-[#DB620A] font-semibold mt-1">{ROLE_LABELS[user.role]}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onSelect={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
