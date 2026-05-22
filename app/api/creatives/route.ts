import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCreativesByEvent, addCreative, hasAccess, canEdit, getEventById } from '@/lib/store';
import type { Creative } from '@/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 });

  if (!await hasAccess(user.id, user.role, eventId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ creatives: await getCreativesByEvent(eventId) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const eventId = formData.get('eventId') as string;
  const label   = (formData.get('label') as string)?.trim();
  const file    = formData.get('file') as File | null;

  if (!eventId || !label || !file) {
    return NextResponse.json({ error: 'eventId, label and file are required.' }, { status: 400 });
  }

  if (!await canEdit(user.id, user.role, eventId)) {
    return NextResponse.json({ error: 'Only the event creator or admin can upload creatives.' }, { status: 403 });
  }

  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/html'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WEBP, GIF, PDF, and HTML files are allowed.' }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size must be under 10 MB.' }, { status: 400 });
  }

  const isPersonalizable = formData.get('isPersonalizable') === 'true';
  let namePosition = undefined;
  const namePositionStr = formData.get('namePosition') as string | null;
  if (isPersonalizable && namePositionStr) {
    try { namePosition = JSON.parse(namePositionStr); } catch { /* ignore malformed */ }
  }
  let qrPosition = undefined;
  const qrPositionStr = formData.get('qrPosition') as string | null;
  if (isPersonalizable && qrPositionStr) {
    try { qrPosition = JSON.parse(qrPositionStr); } catch { /* ignore malformed */ }
  }
  let rsvpArea = undefined;
  const rsvpAreaStr = formData.get('rsvpArea') as string | null;
  if (isPersonalizable && rsvpAreaStr) {
    try { rsvpArea = JSON.parse(rsvpAreaStr); } catch { /* ignore malformed */ }
  }
  const mapUrl = isPersonalizable ? ((formData.get('mapUrl') as string | null)?.trim() || undefined) : undefined;
  let mapLinkArea = undefined;
  const mapLinkAreaStr = formData.get('mapLinkArea') as string | null;
  if (isPersonalizable && mapUrl && mapLinkAreaStr) {
    try { mapLinkArea = JSON.parse(mapLinkAreaStr); } catch { /* ignore malformed */ }
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const creative: Creative = {
    id: `cre-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    eventName: event.name,
    uploadedById: user.id,
    uploadedByName: user.name,
    label,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    isPersonalizable,
    namePosition: isPersonalizable ? namePosition : undefined,
    qrPosition:   isPersonalizable ? qrPosition   : undefined,
    rsvpArea:     isPersonalizable ? rsvpArea      : undefined,
    mapUrl:       isPersonalizable ? mapUrl        : undefined,
    mapLinkArea:  isPersonalizable ? mapLinkArea   : undefined,
    createdAt: new Date().toISOString(),
  };

  await addCreative(creative, buffer);
  return NextResponse.json({ creative }, { status: 201 });
}
