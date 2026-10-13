'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, Heart, Menu, ShoppingBag, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/components/store-provider';
import { SearchBox } from './search-box';

type NavItem = { label: string; href: string };
export type NavData = { collections: NavItem[]; brands: NavItem[] };

function Dropdown({ label, href, items, columns = 1 }: { label: string; href: string; items: NavItem[]; columns?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the menu on route change
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <li ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="flex min-h-11 items-center gap-1 text-[15.5px] font-medium hover:text-brass"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        {label}
        <ChevronDown size={14} strokeWidth={1.6} aria-hidden="true" className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 z-40 -translate-x-1/2 pt-2">
          <div className="border border-line bg-surface p-5 shadow-xl" style={{ minWidth: columns > 1 ? 420 : 220 }}>
            <ul className={columns > 1 ? 'grid grid-cols-2 gap-x-8' : ''}>
              {items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="block py-1.5 text-[15px] hover:text-brass">
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={href} className="link mt-3 block text-[14px] font-semibold">
              View all
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

export function DesktopNav({ nav }: { nav: NavData }) {
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-6">
        <li>
          <Link href="/watches/men" className="flex min-h-11 items-center text-[15.5px] font-medium hover:text-brass">
            Men
          </Link>
        </li>
        <li>
          <Link href="/watches/women" className="flex min-h-11 items-center text-[15.5px] font-medium hover:text-brass">
            Women
          </Link>
        </li>
        <Dropdown label="Collections" href="/watches" items={nav.collections} />
        <Dropdown label="Brands" href="/brands" items={nav.brands} columns={nav.brands.length > 6 ? 2 : 1} />
        <li>
          <Link href="/watches/straps-accessories" className="flex min-h-11 items-center text-[15.5px] font-medium hover:text-brass">
            Straps &amp; Accessories
          </Link>
        </li>
        <li>
          <Link href="/journal" className="flex min-h-11 items-center text-[15.5px] font-medium hover:text-brass">
            Journal
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function HeaderIcons() {
  const { user, cartCount, wishlist } = useStore();
  return (
    <div className="flex items-center">
      <Link
        href={user ? '/account/wishlist' : '/login?next=/account/wishlist'}
        className="relative hidden h-11 w-11 items-center justify-center sm:inline-flex"
        aria-label={`Wishlist${wishlist.size ? `, ${wishlist.size} items` : ''}`}
      >
        <Heart size={22} strokeWidth={1.6} aria-hidden="true" />
      </Link>
      <Link href={user ? '/account' : '/login'} className="inline-flex h-11 w-11 items-center justify-center" aria-label={user ? 'My account' : 'Sign in'}>
        <User size={22} strokeWidth={1.6} aria-hidden="true" />
      </Link>
      <Link href="/cart" className="relative inline-flex h-11 w-11 items-center justify-center" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
        <ShoppingBag size={22} strokeWidth={1.6} aria-hidden="true" />
        {cartCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brass px-1 text-[11px] font-bold text-surface"
            aria-hidden="true"
          >
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </Link>
    </div>
  );
}

export function MobileDrawer({ nav }: { nav: NavData }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the drawer on route change
  useEffect(() => setOpen(false), [pathname]);
  const link = 'block py-3 text-[17px] font-medium border-b border-line';
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="-ml-2.5 inline-flex h-11 w-11 items-center justify-center lg:hidden" aria-label="Open menu">
        <Menu size={24} strokeWidth={1.6} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[380px] flex-col overflow-y-auto bg-surface p-6 shadow-2xl focus:outline-none">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="font-display text-[22px]">Menu</Dialog.Title>
            <Dialog.Close className="-mr-2.5 inline-flex h-11 w-11 items-center justify-center" aria-label="Close menu">
              <X size={22} strokeWidth={1.6} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
          <SearchBox className="mb-4" onNavigate={() => setOpen(false)} />
          <nav aria-label="Mobile">
            <Link href="/watches/men" className={link}>
              Men
            </Link>
            <Link href="/watches/women" className={link}>
              Women
            </Link>
            <details className="border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[17px] font-medium">
                Collections <ChevronDown size={16} strokeWidth={1.6} aria-hidden="true" />
              </summary>
              <ul className="pb-3 pl-3">
                {nav.collections.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="block py-2 text-[16px]">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
            <details className="border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[17px] font-medium">
                Brands <ChevronDown size={16} strokeWidth={1.6} aria-hidden="true" />
              </summary>
              <ul className="pb-3 pl-3">
                {nav.brands.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="block py-2 text-[16px]">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
            <Link href="/watches/straps-accessories" className={link}>
              Straps &amp; Accessories
            </Link>
            <Link href="/journal" className={link}>
              Journal
            </Link>
            <Link href="/help" className={link}>
              Help centre
            </Link>
            <Link href="/track-order" className={link}>
              Track order
            </Link>
            <Link href="/account/wishlist" className={link}>
              Wishlist
            </Link>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
