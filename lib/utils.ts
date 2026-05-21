import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import type { UserRole } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, pattern = 'dd MMM yyyy') {
  try { return format(parseISO(dateStr), pattern); } catch { return dateStr; }
}

export function formatDateTime(dateStr: string) {
  try { return format(parseISO(dateStr), 'dd MMM yyyy, h:mm a'); } catch { return dateStr; }
}

export function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function generateEventCode() {
  return 'EVT' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

export const STATUS_COLORS: Record<string, string> = {
  UPCOMING:  'bg-[#EFF6FF] text-[#2563EB]',
  ONGOING:   'bg-[#ECFDF5] text-[#059669]',
  COMPLETED: 'bg-[#F1F5F9] text-[#64748B]',
  CANCELLED: 'bg-[#FEF2F2] text-[#DC2626]',
};

export const STATUS_LABELS: Record<string, string> = {
  UPCOMING:  'Upcoming',
  ONGOING:   'Live',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  USER:  'User',
};

export function isAdmin(role: UserRole) {
  return role === 'ADMIN';
}

export function canCreateEvent(_role: UserRole) {
  return true;
}

export function canEditEvent(role: UserRole, creatorId: string, userId: string) {
  return role === 'ADMIN' || creatorId === userId;
}
