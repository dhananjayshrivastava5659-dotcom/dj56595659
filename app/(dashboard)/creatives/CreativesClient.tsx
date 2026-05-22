'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, Download, Trash2, Palette, Loader2, FileImage,
  FileText, Plus, ImageIcon, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { User, Event, Creative, NamePosition, QrPosition, RsvpArea, MapLinkArea } from '@/types';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType === 'application/pdf') return <FileText className={className} />;
  return <ImageIcon className={className} />;
}

const DEFAULT_NAME_POSITION: NamePosition = { xPct: 50, yPct: 23, fontSizePct: 4, color: '#ffffff', align: 'center' };
const DEFAULT_QR_POSITION: QrPosition = { xPct: 84, yPct: 84, sizePct: 10 };
const DEFAULT_RSVP_AREA: RsvpArea = { y1Pct: 82, y2Pct: 96 };
const DEFAULT_MAP_LINK_AREA: MapLinkArea = { xPct: 73, yPct: 78, wPct: 16, hPct: 7 };

type ClickMode = 'name' | 'qr' | 'mapLink';

function PositionPicker({
  file, namePosition, onNameChange,
  qrPosition, onQrChange, rsvpArea, onRsvpChange,
  mapLinkArea, onMapLinkAreaChange, mapUrl, onMapUrlChange,
}: {
  file: File;
  namePosition: NamePosition;    onNameChange: (p: NamePosition) => void;
  qrPosition: QrPosition;        onQrChange: (p: QrPosition) => void;
  rsvpArea: RsvpArea;            onRsvpChange: (a: RsvpArea) => void;
  mapLinkArea: MapLinkArea;      onMapLinkAreaChange: (a: MapLinkArea) => void;
  mapUrl: string;                onMapUrlChange: (url: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const [sampleName, setSampleName] = useState('Rahul Kumar');
  const [blobUrl, setBlobUrl]       = useState('');
  const [clickMode, setClickMode]   = useState<ClickMode>('name');
  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  useEffect(() => {
    if (!isImage || !blobUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    async function render(img: HTMLImageElement) {
      if (!canvas) return;
      // Ensure Mulish is loaded before drawing (declared in globals.css via @font-face)
      try { await document.fonts.load('bold 16px Mulish'); } catch {}
      const parent  = canvas.parentElement;
      const displayW = parent ? parent.clientWidth : 460;
      const scale    = displayW / img.naturalWidth;
      canvas.width   = displayW;
      canvas.height  = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // RSVP area band
      const by1 = (rsvpArea.y1Pct / 100) * canvas.height;
      const by2 = (rsvpArea.y2Pct / 100) * canvas.height;
      ctx.fillStyle = 'rgba(59,130,246,0.12)';
      ctx.fillRect(0, by1, canvas.width, by2 - by1);
      ctx.strokeStyle = 'rgba(59,130,246,0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(0.75, by1, canvas.width - 1.5, by2 - by1);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(59,130,246,0.35)';
      [1, 2].forEach(n => {
        ctx.beginPath();
        ctx.moveTo((n / 3) * canvas.width, by1);
        ctx.lineTo((n / 3) * canvas.width, by2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      // "RSVP" label inside band
      ctx.fillStyle = 'rgba(59,130,246,0.7)';
      ctx.font = `bold ${Math.max(7, (by2 - by1) * 0.35)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ['Attending', 'Maybe', 'Not\xa0Going'].forEach((lbl, i) => {
        ctx.fillText(lbl, ((i + 0.5) / 3) * canvas.width, (by1 + by2) / 2);
      });

      // Name text
      const nameFs = Math.max(6, (namePosition.fontSizePct / 100) * canvas.height);
      ctx.font = `bold ${nameFs}px Mulish, "Helvetica Neue", Helvetica, sans-serif`;
      ctx.fillStyle = namePosition.color;
      ctx.textAlign = namePosition.align as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      ctx.fillText(sampleName || 'Customer Name',
        (namePosition.xPct / 100) * canvas.width,
        (namePosition.yPct / 100) * canvas.height);

      // QR code placeholder box
      const qrSide = (qrPosition.sizePct / 100) * canvas.height;
      const qrCx = (qrPosition.xPct / 100) * canvas.width;
      const qrCy = (qrPosition.yPct / 100) * canvas.height;
      const qrX = qrCx - qrSide / 2;
      const qrY = qrCy - qrSide / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillRect(qrX, qrY, qrSide, qrSide);
      ctx.strokeStyle = '#DB620A';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(qrX + 1, qrY + 1, qrSide - 2, qrSide - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = '#DB620A';
      ctx.font = `bold ${Math.max(7, qrSide * 0.22)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('QR', qrCx, qrCy);

      // Map link clickable zone (green dashed box)
      const mlCx = (mapLinkArea.xPct / 100) * canvas.width;
      const mlCy = (mapLinkArea.yPct / 100) * canvas.height;
      const mlW  = (mapLinkArea.wPct / 100) * canvas.width;
      const mlH  = (mapLinkArea.hPct / 100) * canvas.height;
      const mlX  = mlCx - mlW / 2;
      const mlY  = mlCy - mlH / 2;
      ctx.fillStyle = 'rgba(34,197,94,0.12)';
      ctx.fillRect(mlX, mlY, mlW, mlH);
      ctx.strokeStyle = 'rgba(34,197,94,0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(mlX + 0.75, mlY + 0.75, mlW - 1.5, mlH - 1.5);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(22,163,74,0.9)';
      ctx.font = `bold ${Math.max(7, mlH * 0.38)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Map', mlCx, mlCy);
    }

    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      render(imgRef.current);
    } else {
      const img = new Image();
      img.onload = () => { imgRef.current = img; render(img); };
      img.src = blobUrl;
    }
  }, [isImage, blobUrl, namePosition, qrPosition, rsvpArea, sampleName, mapLinkArea]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    if (clickMode === 'name') onNameChange({ ...namePosition, xPct, yPct });
    else if (clickMode === 'mapLink') onMapLinkAreaChange({ ...mapLinkArea, xPct, yPct });
    else onQrChange({ ...qrPosition, xPct, yPct });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[#475569]">Sample name for preview</label>
        <Input value={sampleName} onChange={e => setSampleName(e.target.value)}
          placeholder="e.g. Rahul Kumar" className="h-8 text-sm" />
      </div>

      {isImage ? (
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {(['name', 'qr', 'mapLink'] as ClickMode[]).map(m => (
              <button key={m} type="button" onClick={() => setClickMode(m)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  clickMode === m ? 'bg-[#DB620A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}>
                {m === 'name' ? '✎ Place Name' : m === 'qr' ? '⊡ Place QR' : '📍 Map Link'}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-[#94A3B8]">Click image to set position</span>
          </div>
          <canvas ref={canvasRef}
            className="w-full rounded-lg border border-[#E2E8F0] cursor-crosshair"
            onClick={handleCanvasClick} />
          <p className="text-[10px] text-[#94A3B8] mt-1">
            Orange box = QR · Blue band = RSVP · Green box = Map link zone · text = name
          </p>
        </div>
      ) : (
        <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-center">
          <FileText size={28} className="text-[#CBD5E1] mx-auto mb-2" />
          <p className="text-sm text-[#475569] font-medium">PDF — set coordinates below</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">X: 50 = centred · Y: 0 = top, 100 = bottom</p>
        </div>
      )}

      {/* ── Name settings ── */}
      <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 space-y-2.5">
        <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">Name Placement</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <label className="text-[10px] text-[#94A3B8]">X (%)</label>
            <Input type="number" min="0" max="100" value={Math.round(namePosition.xPct)}
              onChange={e => onNameChange({ ...namePosition, xPct: +e.target.value })}
              className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-[#94A3B8]">Y (%)</label>
            <Input type="number" min="0" max="100" value={Math.round(namePosition.yPct)}
              onChange={e => onNameChange({ ...namePosition, yPct: +e.target.value })}
              className="h-7 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="space-y-0.5">
            <label className="text-[10px] text-[#94A3B8]">Font size: {namePosition.fontSizePct}% of height</label>
            <input type="range" min="1" max="12" step="0.5" value={namePosition.fontSizePct}
              onChange={e => onNameChange({ ...namePosition, fontSizePct: +e.target.value })}
              className="w-full accent-[#DB620A]" />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-[#94A3B8]">Colour</label>
            <div className="flex items-center gap-1.5 mt-0.5">
              <input type="color" value={namePosition.color}
                onChange={e => onNameChange({ ...namePosition, color: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border border-[#E2E8F0]" />
              <span className="text-[10px] text-[#475569]">{namePosition.color}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(a => {
            const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
            return (
              <button key={a} type="button" onClick={() => onNameChange({ ...namePosition, align: a })}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-semibold transition-colors ${
                  namePosition.align === a ? 'bg-[#DB620A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}>
                <Icon size={11} />{a[0].toUpperCase() + a.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── QR code settings (images only) ── */}
      {isImage && (
        <div className="rounded-xl bg-[#FFF7ED] border border-[#FED7AA] p-3 space-y-2.5">
          <div>
            <p className="text-[11px] font-semibold text-[#C2410C] uppercase tracking-wide">QR Code</p>
            <p className="text-[10px] text-[#9A3412] mt-0.5">
              Links to a personalised RSVP choice page. Each customer gets a unique QR.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#9A3412]">Centre X (%)</label>
              <Input type="number" min="0" max="100" value={Math.round(qrPosition.xPct)}
                onChange={e => onQrChange({ ...qrPosition, xPct: +e.target.value })}
                className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#9A3412]">Centre Y (%)</label>
              <Input type="number" min="0" max="100" value={Math.round(qrPosition.yPct)}
                onChange={e => onQrChange({ ...qrPosition, yPct: +e.target.value })}
                className="h-7 text-xs" />
            </div>
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-[#9A3412]">Size: {qrPosition.sizePct}% of image height</label>
            <input type="range" min="4" max="25" step="0.5" value={qrPosition.sizePct}
              onChange={e => onQrChange({ ...qrPosition, sizePct: +e.target.value })}
              className="w-full accent-[#DB620A]" />
          </div>
        </div>
      )}

      {/* ── RSVP button area (images only) ── */}
      {isImage && (
        <div className="rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] p-3 space-y-2.5">
          <div>
            <p className="text-[11px] font-semibold text-[#1D4ED8] uppercase tracking-wide">RSVP Button Area</p>
            <p className="text-[10px] text-[#1E40AF] mt-0.5">
              Blue band on preview. The PDF will add invisible clickable links over the 3 buttons already in your design.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#1E40AF]">Top edge: {Math.round(rsvpArea.y1Pct)}% from top</label>
              <input type="range" min="50" max="97" step="0.5" value={rsvpArea.y1Pct}
                onChange={e => onRsvpChange({ ...rsvpArea, y1Pct: Math.min(+e.target.value, rsvpArea.y2Pct - 2) })}
                className="w-full accent-[#1D4ED8]" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#1E40AF]">Bottom edge: {Math.round(rsvpArea.y2Pct)}% from top</label>
              <input type="range" min="52" max="100" step="0.5" value={rsvpArea.y2Pct}
                onChange={e => onRsvpChange({ ...rsvpArea, y2Pct: Math.max(+e.target.value, rsvpArea.y1Pct + 2) })}
                className="w-full accent-[#1D4ED8]" />
            </div>
          </div>
        </div>
      )}

      {/* ── Map location link (images only) ── */}
      {isImage && (
        <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-3 space-y-2.5">
          <div>
            <p className="text-[11px] font-semibold text-[#15803D] uppercase tracking-wide">Map Location Link</p>
            <p className="text-[10px] text-[#166534] mt-0.5">
              Green box on preview. Click the map icon on your creative or adjust below. An invisible link will be placed over it in the PDF.
            </p>
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-[#166534]">Google Maps URL</label>
            <Input value={mapUrl} onChange={e => onMapUrlChange(e.target.value)}
              placeholder="https://maps.app.goo.gl/..." className="h-7 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#166534]">Centre X: {Math.round(mapLinkArea.xPct)}%</label>
              <Input type="number" min="0" max="100" value={Math.round(mapLinkArea.xPct)}
                onChange={e => onMapLinkAreaChange({ ...mapLinkArea, xPct: +e.target.value })}
                className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#166534]">Centre Y: {Math.round(mapLinkArea.yPct)}%</label>
              <Input type="number" min="0" max="100" value={Math.round(mapLinkArea.yPct)}
                onChange={e => onMapLinkAreaChange({ ...mapLinkArea, yPct: +e.target.value })}
                className="h-7 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#166534]">Width: {Math.round(mapLinkArea.wPct)}% of image</label>
              <input type="range" min="2" max="60" step="0.5" value={mapLinkArea.wPct}
                onChange={e => onMapLinkAreaChange({ ...mapLinkArea, wPct: +e.target.value })}
                className="w-full accent-[#16A34A]" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-[#166534]">Height: {Math.round(mapLinkArea.hPct)}% of image</label>
              <input type="range" min="2" max="40" step="0.5" value={mapLinkArea.hPct}
                onChange={e => onMapLinkAreaChange({ ...mapLinkArea, hPct: +e.target.value })}
                className="w-full accent-[#16A34A]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadDialog({ eventId, open, onClose, onUploaded }: {
  eventId: string; open: boolean; onClose: () => void; onUploaded: () => void;
}) {
  const [label, setLabel]                     = useState('');
  const [file, setFile]                       = useState<File | null>(null);
  const [isPersonalizable, setIsPersonalizable] = useState(false);
  const [namePosition, setNamePosition]       = useState<NamePosition>(DEFAULT_NAME_POSITION);
  const [qrPosition, setQrPosition]           = useState<QrPosition>(DEFAULT_QR_POSITION);
  const [rsvpArea, setRsvpArea]               = useState<RsvpArea>(DEFAULT_RSVP_AREA);
  const [mapUrl, setMapUrl]                   = useState('');
  const [mapLinkArea, setMapLinkArea]         = useState<MapLinkArea>(DEFAULT_MAP_LINK_AREA);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    onClose();
    setLabel(''); setFile(null); setError('');
    setIsPersonalizable(false);
    setNamePosition(DEFAULT_NAME_POSITION);
    setQrPosition(DEFAULT_QR_POSITION);
    setRsvpArea(DEFAULT_RSVP_AREA);
    setMapUrl('');
    setMapLinkArea(DEFAULT_MAP_LINK_AREA);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    if (!label.trim()) { setError('Please enter a label.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('eventId', eventId);
      fd.append('label', label.trim());
      fd.append('file', file);
      fd.append('isPersonalizable', isPersonalizable ? 'true' : 'false');
      if (isPersonalizable) {
        fd.append('namePosition', JSON.stringify(namePosition));
        if (file.type.startsWith('image/')) {
          fd.append('qrPosition', JSON.stringify(qrPosition));
          fd.append('rsvpArea', JSON.stringify(rsvpArea));
          if (mapUrl.trim()) {
            fd.append('mapUrl', mapUrl.trim());
            fd.append('mapLinkArea', JSON.stringify(mapLinkArea));
          }
        }
      }
      const res  = await fetch('/api/creatives', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed.'); return; }
      onUploaded(); handleClose();
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} className="text-[#DB620A]" /> Upload Creative
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#0F172A]">Label *</label>
            <Input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Main Invite Card" required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#0F172A]">
              File * <span className="font-normal text-[#94A3B8]">(JPG, PNG, WEBP, GIF, PDF — max 10 MB)</span>
            </label>
            <div
              className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-5 text-center cursor-pointer hover:border-[#DB620A] hover:bg-[#FEF0E7]/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-[#0F172A]">
                  <FileIcon mimeType={file.type} className="w-5 h-5 text-[#DB620A]" />
                  <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                  <span className="text-[#94A3B8] shrink-0">{formatBytes(file.size)}</span>
                </div>
              ) : (
                <div className="text-[#94A3B8]">
                  <Upload size={24} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to select file</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setIsPersonalizable(false); } }} />
          </div>

          {/* Personalisation toggle */}
          {file && (
            <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
              <button type="button" onClick={() => setIsPersonalizable(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${isPersonalizable ? 'bg-[#DB620A]' : 'bg-[#E2E8F0]'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${isPersonalizable ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#0F172A]">Enable Personalisation</p>
                  <p className="text-xs text-[#94A3B8]">
                    {file.type.startsWith('image/')
                      ? 'Set name, QR code, RSVP area & optional map link zone'
                      : 'Set where the customer name should appear'}
                  </p>
                </div>
              </button>

              {isPersonalizable && (
                <div className="border-t border-[#F1F5F9] p-4">
                  <PositionPicker
                    file={file}
                    namePosition={namePosition}
                    onNameChange={setNamePosition}
                    qrPosition={qrPosition}
                    onQrChange={setQrPosition}
                    rsvpArea={rsvpArea}
                    onRsvpChange={setRsvpArea}
                    mapLinkArea={mapLinkArea}
                    onMapLinkAreaChange={setMapLinkArea}
                    mapUrl={mapUrl}
                    onMapUrlChange={setMapUrl}
                  />
                </div>
              )}
            </div>
          )}

          {error && <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-sm text-[#DC2626]">{error}</div>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">
              <Upload size={15} /> Upload
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreativeCard({ creative, canDelete, onDelete }: {
  creative: Creative; canDelete: boolean; onDelete: () => void;
}) {
  const [deleting, setDeleting]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lightbox, setLightbox]     = useState(false);
  const [imgError, setImgError]     = useState(false);
  const isImage = creative.mimeType.startsWith('image/');
  const isPdf   = creative.mimeType === 'application/pdf';
  const fileUrl = `/api/creatives/${creative.id}/file`;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res  = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = creative.fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  }

  function handleOpen() { window.open(fileUrl, '_blank', 'noopener,noreferrer'); }

  async function handleDelete() {
    if (!confirm(`Delete "${creative.label}"?`)) return;
    setDeleting(true);
    try { await fetch(`/api/creatives/${creative.id}`, { method: 'DELETE' }); onDelete(); }
    finally { setDeleting(false); }
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow group">
        <div
          className={`relative bg-[#F8FAFC] border-b border-[#F1F5F9] flex items-center justify-center ${(isImage && !imgError) || isPdf ? 'cursor-pointer' : ''}`}
          style={{ height: 160 }}
          onClick={() => {
            if (isImage && !imgError) setLightbox(true);
            else if (isPdf) handleOpen();
          }}
        >
          {isImage && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={creative.label}
              className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#94A3B8]">
              <FileIcon mimeType={creative.mimeType} className="w-12 h-12 text-[#CBD5E1]" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {isPdf ? 'PDF' : imgError ? 'Preview unavailable' : 'File'}
              </span>
              {isPdf && <span className="text-[10px] text-[#94A3B8]">Click to open</span>}
            </div>
          )}
          {(isImage && !imgError || isPdf) && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded transition-opacity">
                {isPdf ? 'Click to open' : 'Click to preview'}
              </span>
            </div>
          )}
        </div>

        <CardContent className="p-3 space-y-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm text-[#0F172A] truncate flex-1">{creative.label}</p>
              {creative.isPersonalizable && (
                <span className="text-[10px] bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded font-semibold shrink-0">
                  Personalizable
                </span>
              )}
              {creative.qrPosition && (
                <span className="text-[10px] bg-[#FEF0E7] text-[#DB620A] px-1.5 py-0.5 rounded font-semibold shrink-0">
                  QR + RSVP
                </span>
              )}
              {creative.mapUrl && (
                <span className="text-[10px] bg-[#F0FDF4] text-[#16A34A] px-1.5 py-0.5 rounded font-semibold shrink-0">
                  📍 Map
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] truncate mt-0.5">{creative.fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Avatar size="sm" className="w-5 h-5">
              <AvatarFallback className="text-[8px]">{getInitials(creative.uploadedByName)}</AvatarFallback>
            </Avatar>
            <p className="text-[11px] text-[#475569] truncate flex-1">{creative.uploadedByName}</p>
            <span className="text-[11px] text-[#94A3B8] shrink-0">{formatBytes(creative.sizeBytes)}</span>
          </div>
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" variant="outline" className="flex-1 text-xs h-7" loading={downloading} onClick={handleDownload}>
              <Download size={12} /> Download
            </Button>
            {canDelete && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEF2F2]"
                loading={deleting} onClick={handleDelete}>
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {lightbox && (
        <Dialog open onOpenChange={() => setLightbox(false)}>
          <DialogContent className="max-w-3xl p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl} alt={creative.label} className="w-full rounded object-contain max-h-[80vh]" />
            <p className="text-center text-sm text-[#475569] mt-1">{creative.label}</p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

interface Props { user: User; }

export function CreativesClient({ user }: Props) {
  const [events, setEvents]           = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [creatives, setCreatives]     = useState<Creative[]>([]);
  const [loadingEvents, setLoadingEvents]   = useState(true);
  const [loadingCreatives, setLoadingCreatives] = useState(false);
  const [uploadOpen, setUploadOpen]   = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res  = await fetch('/api/events', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list: Event[] = data.events || [];
        setEvents(list);
        if (list.length > 0 && !selectedEvent) setSelectedEvent(list[0]);
      }
    } finally { setLoadingEvents(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCreatives = useCallback(async (eventId: string) => {
    setLoadingCreatives(true);
    try {
      const res = await fetch(`/api/creatives?eventId=${eventId}`, { cache: 'no-store' });
      if (res.ok) setCreatives((await res.json()).creatives || []);
    } finally { setLoadingCreatives(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => {
    if (selectedEvent) fetchCreatives(selectedEvent.id);
    else setCreatives([]);
  }, [selectedEvent, fetchCreatives]);

  const canUpload = selectedEvent
    ? (user.role === 'ADMIN' || selectedEvent.creatorId === user.id)
    : false;

  if (loadingEvents) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-[#DB620A]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">Invite Creatives</h1>
          <p className="text-sm text-[#475569] mt-0.5">View and download invite cards for your events.</p>
        </div>
        {canUpload && (
          <Button onClick={() => setUploadOpen(true)}><Plus size={15} /> Upload Creative</Button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-24">
          <Palette size={48} className="text-[#E2E8F0] mx-auto mb-4" />
          <p className="text-[#475569] font-semibold">No events found</p>
          <p className="text-sm text-[#94A3B8] mt-1">Join or create an event to see its creatives here.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {events.map(ev => (
              <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                  selectedEvent?.id === ev.id
                    ? 'bg-[#DB620A] text-white border-[#DB620A]'
                    : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#DB620A] hover:text-[#DB620A]'
                }`}>
                {ev.name}
              </button>
            ))}
          </div>

          {selectedEvent && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-[#475569]">
                  {selectedEvent.name}
                  {!canUpload && (
                    <span className="ml-2 text-xs font-normal text-[#94A3B8]">View &amp; download only</span>
                  )}
                </p>
                {canUpload && (
                  <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                    <Upload size={14} /> Upload
                  </Button>
                )}
              </div>

              {loadingCreatives ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={28} className="animate-spin text-[#DB620A]" />
                </div>
              ) : creatives.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-[#E2E8F0] rounded-xl">
                  <Palette size={40} className="text-[#E2E8F0] mx-auto mb-3" />
                  <p className="text-[#475569] font-semibold">No creatives yet</p>
                  {canUpload ? (
                    <>
                      <p className="text-sm text-[#94A3B8] mt-1 mb-4">Upload the first invite creative for this event.</p>
                      <Button size="sm" onClick={() => setUploadOpen(true)}><Upload size={14} /> Upload Creative</Button>
                    </>
                  ) : (
                    <p className="text-sm text-[#94A3B8] mt-1">The event creator hasn&apos;t uploaded any creatives yet.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {creatives.map(c => (
                    <CreativeCard key={c.id} creative={c} canDelete={canUpload}
                      onDelete={() => fetchCreatives(selectedEvent.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedEvent && (
        <UploadDialog eventId={selectedEvent.id} open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => fetchCreatives(selectedEvent.id)} />
      )}
    </div>
  );
}
