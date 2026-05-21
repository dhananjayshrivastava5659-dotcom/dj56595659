import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { EventDetailClient } from './EventDetailClient';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { id } = await params;
  return <EventDetailClient user={user} eventId={id} />;
}
