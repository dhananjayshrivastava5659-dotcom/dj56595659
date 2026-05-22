import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCustomerById, updateCustomerStatus, updateCustomerRsvp, updateCustomerAttendance, getEventById, addNotification } from '@/lib/store';
import type { RsvpStatus, AttendanceStatus } from '@/types';

const VALID_RSVP: RsvpStatus[]               = ['NO_RESPONSE', 'ATTENDING', 'MAYBE', 'NOT_ATTENDING'];
const VALID_ATTENDANCE: AttendanceStatus[]   = ['NOT_MARKED', 'PRESENT', 'ABSENT'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const event = await getEventById(customer.eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const isCreator = event.creatorId === user.id;
  const isAdmin   = user.role === 'ADMIN';
  const isAdder   = customer.addedById === user.id;

  const body = await req.json();
  const { action, reviewNote, rsvpStatus, attendanceStatus } = body;

  // ── Attendance update ────────────────────────────────────────────────────────
  if (action === 'UPDATE_ATTENDANCE') {
    const isAttendanceDelegate = (event.attendanceDelegateIds ?? []).includes(user.id);
    if (!isAdmin && !isCreator && !isAttendanceDelegate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (customer.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Attendance can only be marked for approved customers.' }, { status: 400 });
    }
    if (!VALID_ATTENDANCE.includes(attendanceStatus)) {
      return NextResponse.json({ error: 'Invalid attendanceStatus.' }, { status: 400 });
    }
    const updated = await updateCustomerAttendance(id, attendanceStatus);
    return NextResponse.json({ customer: updated });
  }

  // ── Manual RSVP update ───────────────────────────────────────────────────────
  if (action === 'UPDATE_RSVP') {
    // Only admin, event creator, or the user who added this customer can manually update RSVP
    if (!isAdmin && !isCreator && !isAdder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (customer.status !== 'APPROVED') {
      return NextResponse.json({ error: 'RSVP can only be updated for approved customers.' }, { status: 400 });
    }
    if (!VALID_RSVP.includes(rsvpStatus)) {
      return NextResponse.json({ error: 'Invalid rsvpStatus.' }, { status: 400 });
    }
    const updated = await updateCustomerRsvp(id, rsvpStatus);
    return NextResponse.json({ customer: updated });
  }

  // ── Approve / Reject ─────────────────────────────────────────────────────────
  const isApprover = (event.approverIds ?? []).includes(user.id);
  if (!isAdmin && !isCreator && !isApprover) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'action must be APPROVE, REJECT, UPDATE_RSVP, or UPDATE_ATTENDANCE' }, { status: 400 });
  }

  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const updated = await updateCustomerStatus(id, status, reviewNote?.trim() || undefined);

  await addNotification({
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: customer.addedById,
    title: status === 'APPROVED' ? 'Customer Approved' : 'Customer Rejected',
    message: status === 'APPROVED'
      ? `${customer.fullName} has been approved for "${event.name}".`
      : `${customer.fullName} was not approved for "${event.name}".${reviewNote ? ` Note: ${reviewNote}` : ''}`,
    type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR',
    read: false,
    link: `/events/${event.id}`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ customer: updated });
}
