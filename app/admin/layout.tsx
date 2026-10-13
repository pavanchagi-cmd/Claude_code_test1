import type { Metadata } from 'next';
import Link from 'next/link';
import { signOutAction } from '@/app/(store)/login/actions';
import { requireStaff } from '@/lib/admin';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false, follow: false } };

const NAV: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/returns', label: 'Returns' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/catalog', label: 'Brands & categories' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/reviews', label: 'Reviews & Q&A' },
  { href: '/admin/posts', label: 'Journal' },
  { href: '/admin/faqs', label: 'FAQ' },
  { href: '/admin/policies', label: 'Policies' },
  { href: '/admin/content', label: 'Page content' },
  { href: '/admin/tickets', label: 'Support tickets' },
  { href: '/admin/settings', label: 'Site settings', adminOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="min-h-screen bg-ground md:grid md:grid-cols-[230px_1fr]">
      <aside className="min-w-0 bg-ink text-on-dark md:min-h-screen">
        <div className="flex items-center justify-between px-5 py-5 md:block">
          <Link href="/admin" className="font-display text-[22px] tracking-[0.14em]">
            Admin
          </Link>
          <p className="text-[13px] text-on-dark-muted md:mt-1">
            {user.name ?? user.phone} · {user.role.toLowerCase()}
          </p>
        </div>
        <nav aria-label="Admin">
          <ul className="flex overflow-x-auto md:block">
            {NAV.filter((n) => !n.adminOnly || user.role === 'ADMIN').map((n) => (
              <li key={n.href} className="shrink-0">
                <Link href={n.href} className="block px-5 py-2.5 text-[15px] hover:bg-ink-2 hover:text-brass-light">
                  {n.label}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <Link href="/" className="block px-5 py-2.5 text-[15px] text-on-dark-muted hover:text-brass-light">
                View store
              </Link>
            </li>
            <li className="shrink-0">
              <form action={signOutAction}>
                <button type="submit" className="block w-full px-5 py-2.5 text-left text-[15px] text-on-dark-muted hover:text-brass-light">
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </nav>
      </aside>
      <main id="main" className="min-w-0 p-5 md:p-8">
        {children}
      </main>
    </div>
  );
}
