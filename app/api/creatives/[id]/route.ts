import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCreativeById, deleteCreative, getEventById } from '@/lib/store';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const creative = await getCreativeById(id);
  if (!creative) return NextResponse.json({ error: 'Creative not found' }, { status: 404 });

  const event = await getEventById(creative.eventId);
  const isCreator = event?.creatorId === user.id;
  if (user.role !== 'ADMIN' && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteCreative(id);
  return NextResponse.json({ ok: true });
}
