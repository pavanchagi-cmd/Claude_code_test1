import type { Metadata } from 'next';
import { AccountNav } from '@/components/account/account-nav';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser('/account');
  const user = await db.user.findUnique({ where: { id: session.id } });
  const since = user?.createdAt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return (
    <div className="container-site pt-12 pb-[88px]">
      <h1 className="h1-page">Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
      <p className="mt-3 text-[17px] text-muted">
        {user?.phone ? `+91 ${user.phone}` : user?.email} · Member since {since}
      </p>
      <div className="mt-6 grid gap-8 md:grid-cols-[221px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
