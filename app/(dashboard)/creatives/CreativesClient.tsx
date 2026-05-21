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
import type { User, Event, Creative, NamePosition } from '@/types';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType === 'application/pdf') return <FileText className={className} />;
  return <ImageIcon className={className} />;
}

const DEFAULT_NAME_POSITION: NamePosition = {
  xPct: 50, yPct: 23, fontSizePct: 4, color: '#ffffff', align: 'center',
};

function PositionPicker({ file, position, onChange }: {
  file: File;
  position: NamePosition;
  onChange: (p: NamePosition) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [sampleName, setSampleName] = useState('Rahul Kumar');
  const [blobUrl, setBlobUrl] = useState('');
  const isImage = file.type.startsWith('image/');

  // Create blob URL for image files
  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  // Re-render canvas whenever position, font, or sample name changes
  useEffect(() => {
    if (!isImage || !blobUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function render(img: HTMLImageElement) {
      if (!canvas) return;
      const parent = canvas.parentElement;
      const displayW = parent ? parent.clientWidth : 460;
      const scale = displayW / img.naturalWidth;
      canvas.width = displayW;
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const fontSize = Math.max(6, (position.fontSizePct / 100) * canvas.height);
      ctx.font = `bold ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.fillStyle = position.color;
      ctx.textAlign = position.align as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      ctx.fillText(sampleName || 'Customer Name', (position.xPct / 100) * canvas.width, (position.yPct / 100) * canvas.height);
    }

    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      render(imgRef.current);
    } else {
      const img = new Image();
      img.onload = () => { imgRef.current = img; render(img); };
      img.src = blobUrl;
    }
  }, [isImage, blobUrl, position, sampleName]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({ ...position, xPct, yPct });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[#475569]">Sample name for preview</label>
        <Input value={sampleName} onChange={e => setSampleName(e.target.value)} placeholder="e.g. Rahul Kumar" className="h-8 text-sm" />
      </div>

      {isImage ? (
        <div>
          <p className="text-xs text-[#94A3B8] mb-1.5">Click on the preview to place the name — what you see is what you get</p>
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg border border-[#E2E8F0] cursor-crosshair"
            onClick={handleCanvasClick}
          />
        </div>
      ) : (
        <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-center">
          <FileText size={28} className="text-[#CBD5E1] mx-auto mb-2" />
          <p className="text-sm text-[#475569] font-medium">PDF — set name position using coordinates below</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">X: 50 = centered &nbsp;·&nbsp; Y: 0 = top, 100 = bottom</p>
          <p className="text-xs text-[#94A3B8]">Tip: Upload once, test the result, adjust and re-upload if needed.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#475569]">X Position (%)</label>
          <Input
            type="number" min="0" max="100"
            value={Math.round(position.xPct)}
            onChange={e => onChange({ ...position, xPct: Number(e.target.value) })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#475569]">Y Position (%)</label>
          <Input
            type="number" min="0" max="100"
            value={Math.round(position.yPct)}
            onChange={e => onChange({ ...position, yPct: Number(e.target.value) })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#475569]">Font Size (% of height)</label>
          <div className="flex items-center gap-2">
            <input
              type="range" min="1" max="12" step="0.5"
              value={position.fontSizePct}
              onChange={e => onChange({ ...position, fontSizePct: Number(e.target.value) })}
              className="flex-1 accent-[#DB620A]"
            />
            <span className="text-xs text-[#475569] w-8 text-right">{position.fontSizePct}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#475569]">Text Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color" value={position.color}
              onChange={e => onChange({ ...position, color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-[#E2E8F0]"
            />
            <span className="text-xs text-[#475569]">{position.color}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-[#475569]">Text Alignment</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(a => {
            const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
            return (
              <button
                key={a}
                type="button"
                onClick={() => onChange({ ...position, align: a })}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold transition-colors ${
                  position.align === a ? 'bg-[#DB620A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                <Icon size={13} />{a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UploadDialog({ eventId, open, onClose, onUploaded }: {
  eventId: string; open: boolean; onClose: () => void; onUploaded: () => void;
}) {
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPersonalizable, setIsPersonalizable] = useState(false);
  const [namePosition, setNamePosition] = useState<NamePosition>(DEFAULT_NAME_POSITION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    onClose();
    setLabel(''); setFile(null); setError('');
    setIsPersonalizable(false);
    setNamePosition(DEFAULT_NAME_POSITION);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    if (!label.trim()) { setError('Please enter a label.'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('eventId', eventId);
      fd.append('label', label.trim());
      fd.append('file', file);
      fd.append('isPersonalizable', isPersonalizable ? 'true' : 'false');
      if (isPersonalizable) fd.append('namePosition', JSON.stringify(namePosition));
      const res = await fetch('/api/creatives', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed.'); return; }
      onUploaded();
      handleClose();
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
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Main Invite Card" required />
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
            <input
              ref={fileRef} type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setIsPersonalizable(false); } }}
            />
          </div>

          {/* Personalisation toggle */}
          {file && (
            <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPersonalizable(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
              >
                <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${isPersonalizable ? 'bg-[#DB620A]' : 'bg-[#E2E8F0]'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${isPersonalizable ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#0F172A]">Enable Personalisation</p>
                  <p className="text-xs text-[#94A3B8]">Allow adding customer names to this creative</p>
                </div>
              </button>

              {isPersonalizable && (
                <div className="border-t border-[#F1F5F9] p-4">
                  <PositionPicker
                    file={file}
                    position={namePosition}
                    onChange={setNamePosition}
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

function CreativeCard({
  creative, canDelete, onDelete,
}: {
  creative: Creative;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isImage = creative.mimeType.startsWith('image/');
  const isPdf = creative.mimeType === 'application/pdf';
  const fileUrl = `/api/creatives/${creative.id}/file`;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = creative.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  }

  function handleOpen() {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleDelete() {
    if (!confirm(`Delete "${creative.label}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/creatives/${creative.id}`, { method: 'DELETE' });
      onDelete();
    } finally {
      setDeleting(false);
    }
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
            <img
              src={fileUrl}
              alt={creative.label}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#94A3B8]">
              <FileIcon mimeType={creative.mimeType} className="w-12 h-12 text-[#CBD5E1]" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {isPdf ? 'PDF' : imgError ? 'Preview unavailable' : 'File'}
              </span>
              {isPdf && <span className="text-[10px] text-[#94A3B8]">Click to open</span>}
            </div>
          )}
          {isImage && !imgError && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded transition-opacity">
                Click to preview
              </span>
            </div>
          )}
          {isPdf && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded transition-opacity">
                Click to open
              </span>
            </div>
          )}
        </div>

        <CardContent className="p-3 space-y-2">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm text-[#0F172A] truncate flex-1">{creative.label}</p>
              {creative.isPersonalizable && (
                <span className="text-[10px] bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded font-semibold shrink-0">Personalizable</span>
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
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCreatives, setLoadingCreatives] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/events', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list: Event[] = data.events || [];
        setEvents(list);
        if (list.length > 0 && !selectedEvent) setSelectedEvent(list[0]);
      }
    } finally {
      setLoadingEvents(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCreatives = useCallback(async (eventId: string) => {
    setLoadingCreatives(true);
    try {
      const res = await fetch(`/api/creatives?eventId=${eventId}`, { cache: 'no-store' });
      if (res.ok) setCreatives((await res.json()).creatives || []);
    } finally {
      setLoadingCreatives(false);
    }
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
          <Button onClick={() => setUploadOpen(true)}>
            <Plus size={15} /> Upload Creative
          </Button>
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
              <button
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                  selectedEvent?.id === ev.id
                    ? 'bg-[#DB620A] text-white border-[#DB620A]'
                    : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#DB620A] hover:text-[#DB620A]'
                }`}
              >
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
                    <p className="text-sm text-[#94A3B8] mt-1">The event creator hasn't uploaded any creatives yet.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {creatives.map(c => (
                    <CreativeCard
                      key={c.id}
                      creative={c}
                      canDelete={canUpload}
                      onDelete={() => fetchCreatives(selectedEvent.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedEvent && (
        <UploadDialog
          eventId={selectedEvent.id}
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => fetchCreatives(selectedEvent.id)}
        />
      )}
    </div>
  );
}
