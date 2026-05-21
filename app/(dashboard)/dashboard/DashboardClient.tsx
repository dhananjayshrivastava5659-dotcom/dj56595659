'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, Users, Plus, Hash, ChevronRight, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import type { User, Event } from '@/types';

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.preventDefault();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#475569]">
      {copied ? <Check size={12} className="text-[#059669]" /> : <Copy size={12} />}
    </button>
  );
}

function JoinDialog({ open, onClose, onJoined }: { open: boolean; onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/events/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(data.alreadyJoined ? `You already have "${data.event.name}".` : `"${data.event.name}" added!`);
      setTimeout(() => { onJoined(); onClose(); setCode(''); setSuccess(''); }, 1500);
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setCode(''); setError(''); setSuccess(''); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Hash size={18} className="text-[#DB620A]" />Join an Event</DialogTitle></DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4 mt-2">
          <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter event code e.g. EVTABC12"
            className="font-mono text-center tracking-widest text-lg h-12" autoFocus />
          {error && <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-sm text-[#DC2626]">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#6EE7B7] text-sm text-[#059669] flex items-center gap-2"><Check size={14} />{success}</div>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { onClose(); setCode(''); setError(''); }}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!code.trim()} className="flex-1">Join Event</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardClient({ user }: { user: User }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events', { cache: 'no-store' });
      if (res.ok) setEvents((await res.json()).events || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const totalCustomers = events.reduce((s, e) => s + (e.customerCount ?? 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">Dashboard</h1>
          <p className="text-sm text-[#475569] mt-1">Welcome back, {user.name} · ID {user.employeeId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)}><Hash size={15} />Join by Code</Button>
          <Button asChild><Link href="/events/new"><Plus size={15} />New Event</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Events on Dashboard', value: events.length, icon: Calendar, color: '#DB620A', bg: '#FEF0E7' },
          { label: 'Total Customers Added', value: totalCustomers, icon: Users, color: '#053C6D', bg: '#EBF2FF' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-black text-[#0F172A]">{loading ? '—' : s.value}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-[#0F172A]">Your Events</h2>
          <Link href="/events" className="text-xs font-semibold text-[#DB620A] hover:underline flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-[#DB620A]" /></div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar size={40} className="text-[#E2E8F0] mx-auto mb-3" />
              <p className="font-semibold text-[#475569]">No events yet</p>
              <p className="text-sm text-[#94A3B8] mt-1 mb-5">Create a new event or join one with a code.</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)}><Hash size={14} />Join by Code</Button>
                <Button size="sm" asChild><Link href="/events/new"><Plus size={14} />New Event</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 8).map(event => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#DB620A]/30 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-[#FEF0E7] flex items-center justify-center shrink-0">
                    <Calendar size={18} className="text-[#DB620A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-[#0F172A] group-hover:text-[#DB620A] transition-colors truncate">{event.name}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{formatDate(event.date)} · {event.city}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[event.status]}`}>{STATUS_LABELS[event.status]}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono font-bold text-[#94A3B8] bg-[#F8FAFC] px-2 py-1 rounded border border-[#E2E8F0]">{event.eventCode}</span>
                      <CopyCodeButton code={event.eventCode} />
                    </div>
                    <span className="text-xs text-[#94A3B8]">{event.customerCount ?? 0} customers</span>
                    <ChevronRight size={14} className="text-[#94A3B8] group-hover:text-[#DB620A]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <JoinDialog open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={fetchEvents} />
    </div>
  );
}
