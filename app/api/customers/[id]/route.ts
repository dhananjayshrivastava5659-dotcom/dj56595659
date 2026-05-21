import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCustomerById, updateCustomerStatus, getEventById, addNotification } from '@/lib/store';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const event = await getEventById(customer.eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const isCreator = event.creatorId === user.id;
  if (user.role !== 'ADMIN' && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { action, reviewNote } = body;
  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 });
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
