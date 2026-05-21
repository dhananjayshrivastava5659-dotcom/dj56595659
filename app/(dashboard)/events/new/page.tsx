'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Calendar, MapPin, FileText, Tag, Copy, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

const CITY_STATE_MAP: Record<string, string> = {
  Mumbai: 'Maharashtra', Pune: 'Maharashtra', Nagpur: 'Maharashtra',
  Nashik: 'Maharashtra', Aurangabad: 'Maharashtra', Solapur: 'Maharashtra',
  Kolhapur: 'Maharashtra', Thane: 'Maharashtra', 'Navi Mumbai': 'Maharashtra',
  'New Delhi': 'Delhi', Delhi: 'Delhi', Gurugram: 'Haryana',
  Noida: 'Uttar Pradesh', Faridabad: 'Haryana', Ghaziabad: 'Uttar Pradesh',
  Bengaluru: 'Karnataka', Mysuru: 'Karnataka', Hubli: 'Karnataka',
  Mangaluru: 'Karnataka', Belagavi: 'Karnataka',
  Chennai: 'Tamil Nadu', Coimbatore: 'Tamil Nadu', Madurai: 'Tamil Nadu',
  Tiruchirappalli: 'Tamil Nadu', Salem: 'Tamil Nadu', Tirunelveli: 'Tamil Nadu',
  Ahmedabad: 'Gujarat', Surat: 'Gujarat', Vadodara: 'Gujarat',
  Rajkot: 'Gujarat', Gandhinagar: 'Gujarat', Bhavnagar: 'Gujarat',
  Jaipur: 'Rajasthan', Jodhpur: 'Rajasthan', Udaipur: 'Rajasthan',
  Kota: 'Rajasthan', Ajmer: 'Rajasthan', Bikaner: 'Rajasthan',
  Hyderabad: 'Telangana', Warangal: 'Telangana', Nizamabad: 'Telangana',
  Karimnagar: 'Telangana', Secunderabad: 'Telangana',
  Kolkata: 'West Bengal', Howrah: 'West Bengal', Durgapur: 'West Bengal',
  Asansol: 'West Bengal', Siliguri: 'West Bengal',
  Lucknow: 'Uttar Pradesh', Kanpur: 'Uttar Pradesh', Agra: 'Uttar Pradesh',
  Varanasi: 'Uttar Pradesh', Prayagraj: 'Uttar Pradesh', Meerut: 'Uttar Pradesh',
  Thiruvananthapuram: 'Kerala', Kochi: 'Kerala', Kozhikode: 'Kerala',
  Thrissur: 'Kerala', Kollam: 'Kerala',
  Bhopal: 'Madhya Pradesh', Indore: 'Madhya Pradesh', Gwalior: 'Madhya Pradesh',
  Jabalpur: 'Madhya Pradesh', Ujjain: 'Madhya Pradesh',
  Chandigarh: 'Chandigarh', Ludhiana: 'Punjab', Amritsar: 'Punjab',
  Jalandhar: 'Punjab', Patiala: 'Punjab',
  Ambala: 'Haryana', Rohtak: 'Haryana', Panipat: 'Haryana', Hisar: 'Haryana',
  Bhubaneswar: 'Odisha', Cuttack: 'Odisha', Rourkela: 'Odisha',
  Patna: 'Bihar', Gaya: 'Bihar', Muzaffarpur: 'Bihar',
  Ranchi: 'Jharkhand', Jamshedpur: 'Jharkhand', Dhanbad: 'Jharkhand',
  Guwahati: 'Assam', Dibrugarh: 'Assam', Silchar: 'Assam',
  Visakhapatnam: 'Andhra Pradesh', Vijayawada: 'Andhra Pradesh',
  Guntur: 'Andhra Pradesh', Tirupati: 'Andhra Pradesh',
  Dehradun: 'Uttarakhand', Haridwar: 'Uttarakhand',
  Shimla: 'Himachal Pradesh', Dharamshala: 'Himachal Pradesh',
  Panaji: 'Goa', Margao: 'Goa',
  Raipur: 'Chhattisgarh', Bhilai: 'Chhattisgarh',
};

const CITIES = Object.keys(CITY_STATE_MAP).sort();

const EVENT_TYPES = [
  { value: 'OPEN_EVENT',        label: 'Open Event' },
  { value: 'INVITATION_ONLY',   label: 'Only by Invitation' },
  { value: 'BRANDING_ACTIVITY', label: 'Branding Activity' },
  { value: 'OTHER',             label: 'Other' },
];

const EVENT_TOPICS = [
  { value: 'FINANCIAL',     label: 'Financial' },
  { value: 'NON_FINANCIAL', label: 'Non-Financial' },
  { value: 'BOTH',          label: 'Both' },
];

const VENUE_TYPES = [
  { value: 'BRANCH',                label: 'Branch' },
  { value: 'RWA_SOCIETY',           label: 'RWA / Society' },
  { value: 'CORPORATE_INSTITUTION', label: 'Corporate / Institution' },
  { value: 'ONLINE_WEBINAR',        label: 'Online / Webinar' },
  { value: 'HOTEL_CLUB_BANQUET',    label: 'Hotel / Club / Banquet' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#475569] hover:border-[#DB620A] hover:text-[#DB620A] transition-colors"
    >
      {copied ? <><Check size={14} className="text-[#059669]" /><span className="text-[#059669]">Copied!</span></> : <><Copy size={14} />Copy Code</>}
    </button>
  );
}

export default function NewEventPage() {
  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<{ name: string; eventCode: string; id: string } | null>(null);
  const [form, setForm] = useState({
    name: '', type: '', otherType: '', topic: '', venueType: '',
    venue: '', city: '', state: '', date: '', time: '', description: '', tags: '',
  });

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleCityChange(city: string) {
    setForm(prev => ({ ...prev, city, state: CITY_STATE_MAP[city] || '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...(form.type !== 'OTHER' && { otherType: undefined }) }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setCreatedEvent({ name: event.name, eventCode: event.eventCode, id: event.id });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (createdEvent) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center mx-auto">
          <Check size={32} className="text-[#059669]" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#0F172A]">Event Created!</h2>
          <p className="text-[#475569] mt-1">Share the event code below with your team members so they can access this event.</p>
        </div>
        <Card className="text-left">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-widest mb-1">Event</p>
              <p className="font-extrabold text-[#0F172A] text-lg">{createdEvent.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-widest mb-2">Event Code</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#F8FAFC] border-2 border-dashed border-[#DB620A] rounded-lg px-4 py-3 text-center">
                  <span className="text-2xl font-black font-mono tracking-widest text-[#DB620A]">{createdEvent.eventCode}</span>
                </div>
                <CopyButton text={createdEvent.eventCode} />
              </div>
              <p className="text-xs text-[#94A3B8] mt-2">Anyone who enters this code will see this event on their dashboard.</p>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/events">Back to Events</Link>
          </Button>
          <Button asChild>
            <Link href={`/events/${createdEvent.id}`}>
              Open Event <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/events"><ArrowLeft size={16} /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">Create New Event</h1>
          <p className="text-sm text-[#475569] mt-0.5">Fill in the details to create your event</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText size={16} className="text-[#DB620A]" />Event Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]">Event Name *</label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Nakshatra Wealth Conclave 2026" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">Event Type *</label>
                <Select value={form.type} onValueChange={v => update('type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">Topic *</label>
                <Select value={form.topic} onValueChange={v => update('topic', v)}>
                  <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TOPICS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === 'OTHER' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">Please specify the event type *</label>
                <Input value={form.otherType} onChange={e => update('otherType', e.target.value)} placeholder="Describe the event type" required={form.type === 'OTHER'} />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]">Description</label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Describe your event..."
                rows={3}
                className="flex w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#DB620A] focus:border-transparent resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin size={16} className="text-[#DB620A]" />Venue & Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]">Venue Type *</label>
              <Select value={form.venueType} onValueChange={v => update('venueType', v)}>
                <SelectTrigger><SelectValue placeholder="Select venue type" /></SelectTrigger>
                <SelectContent>
                  {VENUE_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]">Venue Name *</label>
              <Input value={form.venue} onChange={e => update('venue', e.target.value)} placeholder="e.g. The Oberoi" required leftIcon={<MapPin size={14} />} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">City *</label>
                <Combobox options={CITIES} value={form.city} onChange={handleCityChange} placeholder="Select city" searchPlaceholder="Type to search cities..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">State</label>
                <div className={`flex h-9 w-full items-center rounded-lg border px-3 text-sm ${form.state ? 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] font-medium' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]'}`}>
                  {form.state || 'Auto-filled on city selection'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">Event Date *</label>
                <Input type="date" value={form.date} onChange={e => update('date', e.target.value)} required leftIcon={<Calendar size={14} />} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">Event Time *</label>
                <Input type="time" value={form.time} onChange={e => update('time', e.target.value)} required leftIcon={<Calendar size={14} />} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Tag size={16} className="text-[#DB620A]" />Tags</CardTitle></CardHeader>
          <CardContent>
            <Input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="e.g. HNI, Wealth, Premium (comma separated)" leftIcon={<Tag size={14} />} />
            <p className="text-xs text-[#94A3B8] mt-2">Add tags to help categorize and filter events</p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/events">Cancel</Link>
          </Button>
          <Button type="submit" loading={loading}>
            <Save size={16} /> Create Event
          </Button>
        </div>
      </form>
    </div>
  );
}
