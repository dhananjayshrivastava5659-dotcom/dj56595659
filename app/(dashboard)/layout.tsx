import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar user={user} />
      <div className="pl-[260px]">
        <TopNav user={user} />
        <main className="pt-16 min-h-screen">
          <div className="p-6 page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
