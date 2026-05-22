import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserByEmployeeId } from '@/lib/auth';
import {
  getEventById,
  addAttendanceDelegate,
  removeAttendanceDelegate,
  subscribe,
} from '@/lib/store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (user.role !== 'ADMIN' && event.creatorId !== user.id) {
    return NextResponse.json({ error: 'Only the event creator or admin can manage attendance access.' }, { status: 403 });
  }

  const { employeeId } = await req.json();
  if (!employeeId) return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });

  const target = getUserByEmployeeId(String(employeeId));
  if (!target) return NextResponse.json({ error: 'No user found with that Employee ID.' }, { status: 404 });

  if (target.id === event.creatorId) {
    return NextResponse.json({ error: 'The event creator already has attendance access.' }, { status: 400 });
  }

  await addAttendanceDelegate(eventId, target.id);
  // Auto-subscribe so the event appears in their list
  await subscribe(target.id, eventId);

  return NextResponse.json({ delegate: { id: target.id, name: target.name, employeeId: target.employeeId } });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (user.role !== 'ADMIN' && event.creatorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  await removeAttendanceDelegate(eventId, userId);
  return NextResponse.json({ ok: true });
}
