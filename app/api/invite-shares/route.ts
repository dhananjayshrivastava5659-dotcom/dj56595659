import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { hasAccess, addInviteShare } from '@/lib/store';
import type { InviteShare } from '@/types';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { eventId, customerId, customerName, creativeId, creativeLabel, type } = body as Record<string, string>;

  if (!eventId || !customerId || !customerName || !creativeId || !creativeLabel || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['PERSONALISED', 'NON_PERSONAL', 'HTML'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  if (!await hasAccess(user.id, user.role, eventId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const share: InviteShare = {
    id: `ish-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    customerId,
    customerName,
    sharedById: user.id,
    sharedByName: user.name,
    creativeId,
    creativeLabel,
    type: type as InviteShare['type'],
    createdAt: new Date().toISOString(),
  };

  await addInviteShare(share);
  return NextResponse.json({ ok: true }, { status: 201 });
}
