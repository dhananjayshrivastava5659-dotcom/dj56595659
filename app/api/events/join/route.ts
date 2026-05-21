import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getEventByCode, subscribe, hasAccess } from '@/lib/store';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { eventCode } = await req.json();
  if (!eventCode?.trim()) {
    return NextResponse.json({ error: 'Event code is required.' }, { status: 400 });
  }

  const event = await getEventByCode(eventCode);
  if (!event) {
    return NextResponse.json({ error: 'No event found with this code. Please check and try again.' }, { status: 404 });
  }

  if (await hasAccess(user.id, user.role, event.id)) {
    return NextResponse.json({ event, alreadyJoined: true });
  }

  await subscribe(user.id, event.id);
  return NextResponse.json({ event, alreadyJoined: false }, { status: 200 });
}
