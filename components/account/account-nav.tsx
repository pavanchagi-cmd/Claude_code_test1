'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/(store)/login/actions';

const TABS = [
  { href: '/account', label: 'My orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/warranty', label: 'Warranty' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/profile', label: 'Profile' },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="min-w-0 self-start border border-line bg-surface">
      <ul className="flex overflow-x-auto md:block">
        {TABS.map((t) => {
          const active = pathname === t.href || (t.href === '/account' && pathname.startsWith('/account/orders'));
          return (
            <li key={t.href} className="shrink-0 border-line md:border-b">
              <Link href={t.href} aria-current={active ? 'page' : undefined} className={`block px-5 py-4 text-[16.5px] ${active ? 'bg-ink text-on-dark' : 'hover:bg-ground'}`}>
                {t.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0">
          <form action={signOutAction}>
            <button type="submit" className="block w-full px-5 py-4 text-left text-[16.5px] text-warning hover:bg-ground">
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
