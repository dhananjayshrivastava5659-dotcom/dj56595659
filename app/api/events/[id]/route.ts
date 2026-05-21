import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getEventById, updateEvent, hasAccess, canEdit } from '@/lib/store';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (!await hasAccess(user.id, user.role, id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ event });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!await canEdit(user.id, user.role, id)) {
    return NextResponse.json({ error: 'Only the event creator or admin can edit this event.' }, { status: 403 });
  }

  const body = await req.json();
  const event = await updateEvent(id, body);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  return NextResponse.json({ event });
}
