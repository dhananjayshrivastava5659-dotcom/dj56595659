import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EventsClient } from './EventsClient';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return <EventsClient user={user} />;
}
