'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Calendar, MapPin, ChevronRight, MoreHorizontal,
  Loader2, Hash, Users, Copy, Check, LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import type { User, Event } from '@/types';

const EVENT_TYPE_LABELS: Record<string, string> = {
  OPEN_EVENT: 'Open Event', INVITATION_ONLY: 'By Invitation',
  BRANDING_ACTIVITY: 'Branding', OTHER: 'Other',
};

const TOPIC_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial', NON_FINANCIAL: 'Non-Financial', BOTH: 'Both',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-[#F1F5F9] transition-colors text-[#94A3B8] hover:text-[#475569]">
      {copied ? <Check size={13} className="text-[#059669]" /> : <Copy size={13} />}
    </button>
  );
}

function EventCard({ event, userId }: { event: Event; userId: string }) {
  const isOwner = event.creatorId === userId;

  return (
    <Card className="group hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className={`h-1 w-full ${event.status === 'UPCOMING' ? 'bg-[#DB620A]' : event.status === 'COMPLETED' ? 'bg-[#059669]' : event.status === 'ONGOING' ? 'bg-[#2563EB]' : 'bg-[#94A3B8]'}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[event.status]}`}>
              {STATUS_LABELS[event.status]}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#F1F5F9] text-[#475569]">
              {event.type === 'OTHER' && event.otherType ? event.otherType : EVENT_TYPE_LABELS[event.type]}
            </span>
            {isOwner && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF0E7] text-[#DB620A] font-semibold">Your Event</span>
            )}
          </div>
        </div>

        <Link href={`/events/${event.id}`}>
          <h3 className="font-extrabold text-[#0F172A] text-base leading-tight group-hover:text-[#DB620A] transition-colors line-clamp-2 mb-3">
            {event.name}
          </h3>
        </Link>

        <div className="space-y-1.5 text-xs text-[#475569]">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-[#94A3B8] shrink-0" />
            {formatDate(event.date)} at {event.time}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-[#94A3B8] shrink-0" />
            {event.venue}, {event.city}
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-[#94A3B8] shrink-0" />
            {event.customerCount ?? 0} customer{event.customerCount !== 1 ? 's' : ''} added
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-[#94A3B8] bg-[#F8FAFC] px-2 py-1 rounded border border-[#E2E8F0]">
              {event.eventCode}
            </span>
            <CopyButton text={event.eventCode} />
          </div>
          <Link href={`/events/${event.id}`} className="text-xs font-semibold text-[#DB620A] flex items-center gap-1 hover:underline shrink-0">
            Open <ChevronRight size={12} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function JoinEventDialog({ open, onClose, onJoined }: { open: boolean; onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/events/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      if (data.alreadyJoined) {
        setSuccess(`You already have access to "${data.event.name}".`);
      } else {
        setSuccess(`"${data.event.name}" has been added to your dashboard!`);
      }
      setTimeout(() => { onJoined(); onClose(); setCode(''); setSuccess(''); }, 1500);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setCode(''); setError(''); setSuccess(''); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash size={18} className="text-[#DB620A]" /> Join an Event
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#0F172A]">Event Code</label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. EVTABC12"
              className="font-mono text-center tracking-widest text-lg h-12"
              autoFocus
            />
            <p className="text-xs text-[#94A3B8]">Enter the event code shared by the event creator.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-sm text-[#DC2626]">{error}</div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#6EE7B7] text-sm text-[#059669] flex items-center gap-2">
              <Check size={14} /> {success}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { onClose(); setCode(''); setError(''); }}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!code.trim()} className="flex-1">
              <LogIn size={15} /> Join Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EventsClient({ user }: { user: User }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [joinOpen, setJoinOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events', { cache: 'no-store' });
      if (res.ok) setEvents((await res.json()).events || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = useMemo(() => events.filter(e => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.eventCode.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchSearch && matchStatus;
  }), [events, search, statusFilter]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">Events</h1>
          <p className="text-sm text-[#475569] mt-1">{events.length} event{events.length !== 1 ? 's' : ''} on your dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)}>
            <Hash size={15} /> Join by Code
          </Button>
          <Button asChild>
            <Link href="/events/new"><Plus size={16} />New Event</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-60">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..." leftIcon={<Search size={15} />} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="ONGOING">Live</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <button onClick={fetchEvents} className="p-2 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors" title="Refresh">
          <Loader2 size={16} className={loading ? 'animate-spin text-[#DB620A]' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#DB620A]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <Calendar size={44} className="text-[#E2E8F0] mx-auto mb-4" />
          <p className="text-[#475569] font-semibold text-lg">No events yet</p>
          <p className="text-sm text-[#94A3B8] mt-1 mb-6">Create a new event or join one using an event code.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setJoinOpen(true)}><Hash size={15} />Join by Code</Button>
            <Button asChild><Link href="/events/new"><Plus size={15} />New Event</Link></Button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(event => <EventCard key={event.id} event={event} userId={user.id} />)}
        </div>
      )}

      <JoinEventDialog open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={fetchEvents} />
    </div>
  );
}
