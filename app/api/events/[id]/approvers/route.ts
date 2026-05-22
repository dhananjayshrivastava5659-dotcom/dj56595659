import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserByEmployeeId } from '@/lib/auth';
import { getEventById, addEventApprover, removeEventApprover, subscribe } from '@/lib/store';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Only creator or admin can manage approvers
  if (user.role !== 'ADMIN' && event.creatorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const employeeId = body.employeeId?.trim();
  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
  }

  const target = getUserByEmployeeId(employeeId);
  if (!target) {
    return NextResponse.json({ error: 'No user found with that Employee ID.' }, { status: 404 });
  }

  if (target.id === event.creatorId) {
    return NextResponse.json({ error: 'This user is already the event creator.' }, { status: 400 });
  }

  if (event.approverIds.includes(target.id)) {
    return NextResponse.json({ error: 'This user already has approval access.' }, { status: 400 });
  }

  await addEventApprover(eventId, target.id);
  // Auto-subscribe so the event appears in their events list
  await subscribe(target.id, eventId);

  return NextResponse.json(
    { approver: { id: target.id, name: target.name, employeeId } },
    { status: 201 },
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (user.role !== 'ADMIN' && event.creatorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId query param is required.' }, { status: 400 });

  await removeEventApprover(eventId, userId);
  return NextResponse.json({ ok: true });
}
