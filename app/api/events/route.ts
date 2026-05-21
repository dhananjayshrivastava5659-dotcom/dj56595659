import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateEventCode } from '@/lib/utils';
import { addEvent, getEventsForUser, subscribe } from '@/lib/store';
import type { Event } from '@/types';

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const events = await getEventsForUser(user.id, user.role);
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const newEvent: Event = {
    id: `evt-${Date.now()}`,
    eventCode: generateEventCode(),
    name: body.name,
    type: body.type,
    otherType: body.otherType,
    topic: body.topic,
    venueType: body.venueType,
    venue: body.venue,
    city: body.city,
    state: body.state,
    date: body.date,
    time: body.time,
    description: body.description,
    status: 'UPCOMING',
    creatorId: user.id,
    creatorName: user.name,
    tags: body.tags ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerCount: 0,
  };

  try {
    await addEvent(newEvent);
    await subscribe(user.id, newEvent.id);
  } catch (err: any) {
    console.error('[POST /api/events] DB error:', err);
    return NextResponse.json(
      { error: `Database error: ${err?.message ?? String(err)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ event: newEvent }, { status: 201 });
}
