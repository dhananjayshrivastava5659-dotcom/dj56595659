import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getEventById, getCustomersByEvent, getInviteSharesByEvent } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role !== 'ADMIN' && event.creatorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [customers, inviteShares] = await Promise.all([
    getCustomersByEvent(eventId),
    getInviteSharesByEvent(eventId),
  ]);

  return NextResponse.json({ customers, inviteShares });
}
