import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getNotificationsForUser, markAllNotificationsRead } from '@/lib/store';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ notifications: await getNotificationsForUser(user.id) });
}

export async function PATCH() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
