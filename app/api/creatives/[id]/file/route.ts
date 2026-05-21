import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCreativeById, getCreativeFile, hasAccess } from '@/lib/store';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const creative = await getCreativeById(id);
  if (!creative) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!await hasAccess(user.id, user.role, creative.eventId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const fileData = await getCreativeFile(id);
  if (!fileData) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  return new Response(fileData.buffer as any, {
    headers: {
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `inline; filename="${creative.fileName}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
