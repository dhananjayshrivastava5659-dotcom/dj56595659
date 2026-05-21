'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, Copy, Check, Users, Plus, Loader2,
  CheckCircle2, XCircle, Clock, Share2, Sparkles, Download, Palette, FileText, ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, STATUS_COLORS, STATUS_LABELS, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { User, Event, Customer, CustomerStatus, Creative, RsvpStatus } from '@/types';

const EVENT_TYPE_LABELS: Record<string, string> = {
  OPEN_EVENT: 'Open Event', INVITATION_ONLY: 'By Invitation',
  BRANDING_ACTIVITY: 'Branding Activity', OTHER: 'Other',
};
const TOPIC_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial', NON_FINANCIAL: 'Non-Financial', BOTH: 'Both',
};
const VENUE_TYPE_LABELS: Record<string, string> = {
  BRANCH: 'Branch', RWA_SOCIETY: 'RWA / Society',
  CORPORATE_INSTITUTION: 'Corporate / Institution',
  ONLINE_WEBINAR: 'Online / Webinar', HOTEL_CLUB_BANQUET: 'Hotel / Club / Banquet',
};

const STATUS_CHIP: Record<CustomerStatus, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:  { label: 'Pending',  className: 'bg-[#FEF9C3] text-[#A16207]',  icon: <Clock size={11} /> },
  APPROVED: { label: 'Approved', className: 'bg-[#DCFCE7] text-[#15803D]',  icon: <CheckCircle2 size={11} /> },
  REJECTED: { label: 'Rejected', className: 'bg-[#FEE2E2] text-[#DC2626]',  icon: <XCircle size={11} /> },
};

const RSVP_CHIP: Record<RsvpStatus, { label: string; className: string }> = {
  NO_RESPONSE:   { label: 'No Response',   className: 'bg-[#F1F5F9] text-[#64748B]' },
  ATTENDING:     { label: '✓ Attending',   className: 'bg-[#DCFCE7] text-[#15803D]' },
  MAYBE:         { label: '? Maybe',       className: 'bg-[#FEF9C3] text-[#A16207]' },
  NOT_ATTENDING: { label: '✗ Not Going',   className: 'bg-[#FEE2E2] text-[#DC2626]' },
};

function hexToRgbNorm(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  ];
}

async function generatePersonalizedCreative(
  creative: Creative,
  name: string,
): Promise<{ blob: Blob; ext: string }> {
  const pos = creative.namePosition!;
  const fileRes = await fetch(`/api/creatives/${creative.id}/file`);

  if (creative.mimeType === 'application/pdf') {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const bytes = await fileRes.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);
    const [page] = pdfDoc.getPages();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = (pos.fontSizePct / 100) * height;
    const textWidth = font.widthOfTextAtSize(name, fontSize);
    let x = (pos.xPct / 100) * width;
    // PDF y=0 is bottom-left; convert from top-percentage
    const y = height - (pos.yPct / 100) * height;
    if (pos.align === 'center') x -= textWidth / 2;
    else if (pos.align === 'right') x -= textWidth;
    const [r, g, b] = hexToRgbNorm(pos.color);
    page.drawText(name, { x, y, size: fontSize, font, color: rgb(r, g, b) });
    const out = await pdfDoc.save();
    return { blob: new Blob([out as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), ext: 'pdf' };
  }

  // Image — use Canvas API
  const imgBlob = await fileRes.blob();
  const imgUrl = URL.createObjectURL(imgBlob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const fontSize = (pos.fontSizePct / 100) * img.naturalHeight;
      const x = (pos.xPct / 100) * img.naturalWidth;
      const y = (pos.yPct / 100) * img.naturalHeight;
      ctx.font = `bold ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.fillStyle = pos.color;
      ctx.textAlign = pos.align as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x, y);
      URL.revokeObjectURL(imgUrl);
      canvas.toBlob(b => resolve({ blob: b!, ext: 'png' }), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(imgUrl); reject(new Error('Image load failed')); };
    img.src = imgUrl;
  });
}

async function generateHtmlInvite(
  creative: Creative,
  customer: Customer,
): Promise<void> {
  const baseUrl = window.location.origin;
  const attendingUrl  = `${baseUrl}/api/rsvp?token=${customer.rsvpToken}&response=ATTENDING`;
  const maybeUrl      = `${baseUrl}/api/rsvp?token=${customer.rsvpToken}&response=MAYBE`;
  const notGoingUrl   = `${baseUrl}/api/rsvp?token=${customer.rsvpToken}&response=NOT_ATTENDING`;

  const res = await fetch(`/api/creatives/${creative.id}/file`);
  let html = await res.text();

  // Replace name + RSVP URL placeholders
  html = html
    .replace(/\{\{CUSTOMER_NAME\}\}/g, customer.fullName)
    .replace(/\{\{ATTENDING_URL\}\}/g, attendingUrl)
    .replace(/\{\{MAYBE_URL\}\}/g, maybeUrl)
    .replace(/\{\{NOT_ATTENDING_URL\}\}/g, notGoingUrl);

  // Render in a hidden iframe then use html2pdf
  const html2pdf = (await import('html2pdf.js')).default;
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  await html2pdf()
    .set({
      margin: 0,
      filename: `invite-${customer.fullName.replace(/\s+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(container)
    .save();

  document.body.removeChild(container);
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#DB620A] transition-colors">
      {copied ? <Check size={13} className="text-[#059669]" /> : <Copy size={13} />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  );
}

function AddCustomerDialog({ eventId, open, onClose, onAdded }: {
  eventId: string; open: boolean; onClose: () => void; onAdded: () => void;
}) {
  const [form, setForm] = useState({ fullName: '', mobile: '', email: '', organisation: '', guestsAccompanied: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })); }
  function handleClose() { onClose(); setForm({ fullName: '', mobile: '', email: '', organisation: '', guestsAccompanied: '' }); setError(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.mobile.trim())) { setError('Mobile number must be exactly 10 digits.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, ...form }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add customer.'); return; }
      onAdded(); handleClose();
    } catch { setError('Something went wrong.'); } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Users size={18} className="text-[#DB620A]" /> Add Customer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-semibold text-[#0F172A]">Full Name *</label>
              <Input value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Customer full name" required />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-semibold text-[#0F172A]">Mobile Number *</label>
              <Input value={form.mobile} onChange={e => update('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" type="tel" maxLength={10} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]">Email ID</label>
              <Input value={form.email} onChange={e => update('email', e.target.value)} placeholder="optional" type="email" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#0F172A]">Guests Accompanied</label>
              <Input value={form.guestsAccompanied} onChange={e => update('guestsAccompanied', e.target.value)} placeholder="0" type="number" min="0" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-semibold text-[#0F172A]">Organisation</label>
              <Input value={form.organisation} onChange={e => update('organisation', e.target.value)} placeholder="Company / organisation (optional)" />
            </div>
          </div>
          {error && <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-sm text-[#DC2626]">{error}</div>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1"><Plus size={15} /> Add Customer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShareResourceDialog({ customer, eventId, open, onClose }: {
  customer: Customer; eventId: string; open: boolean; onClose: () => void;
}) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Creative | null>(null);
  const [mode, setMode] = useState<'nonPersonal' | 'personal' | null>(null);
  const [customName, setCustomName] = useState(customer.fullName);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cachedImgRef = useRef<{ id: string; img: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/creatives?eventId=${eventId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const list: Creative[] = data.creatives || [];
        setCreatives(list);
        if (list.length >= 1) setSelected(list[0]);
      })
      .finally(() => setLoading(false));
  }, [open, eventId]);

  // Live canvas preview — re-renders whenever name, creative, or mode changes
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || mode !== 'personal' || !selected?.isPersonalizable || !selected.namePosition) return;
    if (!selected.mimeType.startsWith('image/')) return;

    function draw(img: HTMLImageElement) {
      if (!canvas || !selected?.namePosition) return;
      const parent = canvas.parentElement;
      const displayW = parent ? parent.clientWidth : 380;
      const scale = displayW / img.naturalWidth;
      canvas.width = displayW;
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pos = selected.namePosition;
      const fontSize = Math.max(6, (pos.fontSizePct / 100) * canvas.height);
      ctx.font = `bold ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.fillStyle = pos.color;
      ctx.textAlign = pos.align as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      ctx.fillText(customName.trim() || customer.fullName, (pos.xPct / 100) * canvas.width, (pos.yPct / 100) * canvas.height);
    }

    if (cachedImgRef.current?.id === selected.id) {
      draw(cachedImgRef.current.img);
      return;
    }
    const img = new Image();
    img.onload = () => { cachedImgRef.current = { id: selected.id, img }; draw(img); };
    img.src = `/api/creatives/${selected.id}/file`;
  }, [mode, selected, customName, customer.fullName]);

  function handleClose() {
    onClose(); setMode(null); setError('');
    setCustomName(customer.fullName); setSelected(null);
  }

  async function handleNonPersonalDownload() {
    if (!selected) return;
    try {
      const res = await fetch(`/api/creatives/${selected.id}/file`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selected.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Download failed. Please try again.');
    }
  }

  async function handlePersonalDownload() {
    if (!selected?.isPersonalizable || !selected.namePosition) {
      setError("This creative doesn't support personalisation. Enable it in Invite Creatives.");
      return;
    }
    const name = customName.trim() || customer.fullName;
    setGenerating(true); setError('');
    try {
      const { blob, ext } = await generatePersonalizedCreative(selected, name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invite-${name.replace(/\s+/g, '-')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Failed to generate personalised invite. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleHtmlInvite() {
    if (!selected) return;
    setGenerating(true); setError('');
    try {
      await generateHtmlInvite(selected, customer);
    } catch {
      setError('Failed to generate HTML invite. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  const isPdf  = selected?.mimeType === 'application/pdf';
  const isHtml = selected?.mimeType === 'text/html';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={18} className="text-[#DB620A]" /> Share Resource
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-[#DB620A]" /></div>
        ) : creatives.length === 0 ? (
          <div className="text-center py-10">
            <Palette size={32} className="text-[#E2E8F0] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#475569]">No creatives uploaded</p>
            <p className="text-xs text-[#94A3B8] mt-1">The event creator hasn't uploaded any invite creatives yet.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {/* Customer info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <Avatar size="sm">
                <AvatarFallback className="text-[10px]">{getInitials(customer.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-[#94A3B8]">Generating invite for</p>
                <p className="font-semibold text-sm text-[#0F172A]">{customer.fullName}</p>
              </div>
            </div>

            {/* Creative selector */}
            {creatives.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">Select Creative</label>
                <select
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DB620A]/20"
                  value={selected?.id || ''}
                  onChange={e => { setSelected(creatives.find(c => c.id === e.target.value) || null); setMode(null); }}
                >
                  {creatives.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* HTML invite — direct generate */}
            {selected && isHtml && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1D4ED8] space-y-1">
                  <p className="font-semibold">HTML Template Detected</p>
                  <p>This will replace <code>{'{{CUSTOMER_NAME}}'}</code> with <strong>{customer.fullName}</strong> and inject unique RSVP tracking links for Attending / Maybe / Not Attending.</p>
                </div>
                <Button className="w-full" loading={generating} onClick={handleHtmlInvite}>
                  <Sparkles size={15} /> Generate Personalised Invite PDF
                </Button>
              </div>
            )}

            {/* Mode selector */}
            {selected && !isHtml && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('nonPersonal')}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    mode === 'nonPersonal' ? 'border-[#DB620A] bg-[#FEF0E7]' : 'border-[#E2E8F0] hover:border-[#DB620A]/40'
                  }`}
                >
                  {isPdf
                    ? <FileText size={22} className={`mx-auto mb-2 ${mode === 'nonPersonal' ? 'text-[#DB620A]' : 'text-[#94A3B8]'}`} />
                    : <ImageIcon size={22} className={`mx-auto mb-2 ${mode === 'nonPersonal' ? 'text-[#DB620A]' : 'text-[#94A3B8]'}`} />
                  }
                  <p className={`text-sm font-semibold ${mode === 'nonPersonal' ? 'text-[#DB620A]' : 'text-[#475569]'}`}>Non-Personalised</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Download as-is</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selected.isPersonalizable) { setError("This creative wasn't marked as personalizable. Go to Invite Creatives to re-upload with personalisation enabled."); return; }
                    setMode('personal');
                  }}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    !selected.isPersonalizable ? 'opacity-50 cursor-not-allowed border-[#E2E8F0]' :
                    mode === 'personal' ? 'border-[#DB620A] bg-[#FEF0E7]' : 'border-[#E2E8F0] hover:border-[#DB620A]/40'
                  }`}
                >
                  <Sparkles size={22} className={`mx-auto mb-2 ${mode === 'personal' ? 'text-[#DB620A]' : 'text-[#94A3B8]'}`} />
                  <p className={`text-sm font-semibold ${mode === 'personal' ? 'text-[#DB620A]' : 'text-[#475569]'}`}>Personalised</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Add customer name</p>
                </button>
              </div>
            )}

            {/* Non-Personalised / Personalised actions — only for non-HTML */}
            {!isHtml && mode === 'nonPersonal' && (
              <Button className="w-full" onClick={handleNonPersonalDownload}>
                <Download size={15} /> Download Invite
              </Button>
            )}

            {/* Personalised action */}
            {!isHtml && mode === 'personal' && selected?.isPersonalizable && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#0F172A]">Name on Invite</label>
                  <Input
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Customer name"
                  />
                  <p className="text-xs text-[#94A3B8]">Pre-filled with customer name — edit if needed.</p>
                </div>
                {/* Live preview for image creatives */}
                {selected.mimeType.startsWith('image/') && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#475569]">Preview</p>
                    <canvas
                      ref={previewCanvasRef}
                      className="w-full rounded-lg border border-[#E2E8F0]"
                    />
                  </div>
                )}
                {selected.mimeType === 'application/pdf' && (
                  <div className="p-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1D4ED8]">
                    PDF preview not available — the name will be placed at the position set during upload.
                  </div>
                )}
                <Button className="w-full" loading={generating} onClick={handlePersonalDownload}>
                  <Sparkles size={15} /> Generate &amp; Download Personalised Invite
                </Button>
              </div>
            )}

            {error && <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-sm text-[#DC2626]">{error}</div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomerRow({ customer, onShare }: { customer: Customer; onShare?: () => void }) {
  const chip = STATUS_CHIP[customer.status];
  return (
    <div className="flex items-center gap-3 p-4 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors">
      <Avatar size="sm">
        <AvatarFallback className="text-[10px]">{getInitials(customer.fullName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#0F172A]">{customer.fullName}</p>
        <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-[#94A3B8]">
          <span>{customer.mobile}</span>
          {customer.email && <span>{customer.email}</span>}
          {customer.organisation && <span>{customer.organisation}</span>}
        </div>
        {customer.reviewNote && customer.status === 'REJECTED' && (
          <p className="text-xs text-[#DC2626] mt-1">Note: {customer.reviewNote}</p>
        )}
      </div>
      {customer.guestsAccompanied ? (
        <span className="text-xs bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded font-medium shrink-0">
          +{customer.guestsAccompanied} guest{customer.guestsAccompanied !== 1 ? 's' : ''}
        </span>
      ) : null}
      {customer.status === 'APPROVED' && (
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${RSVP_CHIP[customer.rsvpStatus ?? 'NO_RESPONSE'].className}`}>
          {RSVP_CHIP[customer.rsvpStatus ?? 'NO_RESPONSE'].label}
        </span>
      )}
      <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${chip.className}`}>
        {chip.icon}{chip.label}
      </span>
      {customer.status === 'APPROVED' && onShare && (
        <Button size="sm" variant="outline" className="shrink-0 text-xs h-7 px-2" onClick={onShare}>
          <Share2 size={12} /> Share
        </Button>
      )}
      <span className="text-[10px] text-[#94A3B8] shrink-0">by {customer.addedByName}</span>
    </div>
  );
}

function PendingCustomerRow({ customer, onAction }: { customer: Customer; onAction: () => void }) {
  const [loading, setLoading] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showReject, setShowReject] = useState(false);

  async function act(action: 'APPROVE' | 'REJECT') {
    setLoading(action);
    try {
      await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote: action === 'REJECT' ? rejectNote : undefined }),
      });
      onAction(); setShowReject(false); setRejectNote('');
    } finally { setLoading(null); }
  }

  return (
    <div className="p-4 border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-center gap-4">
        <Avatar size="sm"><AvatarFallback className="text-[10px]">{getInitials(customer.fullName)}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#0F172A]">{customer.fullName}</p>
          <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-[#94A3B8]">
            <span>{customer.mobile}</span>
            {customer.email && <span>{customer.email}</span>}
            {customer.organisation && <span>{customer.organisation}</span>}
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">Added by {customer.addedByName}</p>
        </div>
        {customer.guestsAccompanied ? (
          <span className="text-xs bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded font-medium shrink-0">
            +{customer.guestsAccompanied} guest{customer.guestsAccompanied !== 1 ? 's' : ''}
          </span>
        ) : null}
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" className="text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEF2F2]"
            loading={loading === 'REJECT'} onClick={() => setShowReject(v => !v)}>
            <XCircle size={14} /> Reject
          </Button>
          <Button size="sm" className="bg-[#059669] hover:bg-[#047857]"
            loading={loading === 'APPROVE'} onClick={() => act('APPROVE')}>
            <CheckCircle2 size={14} /> Approve
          </Button>
        </div>
      </div>
      {showReject && (
        <div className="mt-3 flex gap-2">
          <Input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason for rejection (optional)" className="flex-1 text-sm" />
          <Button size="sm" className="bg-[#DC2626] hover:bg-[#B91C1C]" loading={loading === 'REJECT'} onClick={() => act('REJECT')}>
            Confirm Reject
          </Button>
        </div>
      )}
    </div>
  );
}

interface Props { user: User; eventId: string; }

export function EventDetailClient({ user, eventId }: Props) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [shareCustomer, setShareCustomer] = useState<Customer | null>(null);

  const fetchEvent = useCallback(async () => {
    setLoadingEvent(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { cache: 'no-store' });
      if (res.status === 403 || res.status === 401) { router.replace('/events'); return; }
      if (!res.ok) { router.replace('/events'); return; }
      setEvent((await res.json()).event);
    } finally { setLoadingEvent(false); }
  }, [eventId, router]);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch(`/api/customers?eventId=${eventId}`, { cache: 'no-store' });
      if (res.ok) setCustomers((await res.json()).customers || []);
    } finally { setLoadingCustomers(false); }
  }, [eventId]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const isCreatorOrAdmin = event ? (user.role === 'ADMIN' || event.creatorId === user.id) : false;
  const canEdit = isCreatorOrAdmin;

  const pending  = customers.filter(c => c.status === 'PENDING');
  const approved = customers.filter(c => c.status === 'APPROVED');
  const rejected = customers.filter(c => c.status === 'REJECTED');
  const myCustomers = customers.filter(c => c.addedById === user.id);

  function openShare(c: Customer) { setShareCustomer(c); }

  if (loadingEvent) {
    return <div className="flex items-center justify-center py-32"><Loader2 size={32} className="animate-spin text-[#DB620A]" /></div>;
  }
  if (!event) return null;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/events"><ArrowLeft size={16} /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[event.status]}`}>
              {STATUS_LABELS[event.status]}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] font-semibold">
              {event.type === 'OTHER' && event.otherType ? event.otherType : EVENT_TYPE_LABELS[event.type]}
            </span>
            {TOPIC_LABELS[event.topic] && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] font-semibold">
                {TOPIC_LABELS[event.topic]}
              </span>
            )}
            {canEdit && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF0E7] text-[#DB620A] font-semibold">
                {user.role === 'ADMIN' ? 'Admin' : 'Your Event'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-[#0F172A] leading-tight">{event.name}</h1>
        </div>
      </div>

      {/* Event Code Banner */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FEF0E7] border border-[#DB620A]/20">
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#DB620A] uppercase tracking-widest mb-1">Event Code — Share with your team</p>
          <span className="text-2xl font-black font-mono tracking-widest text-[#DB620A]">{event.eventCode}</span>
        </div>
        <CopyButton text={event.eventCode} label="Copy Code" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">
            Customers
            {isCreatorOrAdmin && pending.length > 0 && (
              <span className="ml-1.5 bg-[#DB620A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar size={15} className="text-[#DB620A]" />Date & Venue</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[#94A3B8]">Date</span><span className="font-semibold text-[#0F172A]">{formatDate(event.date)}</span></div>
                <div className="flex justify-between"><span className="text-[#94A3B8]">Time</span><span className="font-semibold text-[#0F172A]">{event.time}</span></div>
                <div className="flex justify-between"><span className="text-[#94A3B8]">Venue</span><span className="font-semibold text-[#0F172A] text-right max-w-[60%]">{event.venue}</span></div>
                <div className="flex justify-between"><span className="text-[#94A3B8]">City</span><span className="font-semibold text-[#0F172A]">{event.city}, {event.state}</span></div>
                {event.venueType && (
                  <div className="flex justify-between"><span className="text-[#94A3B8]">Venue Type</span><span className="font-semibold text-[#0F172A]">{VENUE_TYPE_LABELS[event.venueType]}</span></div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users size={15} className="text-[#DB620A]" />Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[#94A3B8]">Customers Approved</span><span className="font-semibold text-[#0F172A]">{event.customerCount ?? 0}</span></div>
                {approved.length > 0 && (<>
                  <div className="flex justify-between"><span className="text-[#94A3B8]">✓ Attending</span><span className="font-semibold text-[#15803D]">{approved.filter(c=>c.rsvpStatus==='ATTENDING').length}</span></div>
                  <div className="flex justify-between"><span className="text-[#94A3B8]">? Maybe</span><span className="font-semibold text-[#A16207]">{approved.filter(c=>c.rsvpStatus==='MAYBE').length}</span></div>
                  <div className="flex justify-between"><span className="text-[#94A3B8]">✗ Not Going</span><span className="font-semibold text-[#DC2626]">{approved.filter(c=>c.rsvpStatus==='NOT_ATTENDING').length}</span></div>
                </>)}
                <div className="flex justify-between"><span className="text-[#94A3B8]">Created By</span><span className="font-semibold text-[#0F172A]">{event.creatorName}</span></div>
                {event.tags && event.tags.length > 0 && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[#94A3B8] shrink-0">Tags</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {event.tags.map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-medium">{tag}</span>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {event.description && (
              <Card className="sm:col-span-2">
                <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-[#475569] leading-relaxed">{event.description}</p></CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="customers" className="mt-4 space-y-4">
          {isCreatorOrAdmin ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock size={15} className="text-[#A16207]" /> Awaiting Approval
                    {pending.length > 0 && (
                      <span className="ml-1 bg-[#FEF9C3] text-[#A16207] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
                    )}
                  </CardTitle>
                  <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Customer</Button>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingCustomers ? (
                    <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[#DB620A]" /></div>
                  ) : pending.length === 0 ? (
                    <p className="text-center text-sm text-[#94A3B8] py-8">No pending approvals.</p>
                  ) : (
                    pending.map(c => <PendingCustomerRow key={c.id} customer={c} onAction={fetchCustomers} />)
                  )}
                </CardContent>
              </Card>

              {approved.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#15803D]" /> Approved ({approved.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {approved.map(c => (
                      <CustomerRow key={c.id} customer={c} onShare={() => openShare(c)} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {rejected.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <XCircle size={15} className="text-[#DC2626]" /> Rejected ({rejected.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {rejected.map(c => <CustomerRow key={c.id} customer={c} />)}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users size={15} className="text-[#DB620A]" /> My Submissions
                </CardTitle>
                <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Customer</Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingCustomers ? (
                  <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[#DB620A]" /></div>
                ) : myCustomers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={36} className="text-[#E2E8F0] mx-auto mb-3" />
                    <p className="text-[#475569] font-semibold">No submissions yet</p>
                    <p className="text-sm text-[#94A3B8] mt-1 mb-4">Add a customer for this event.</p>
                    <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} />Add Customer</Button>
                  </div>
                ) : (
                  myCustomers.map(c => (
                    <CustomerRow
                      key={c.id}
                      customer={c}
                      onShare={c.status === 'APPROVED' ? () => openShare(c) : undefined}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AddCustomerDialog eventId={eventId} open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchCustomers} />

      {shareCustomer && (
        <ShareResourceDialog
          customer={shareCustomer}
          eventId={eventId}
          open={!!shareCustomer}
          onClose={() => setShareCustomer(null)}
        />
      )}
    </div>
  );
}
