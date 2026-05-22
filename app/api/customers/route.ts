import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCustomersByEvent, addCustomer, hasAccess } from '@/lib/store';
import type { Customer } from '@/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 });

  if (!await hasAccess(user.id, user.role, eventId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ customers: await getCustomersByEvent(eventId) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { eventId, fullName, mobile, email, organisation, guestsAccompanied } = body;

  if (!eventId || !fullName?.trim() || !mobile?.trim()) {
    return NextResponse.json({ error: 'Full name and mobile number are required.' }, { status: 400 });
  }

  if (!/^\d{10}$/.test(mobile.trim())) {
    return NextResponse.json({ error: 'Mobile number must be exactly 10 digits.' }, { status: 400 });
  }

  if (!await hasAccess(user.id, user.role, eventId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const customer: Customer = {
    id: `cus-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    addedById: user.id,
    addedByName: user.name,
    fullName: fullName.trim(),
    mobile: mobile.trim(),
    email: email?.trim() || undefined,
    organisation: organisation?.trim() || undefined,
    guestsAccompanied: guestsAccompanied ? parseInt(guestsAccompanied) : undefined,
    status: 'PENDING',
    rsvpStatus: 'NO_RESPONSE',
    rsvpToken: '',          // DB auto-generates via gen_random_uuid()
    attendanceStatus: 'NOT_MARKED',
    createdAt: new Date().toISOString(),
  };

  await addCustomer(customer);
  return NextResponse.json({ customer }, { status: 201 });
}
