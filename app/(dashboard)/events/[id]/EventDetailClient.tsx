'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, Copy, Check, Users, Plus, Loader2,
  CheckCircle2, XCircle, Clock, Share2, Sparkles, Download, Palette, FileText, ImageIcon,
  ShieldCheck, ChevronDown, ChevronUp, UserPlus, Trash2, BarChart2,
  ClipboardCheck, UserCheck, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, STATUS_COLORS, STATUS_LABELS, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { User, Event, Customer, CustomerStatus, Creative, RsvpStatus, InviteShare, AttendanceStatus } from '@/types';

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

const ATTENDANCE_CHIP: Record<AttendanceStatus, { label: string; className: string }> = {
  NOT_MARKED: { label: 'Not Marked', className: 'bg-[#F1F5F9] text-[#64748B]' },
  PRESENT:    { label: '✓ Present',  className: 'bg-[#DCFCE7] text-[#15803D]' },
  ABSENT:     { label: '✗ Absent',   className: 'bg-[#FEE2E2] text-[#DC2626]' },
};

/** Returns today's date as YYYY-MM-DD in local time */
function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  rsvpToken?: string,
): Promise<{ blob: Blob; ext: string }> {
  const pos = creative.namePosition;
  const fileRes = await fetch(`/api/creatives/${creative.id}/file`);

  if (creative.mimeType === 'application/pdf') {
    const { PDFDocument, rgb, StandardFonts, PDFName, PDFString, PDFDict } = await import('pdf-lib');
    const bytes = await fileRes.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);
    const [page] = pdfDoc.getPages();

    // 1. Inject customer name if position is defined
    if (pos) {
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = (pos.fontSizePct / 100) * height;
      const textWidth = font.widthOfTextAtSize(name, fontSize);
      let x = (pos.xPct / 100) * width;
      const y = height - (pos.yPct / 100) * height;
      if (pos.align === 'center') x -= textWidth / 2;
      else if (pos.align === 'right') x -= textWidth;
      const [r, g, b] = hexToRgbNorm(pos.color);
      page.drawText(name, { x, y, size: fontSize, font, color: rgb(r, g, b) });
    }

    // 2. Replace RSVP links if rsvpToken provided
    if (rsvpToken) {
      const base = window.location.origin;
      const attendingUrl  = `${base}/api/rsvp?token=${rsvpToken}&response=ATTENDING`;
      const maybeUrl      = `${base}/api/rsvp?token=${rsvpToken}&response=MAYBE`;
      const notGoingUrl   = `${base}/api/rsvp?token=${rsvpToken}&response=NOT_ATTENDING`;

      for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
        if (!(obj instanceof PDFDict)) continue;
        const uriEntry = obj.get(PDFName.of('URI'));
        if (!(uriEntry instanceof PDFString)) continue;
        const uriVal = uriEntry.asString();
        if (uriVal.includes('Rsvp=Confirmed') || uriVal.includes('Rsvp%3DConfirmed')) {
          obj.set(PDFName.of('URI'), PDFString.of(attendingUrl));
        } else if (uriVal.includes('Rsvp=Maybe') || uriVal.includes('Rsvp%3DMaybe')) {
          obj.set(PDFName.of('URI'), PDFString.of(maybeUrl));
        } else if (uriVal.includes('Rsvp=Declined') || uriVal.includes('Rsvp%3DDeclined')) {
          obj.set(PDFName.of('URI'), PDFString.of(notGoingUrl));
        }
      }
    }

    const out = await pdfDoc.save();
    return { blob: new Blob([out as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), ext: 'pdf' };
  }

  // Image → PDF via pdf-lib
  const { PDFDocument, rgb, StandardFonts, PDFName, PDFString } = await import('pdf-lib');
  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  const qrPos    = creative.qrPosition;
  const rsvpArea = creative.rsvpArea;

  const pdfDoc = await PDFDocument.create();

  // Embed the image (convert non-JPEG to PNG via canvas first)
  let embeddedImage;
  if (creative.mimeType === 'image/jpeg') {
    embeddedImage = await pdfDoc.embedJpg(bytes);
  } else {
    // PNG / WEBP / GIF → convert to PNG via canvas
    const pngBytes = await new Promise<Uint8Array>((resolve, reject) => {
      const blob = new Blob([bytes], { type: creative.mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        URL.revokeObjectURL(blobUrl);
        canvas.toBlob(
          b => b!.arrayBuffer().then(buf => resolve(new Uint8Array(buf))),
          'image/png',
        );
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Image load failed')); };
      img.src = blobUrl;
    });
    embeddedImage = await pdfDoc.embedPng(pngBytes);
  }

  const { width, height } = embeddedImage.scale(1);
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(embeddedImage, { x: 0, y: 0, width, height });

  // 1. Name text
  if (pos && name.trim()) {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = (pos.fontSizePct / 100) * height;
    const textWidth = font.widthOfTextAtSize(name, fontSize);
    let x = (pos.xPct / 100) * width;
    // pdf-lib origin is bottom-left; convert from top-%
    const y = height - (pos.yPct / 100) * height;
    if (pos.align === 'center') x -= textWidth / 2;
    else if (pos.align === 'right') x -= textWidth;
    const [r, g, b] = hexToRgbNorm(pos.color);
    page.drawText(name, { x, y, size: fontSize, font, color: rgb(r, g, b) });
  }

  // 2. QR code (only when rsvpToken is known)
  if (qrPos && rsvpToken) {
    const qrcode = (await import('qrcode')).default;
    const qrUrl = `${window.location.origin}/rsvp/respond?token=${rsvpToken}`;
    const dataUrl: string = await qrcode.toDataURL(qrUrl, {
      width: 512, margin: 1, errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    const base64 = dataUrl.split(',')[1];
    const qrBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const qrImg = await pdfDoc.embedPng(qrBytes);
    const qrSize = (qrPos.sizePct / 100) * height;
    // centre of QR box
    const qrX = (qrPos.xPct / 100) * width  - qrSize / 2;
    const qrY = height - (qrPos.yPct / 100) * height - qrSize / 2;
    page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  }

  // 3. Invisible clickable RSVP annotations over the 3-button strip
  if (rsvpArea && rsvpToken) {
    const base = window.location.origin;
    const rsvpUrls = [
      `${base}/api/rsvp?token=${rsvpToken}&response=ATTENDING`,
      `${base}/api/rsvp?token=${rsvpToken}&response=MAYBE`,
      `${base}/api/rsvp?token=${rsvpToken}&response=NOT_ATTENDING`,
    ];
    // Convert top-% coordinates to pdf-lib bottom-left origin
    const ry1 = height * (1 - rsvpArea.y2Pct / 100); // bottom of strip in PDF coords
    const ry2 = height * (1 - rsvpArea.y1Pct / 100); // top of strip in PDF coords
    const btnW = width / 3;
    const annotRefs = rsvpUrls.map((url, i) =>
      pdfDoc.context.register(
        pdfDoc.context.obj({
          Type: PDFName.of('Annot'),
          Subtype: PDFName.of('Link'),
          Rect: [i * btnW, ry1, (i + 1) * btnW, ry2],
          Border: [0, 0, 0],
          A: { S: PDFName.of('URI'), URI: PDFString.of(url) },
        }),
      ),
    );
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotRefs));
  }

  const out = await pdfDoc.save();
  return { blob: new Blob([out as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), ext: 'pdf' };
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

  function logShare(type: 'PERSONALISED' | 'NON_PERSONAL' | 'HTML') {
    if (!selected) return;
    fetch('/api/invite-shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        customerId: customer.id,
        customerName: customer.fullName,
        creativeId: selected.id,
        creativeLabel: selected.label,
        type,
      }),
    }).catch(() => {});
  }

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
      logShare('NON_PERSONAL');
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
      const { blob, ext } = await generatePersonalizedCreative(selected, name, customer.rsvpToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invite-${name.replace(/\s+/g, '-')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      logShare('PERSONALISED');
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
      logShare('HTML');
    } catch {
      setError('Failed to generate HTML invite. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePdfRsvpOnly() {
    if (!selected) return;
    setGenerating(true); setError('');
    try {
      const { blob, ext } = await generatePersonalizedCreative(selected, '', customer.rsvpToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invite-${customer.fullName.replace(/\s+/g, '-')}.${ext}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      logShare('NON_PERSONAL');
    } catch {
      setError('Failed to generate invite with RSVP links. Please try again.');
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
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {isPdf ? 'Name + RSVP links' : 'Name, QR & RSVP links'}
                  </p>
                </button>
              </div>
            )}

            {/* RSVP-only download — for non-personalizable PDFs */}
            {selected && !isHtml && isPdf && !selected.isPersonalizable && (
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3 space-y-2">
                <p className="text-xs font-semibold text-[#1D4ED8]">Inject RSVP Tracking Links</p>
                <p className="text-xs text-[#3B82F6]">Generates a copy of this PDF with personalised Attending / Maybe / Not Attending links for <strong>{customer.fullName}</strong>.</p>
                <Button className="w-full" loading={generating} onClick={handlePdfRsvpOnly}>
                  <Download size={15} /> Generate Invite with RSVP Links
                </Button>
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
                {selected.mimeType.startsWith('image/') && (
                  <div className="p-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1D4ED8] space-y-1">
                    <p className="font-semibold">Generates a PDF with:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[#3B82F6]">
                      <li>Customer name placed at the marked position</li>
                      <li>Unique QR code for <strong>{customer.fullName}</strong></li>
                      <li>3 clickable RSVP buttons (Attending / Maybe / Not Going)</li>
                    </ul>
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

// ── Manage Approvers ──────────────────────────────────────────────────────────

function ManageApproversSection({ event, onUpdated }: {
  event: Event;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!empId.trim()) return;
    setAdding(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/events/${event.id}/approvers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add approver.'); return; }
      setSuccess(`${data.approver.name} now has approval access.`);
      setEmpId('');
      onUpdated();
    } catch { setError('Something went wrong.'); } finally { setAdding(false); }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/events/${event.id}/approvers?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to remove.'); return; }
      onUpdated();
    } catch { setError('Something went wrong.'); } finally { setRemovingId(null); }
  }

  return (
    <Card className="border-[#E2E8F0]">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors rounded-xl"
        onClick={() => { setOpen(v => !v); setError(''); setSuccess(''); }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#DB620A]" />
          <span className="text-sm font-semibold text-[#0F172A]">Manage Approval Access</span>
          {event.approvers.length > 0 && (
            <span className="text-[10px] bg-[#FEF0E7] text-[#DB620A] font-bold px-1.5 py-0.5 rounded-full">
              {event.approvers.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-[#94A3B8]" /> : <ChevronDown size={15} className="text-[#94A3B8]" />}
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 px-5 space-y-4">
          <p className="text-xs text-[#64748B]">
            Give other users the ability to approve or reject customers for this event. Enter their Employee ID to add them.
          </p>

          {/* Current approvers */}
          {event.approvers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">Current Approvers</p>
              {event.approvers.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{a.name}</p>
                    <p className="text-[11px] text-[#94A3B8]">Emp ID: {a.employeeId}</p>
                  </div>
                  <button
                    type="button"
                    disabled={removingId === a.id}
                    onClick={() => handleRemove(a.id)}
                    className="text-[#DC2626] hover:text-[#B91C1C] disabled:opacity-50 p-1.5 rounded-lg hover:bg-[#FEF2F2] transition-colors"
                    title="Remove access"
                  >
                    {removingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8] italic">No delegated approvers yet.</p>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              value={empId}
              onChange={e => setEmpId(e.target.value.replace(/\D/g, ''))}
              placeholder="Employee ID (e.g. 108168)"
              className="flex-1 text-sm"
              maxLength={10}
            />
            <Button type="submit" size="sm" loading={adding} className="shrink-0">
              <UserPlus size={14} /> Add
            </Button>
          </form>

          {error && <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] rounded-lg px-3 py-2">{success}</p>}
        </CardContent>
      )}
    </Card>
  );
}

// ── Manage Attendance Delegates ───────────────────────────────────────────────

function ManageAttendanceDelegatesSection({ event, onUpdated }: { event: Event; onUpdated: () => void }) {
  const [open, setOpen]           = useState(false);
  const [empId, setEmpId]         = useState('');
  const [adding, setAdding]       = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!empId.trim()) return;
    setAdding(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/events/${event.id}/attendance-delegates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add.'); return; }
      setSuccess(`${data.delegate.name} can now mark attendance.`);
      setEmpId('');
      onUpdated();
    } catch { setError('Something went wrong.'); } finally { setAdding(false); }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId); setError(''); setSuccess('');
    try {
      const res = await fetch(
        `/api/events/${event.id}/attendance-delegates?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to remove.'); return; }
      onUpdated();
    } catch { setError('Something went wrong.'); } finally { setRemovingId(null); }
  }

  return (
    <Card className="border-[#E2E8F0]">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors rounded-xl"
        onClick={() => { setOpen(v => !v); setError(''); setSuccess(''); }}
      >
        <div className="flex items-center gap-2">
          <UserCheck size={15} className="text-[#DB620A]" />
          <span className="text-sm font-semibold text-[#0F172A]">Manage Attendance Access</span>
          {event.attendanceDelegates.length > 0 && (
            <span className="text-[10px] bg-[#FEF0E7] text-[#DB620A] font-bold px-1.5 py-0.5 rounded-full">
              {event.attendanceDelegates.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-[#94A3B8]" /> : <ChevronDown size={15} className="text-[#94A3B8]" />}
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 px-5 space-y-4">
          <p className="text-xs text-[#64748B]">
            Give team members the ability to mark customer attendance on the event day. Enter their Employee ID to add them.
          </p>

          {event.attendanceDelegates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">Current Delegates</p>
              {event.attendanceDelegates.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{a.name}</p>
                    <p className="text-[11px] text-[#94A3B8]">Emp ID: {a.employeeId}</p>
                  </div>
                  <button
                    type="button"
                    disabled={removingId === a.id}
                    onClick={() => handleRemove(a.id)}
                    className="text-[#DC2626] hover:text-[#B91C1C] disabled:opacity-50 p-1.5 rounded-lg hover:bg-[#FEF2F2] transition-colors"
                  >
                    {removingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8] italic">No attendance delegates yet.</p>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              value={empId}
              onChange={e => setEmpId(e.target.value.replace(/\D/g, ''))}
              placeholder="Employee ID (e.g. 108168)"
              className="flex-1 text-sm"
              maxLength={10}
            />
            <Button type="submit" size="sm" loading={adding} className="shrink-0">
              <UserPlus size={14} /> Add
            </Button>
          </form>

          {error   && <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] rounded-lg px-3 py-2">{success}</p>}
        </CardContent>
      )}
    </Card>
  );
}

// ── Attendance Row ─────────────────────────────────────────────────────────────

function AttendanceRow({ customer, canMark, onUpdate }: {
  customer: Customer;
  canMark: boolean;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState<AttendanceStatus | null>(null);
  const current = customer.attendanceStatus ?? 'NOT_MARKED';

  async function mark(status: AttendanceStatus) {
    if (loading) return;
    setLoading(status);
    try {
      await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_ATTENDANCE', attendanceStatus: status }),
      });
      onUpdate();
    } finally { setLoading(null); }
  }

  const chip = ATTENDANCE_CHIP[current];

  return (
    <div className="flex items-center gap-3 p-4 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors">
      <Avatar size="sm">
        <AvatarFallback className="text-[10px]">{getInitials(customer.fullName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#0F172A]">{customer.fullName}</p>
        <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-[#94A3B8]">
          <span>{customer.mobile}</span>
          {customer.organisation && <span>{customer.organisation}</span>}
          {customer.rsvpStatus !== 'NO_RESPONSE' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${RSVP_CHIP[customer.rsvpStatus].className}`}>
              {RSVP_CHIP[customer.rsvpStatus].label}
            </span>
          )}
        </div>
      </div>

      {/* Attendance status chip */}
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${chip.className}`}>
        {chip.label}
      </span>

      {/* Mark buttons — only when canMark */}
      {canMark && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => mark(current === 'PRESENT' ? 'NOT_MARKED' : 'PRESENT')}
            disabled={!!loading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${
              current === 'PRESENT'
                ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]'
                : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#86EFAC] hover:text-[#15803D]'
            }`}
          >
            {loading === 'PRESENT' ? <Loader2 size={12} className="animate-spin inline" /> : '✓ Present'}
          </button>
          <button
            onClick={() => mark(current === 'ABSENT' ? 'NOT_MARKED' : 'ABSENT')}
            disabled={!!loading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${
              current === 'ABSENT'
                ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]'
                : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#FCA5A5] hover:text-[#DC2626]'
            }`}
          >
            {loading === 'ABSENT' ? <Loader2 size={12} className="animate-spin inline" /> : '✗ Absent'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Attendance Tab ─────────────────────────────────────────────────────────────

function AttendanceTab({
  event,
  approved,
  isCreatorOrAdmin,
  isAttendanceDelegate,
  onEventUpdated,
  onCustomersUpdated,
}: {
  event: Event;
  approved: Customer[];
  isCreatorOrAdmin: boolean;
  isAttendanceDelegate: boolean;
  onEventUpdated: () => void;
  onCustomersUpdated: () => void;
}) {
  const [bulkLoading, setBulkLoading] = useState(false);

  const today       = localDateStr();
  const isEventDay  = event.date === today;
  const isFuture    = event.date > today;
  const canMark     = isEventDay && (isCreatorOrAdmin || isAttendanceDelegate);

  const presentCount   = approved.filter(c => c.attendanceStatus === 'PRESENT').length;
  const absentCount    = approved.filter(c => c.attendanceStatus === 'ABSENT').length;
  const notMarkedCount = approved.filter(c => c.attendanceStatus === 'NOT_MARKED').length;

  async function bulkMark(status: 'PRESENT' | 'ABSENT') {
    setBulkLoading(true);
    try {
      await Promise.all(
        approved
          .filter(c => c.attendanceStatus !== status)
          .map(c =>
            fetch(`/api/customers/${c.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'UPDATE_ATTENDANCE', attendanceStatus: status }),
            }),
          ),
      );
      onCustomersUpdated();
    } finally { setBulkLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Date context banner */}
      {isFuture && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Attendance opens on the event day</p>
            <p className="text-xs mt-0.5 opacity-80">
              You can mark attendance on <strong>{event.date}</strong>. Come back on the day of the event.
            </p>
          </div>
        </div>
      )}
      {!isFuture && !isEventDay && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569]">
          <ClipboardCheck size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Event has passed — attendance is read-only</p>
            <p className="text-xs mt-0.5 opacity-80">
              Attendance was open on <strong>{event.date}</strong>. The recorded results are shown below.
            </p>
          </div>
        </div>
      )}
      {isEventDay && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D]">
          <ClipboardCheck size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Today is the event day — attendance marking is open!</p>
            <p className="text-xs mt-0.5 opacity-80">Mark each customer as Present or Absent below.</p>
          </div>
        </div>
      )}

      {/* Manage attendance delegates — creator/admin only */}
      {isCreatorOrAdmin && (
        <ManageAttendanceDelegatesSection event={event} onUpdated={onEventUpdated} />
      )}

      {/* Delegate notice for non-creator delegates */}
      {isAttendanceDelegate && !isCreatorOrAdmin && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1D4ED8]">
          <UserCheck size={14} className="shrink-0" />
          <span>You have been granted attendance access for this event by the creator.</span>
        </div>
      )}

      {/* Summary chips */}
      {approved.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-[#DCFCE7] border-[#86EFAC] p-3 text-center">
            <p className="text-2xl font-black text-[#15803D] leading-none">{presentCount}</p>
            <p className="text-[11px] font-semibold text-[#15803D] mt-1">Present</p>
          </div>
          <div className="rounded-xl border bg-[#FEF2F2] border-[#FCA5A5] p-3 text-center">
            <p className="text-2xl font-black text-[#DC2626] leading-none">{absentCount}</p>
            <p className="text-[11px] font-semibold text-[#DC2626] mt-1">Absent</p>
          </div>
          <div className="rounded-xl border bg-[#F1F5F9] border-[#E2E8F0] p-3 text-center">
            <p className="text-2xl font-black text-[#64748B] leading-none">{notMarkedCount}</p>
            <p className="text-[11px] font-semibold text-[#64748B] mt-1">Not Marked</p>
          </div>
        </div>
      )}

      {/* Customer attendance list */}
      <Card className="border-[#E2E8F0]">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck size={15} className="text-[#DB620A]" />
            Attendance ({approved.length} approved customer{approved.length !== 1 ? 's' : ''})
          </CardTitle>

          {/* Bulk actions — only on event day */}
          {canMark && approved.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={bulkLoading}
                onClick={() => bulkMark('PRESENT')}
                className="text-xs border-[#86EFAC] text-[#15803D] hover:bg-[#DCFCE7]"
              >
                <CheckCircle2 size={13} /> Mark All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                loading={bulkLoading}
                onClick={() => bulkMark('ABSENT')}
                className="text-xs border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEF2F2]"
              >
                <XCircle size={13} /> Mark All Absent
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {approved.length === 0 ? (
            <p className="text-center text-sm text-[#94A3B8] py-10">
              No approved customers yet.
            </p>
          ) : (
            approved.map(c => (
              <AttendanceRow
                key={c.id}
                customer={c}
                canMark={canMark}
                onUpdate={onCustomersUpdated}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab({ eventId, event }: { eventId: string; event: Event }) {
  const [data, setData] = useState<{ customers: Customer[]; inviteShares: InviteShare[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/events/${eventId}/report`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function handleDownload() {
    if (!data) return;
    setDlLoading(true);
    try {
      const XLSX = (await import('xlsx')).default;
      const wb = XLSX.utils.book_new();
      const { customers, inviteShares } = data;
      const approved = customers.filter(c => c.status === 'APPROVED');

      // Sheet 1: Summary
      const summaryRows: (string | number)[][] = [
        ['iEvent Report', event.name],
        ['Event Code', event.eventCode],
        ['Date', event.date],
        ['Time', event.time],
        ['Venue', event.venue],
        ['City', `${event.city}, ${event.state}`],
        ['Creator', event.creatorName],
        [''],
        ['CUSTOMER SUMMARY', ''],
        ['Total Customers Added', customers.length],
        ['Total Approved', customers.filter(c => c.status === 'APPROVED').length],
        ['Total Rejected', customers.filter(c => c.status === 'REJECTED').length],
        ['Total Pending', customers.filter(c => c.status === 'PENDING').length],
        [''],
        ['RSVP SUMMARY (Approved Customers)', ''],
        ['Attending', approved.filter(c => c.rsvpStatus === 'ATTENDING').length],
        ['Maybe', approved.filter(c => c.rsvpStatus === 'MAYBE').length],
        ['Not Attending', approved.filter(c => c.rsvpStatus === 'NOT_ATTENDING').length],
        ['No Response', approved.filter(c => c.rsvpStatus === 'NO_RESPONSE').length],
        [''],
        ['INVITATIONS SHARED', ''],
        ['Total Invitations Shared', inviteShares.length],
        [''],
        ['POST EVENT ATTENDANCE', ''],
        ['Attended (Present)', customers.filter(c => c.attendanceStatus === 'PRESENT').length],
        ['Absent', customers.filter(c => c.attendanceStatus === 'ABSENT').length],
        ['Not Marked', customers.filter(c => c.attendanceStatus === 'NOT_MARKED').length],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

      // Sheet 2: Customers
      const customerRows: (string | number)[][] = [
        ['Full Name', 'Mobile', 'Email', 'Organisation', 'Guests Accompanied', 'Approval Status', 'RSVP Status', 'Attendance', 'Added By', 'Added At', 'Review Note'],
        ...customers.map(c => [
          c.fullName, c.mobile, c.email || '', c.organisation || '',
          c.guestsAccompanied ?? 0, c.status, c.rsvpStatus,
          c.attendanceStatus ?? 'NOT_MARKED',
          c.addedByName, new Date(c.createdAt).toLocaleString('en-IN'),
          c.reviewNote || '',
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(customerRows), 'Customers');

      // Sheet 3: Invite Shares
      const typeLabel = (t: string) =>
        t === 'PERSONALISED' ? 'Personalised' : t === 'NON_PERSONAL' ? 'Non-Personalised' : 'HTML Template';
      const shareRows: (string | number)[][] = inviteShares.length > 0 ? [
        ['Shared By', 'Customer Name', 'Creative', 'Type', 'Date & Time'],
        ...inviteShares.map(s => [
          s.sharedByName, s.customerName, s.creativeLabel,
          typeLabel(s.type), new Date(s.createdAt).toLocaleString('en-IN'),
        ]),
      ] : [['No invitations shared yet']];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(shareRows), 'Invite Shares');

      const safeName = event.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
      XLSX.writeFile(wb, `${safeName}-report.xlsx`);
    } finally {
      setDlLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[#DB620A]" />
      </div>
    );
  }
  if (!data) return null;

  const { customers, inviteShares } = data;
  const approved      = customers.filter(c => c.status === 'APPROVED');
  const totalAdded    = customers.length;
  const totalApproved = customers.filter(c => c.status === 'APPROVED').length;
  const totalRejected = customers.filter(c => c.status === 'REJECTED').length;
  const totalPending  = customers.filter(c => c.status === 'PENDING').length;
  const attending     = approved.filter(c => c.rsvpStatus === 'ATTENDING').length;
  const maybe         = approved.filter(c => c.rsvpStatus === 'MAYBE').length;
  const notAttending  = approved.filter(c => c.rsvpStatus === 'NOT_ATTENDING').length;
  const noResponse    = approved.filter(c => c.rsvpStatus === 'NO_RESPONSE').length;
  const totalShared   = inviteShares.length;

  const sharesByUser = Object.entries(
    inviteShares.reduce((acc, s) => {
      acc[s.sharedByName] = (acc[s.sharedByName] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  ).sort(([, a], [, b]) => b - a);

  const statRow = (items: { label: string; value: number; bg: string; txt: string }[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(s => (
        <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
          <p className={`text-3xl font-black leading-none ${s.txt}`}>{s.value}</p>
          <p className={`text-xs font-semibold mt-2 ${s.txt} opacity-80`}>{s.label}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-[#0F172A]">Event Report</h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">Live snapshot · {event.name}</p>
        </div>
        <Button loading={dlLoading} onClick={handleDownload} className="shrink-0">
          <Download size={15} /> Download Excel
        </Button>
      </div>

      {/* Customer Summary */}
      <div>
        <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-widest mb-3">
          Customer Summary
        </p>
        {statRow([
          { label: 'Total Added',  value: totalAdded,    bg: 'bg-[#EFF6FF] border-[#BFDBFE]', txt: 'text-[#1D4ED8]' },
          { label: 'Approved',     value: totalApproved, bg: 'bg-[#DCFCE7] border-[#86EFAC]', txt: 'text-[#15803D]' },
          { label: 'Rejected',     value: totalRejected, bg: 'bg-[#FEF2F2] border-[#FCA5A5]', txt: 'text-[#DC2626]' },
          { label: 'Pending',      value: totalPending,  bg: 'bg-[#FEF9C3] border-[#FDE047]', txt: 'text-[#A16207]' },
        ])}
      </div>

      {/* RSVP Summary */}
      <div>
        <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-widest mb-1">
          RSVP Status
        </p>
        <p className="text-xs text-[#94A3B8] mb-3">
          Across {totalApproved} approved customer{totalApproved !== 1 ? 's' : ''}
        </p>
        {statRow([
          { label: '✓ Attending',  value: attending,    bg: 'bg-[#DCFCE7] border-[#86EFAC]', txt: 'text-[#15803D]' },
          { label: '? Maybe',      value: maybe,        bg: 'bg-[#FEF9C3] border-[#FDE047]', txt: 'text-[#A16207]' },
          { label: '✗ Not Going',  value: notAttending, bg: 'bg-[#FEF2F2] border-[#FCA5A5]', txt: 'text-[#DC2626]' },
          { label: 'No Response',  value: noResponse,   bg: 'bg-[#F1F5F9] border-[#E2E8F0]', txt: 'text-[#475569]' },
        ])}
      </div>

      {/* Invitations Shared */}
      <Card className="border-[#E2E8F0]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Share2 size={15} className="text-[#DB620A]" /> Invitations Shared
            </CardTitle>
            <span className="text-3xl font-black text-[#DB620A] leading-none">{totalShared}</span>
          </div>
        </CardHeader>
        <CardContent>
          {sharesByUser.length === 0 ? (
            <p className="text-xs text-[#94A3B8] text-center py-4 italic">
              No invitations have been shared yet. Shares are tracked when team members download invites.
            </p>
          ) : (
            <div className="space-y-0.5">
              <div className="grid grid-cols-2 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide pb-2 mb-1 border-b border-[#F1F5F9]">
                <span>Team Member</span>
                <span className="text-right">Invites</span>
              </div>
              {sharesByUser.map(([name, count]) => (
                <div key={name} className="grid grid-cols-2 items-center py-2 border-b border-[#F8FAFC] last:border-0">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold text-[#0F172A]">{name}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex-1 max-w-[80px] h-1.5 bg-[#FEF0E7] rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-[#DB620A] rounded-full"
                        style={{ width: `${Math.round((count / totalShared) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-black text-[#DB620A] min-w-[1.5rem] text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Event Status — live attendance data */}
      {(() => {
        const present   = customers.filter(c => c.attendanceStatus === 'PRESENT').length;
        const absent    = customers.filter(c => c.attendanceStatus === 'ABSENT').length;
        const notMarked = customers.filter(c => c.attendanceStatus === 'NOT_MARKED').length;
        const hasData   = present > 0 || absent > 0;
        return (
          <div>
            <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-widest mb-1">
              Post Event Status
            </p>
            <p className="text-xs text-[#94A3B8] mb-3">
              Attendance marked via the Attendance tab on the event day
            </p>
            {hasData ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Attended',   value: present,   bg: 'bg-[#DCFCE7] border-[#86EFAC]',  txt: 'text-[#15803D]' },
                  { label: 'Absent',     value: absent,    bg: 'bg-[#FEF2F2] border-[#FCA5A5]',  txt: 'text-[#DC2626]' },
                  { label: 'Not Marked', value: notMarked, bg: 'bg-[#F1F5F9] border-[#E2E8F0]',  txt: 'text-[#64748B]' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
                    <p className={`text-3xl font-black leading-none ${s.txt}`}>{s.value}</p>
                    <p className={`text-xs font-semibold mt-2 ${s.txt} opacity-80`}>{s.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-[#E2E8F0] p-6 text-center">
                <ClipboardCheck size={28} className="text-[#E2E8F0] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#475569]">No attendance recorded yet</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Attendance is marked on the event day via the Attendance tab.
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CustomerRow({ customer, onShare, canUpdateRsvp, onRsvpUpdate }: {
  customer: Customer;
  onShare?: () => void;
  canUpdateRsvp?: boolean;
  onRsvpUpdate?: () => void;
}) {
  const chip = STATUS_CHIP[customer.status];
  const [showRsvpPicker, setShowRsvpPicker] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  async function handleRsvpChange(newStatus: RsvpStatus) {
    setRsvpLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_RSVP', rsvpStatus: newStatus }),
      });
      if (res.ok) { onRsvpUpdate?.(); setShowRsvpPicker(false); }
    } finally { setRsvpLoading(false); }
  }

  const currentRsvp = customer.rsvpStatus ?? 'NO_RESPONSE';

  return (
    <div className="border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-center gap-3 p-4 hover:bg-[#F8FAFC] transition-colors">
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
          <button
            type="button"
            onClick={() => canUpdateRsvp && setShowRsvpPicker(v => !v)}
            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 transition-all ${RSVP_CHIP[currentRsvp].className} ${canUpdateRsvp ? 'cursor-pointer ring-1 ring-transparent hover:ring-current hover:shadow-sm' : 'cursor-default'}`}
            title={canUpdateRsvp ? 'Click to update RSVP' : undefined}
          >
            {RSVP_CHIP[currentRsvp].label}{canUpdateRsvp && <span className="ml-1 opacity-60">▾</span>}
          </button>
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

      {/* Inline RSVP picker — visible only for authorised users */}
      {customer.status === 'APPROVED' && canUpdateRsvp && showRsvpPicker && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-[#94A3B8] font-medium mr-1">Set RSVP:</span>
          {(['NO_RESPONSE', 'ATTENDING', 'MAYBE', 'NOT_ATTENDING'] as RsvpStatus[]).map(s => (
            <button
              key={s}
              disabled={rsvpLoading}
              onClick={() => handleRsvpChange(s)}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border-2 transition-all disabled:opacity-50 ${
                currentRsvp === s
                  ? `${RSVP_CHIP[s].className} border-current`
                  : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#DB620A] hover:text-[#DB620A]'
              }`}
            >
              {rsvpLoading && currentRsvp !== s ? '…' : RSVP_CHIP[s].label}
            </button>
          ))}
          <button
            onClick={() => setShowRsvpPicker(false)}
            className="text-[11px] text-[#94A3B8] hover:text-[#475569] ml-1"
          >
            Cancel
          </button>
        </div>
      )}
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

  const isCreatorOrAdmin     = event ? (user.role === 'ADMIN' || event.creatorId === user.id) : false;
  const isApprover           = event ? (event.approverIds ?? []).includes(user.id) : false;
  const isAttendanceDelegate = event ? (event.attendanceDelegateIds ?? []).includes(user.id) : false;
  const hasApprovalAccess    = isCreatorOrAdmin || isApprover;
  const hasAttendanceAccess  = isCreatorOrAdmin || isAttendanceDelegate;
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
            {hasApprovalAccess && pending.length > 0 && (
              <span className="ml-1.5 bg-[#DB620A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          {hasAttendanceAccess && (
            <TabsTrigger value="attendance" className="flex items-center gap-1.5">
              <ClipboardCheck size={13} /> Attendance
            </TabsTrigger>
          )}
          {isCreatorOrAdmin && (
            <TabsTrigger value="reports" className="flex items-center gap-1.5">
              <BarChart2 size={13} /> Reports
            </TabsTrigger>
          )}
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
          {hasApprovalAccess ? (
            <>
              {/* Manage approvers — creator/admin only */}
              {isCreatorOrAdmin && (
                <ManageApproversSection event={event} onUpdated={fetchEvent} />
              )}

              {/* Delegated approver notice */}
              {isApprover && !isCreatorOrAdmin && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1D4ED8]">
                  <ShieldCheck size={14} className="shrink-0" />
                  <span>You have been granted approval access for this event by the creator.</span>
                </div>
              )}

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
                      <CustomerRow
                        key={c.id}
                        customer={c}
                        onShare={() => openShare(c)}
                        canUpdateRsvp
                        onRsvpUpdate={fetchCustomers}
                      />
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
                      canUpdateRsvp={c.status === 'APPROVED'}
                      onRsvpUpdate={fetchCustomers}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {hasAttendanceAccess && (
          <TabsContent value="attendance" className="mt-4">
            <AttendanceTab
              event={event}
              approved={approved}
              isCreatorOrAdmin={isCreatorOrAdmin}
              isAttendanceDelegate={isAttendanceDelegate}
              onEventUpdated={fetchEvent}
              onCustomersUpdated={fetchCustomers}
            />
          </TabsContent>
        )}

        {isCreatorOrAdmin && (
          <TabsContent value="reports" className="mt-4">
            <ReportsTab eventId={eventId} event={event} />
          </TabsContent>
        )}
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
