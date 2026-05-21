import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { CreativesClient } from './CreativesClient';

export const dynamic = 'force-dynamic';

export default async function CreativesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <CreativesClient user={user} />;
}
