import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByRsvpToken, recordRsvp } from '@/lib/store';

const VALID = ['ATTENDING', 'MAYBE', 'NOT_ATTENDING'] as const;
type RsvpResponse = typeof VALID[number];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token    = searchParams.get('token');
  const response = searchParams.get('response')?.toUpperCase() as RsvpResponse | null;

  if (!token || !response || !VALID.includes(response)) {
    return NextResponse.redirect(new URL('/rsvp?status=invalid', req.url));
  }

  const customer = await getCustomerByRsvpToken(token);
  if (!customer) {
    return NextResponse.redirect(new URL('/rsvp?status=invalid', req.url));
  }

  await recordRsvp(token, response);
  return NextResponse.redirect(new URL(`/rsvp?status=${response}&name=${encodeURIComponent(customer.fullName)}`, req.url));
}
