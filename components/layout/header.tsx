import { Search } from 'lucide-react';
import Link from 'next/link';
import { getNavData } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';
import { DesktopNav, HeaderIcons, MobileDrawer, type NavData } from './header-client';
import { SearchBox } from './search-box';

export function Logo({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`font-display text-[30px] leading-none tracking-[0.18em] ${className}`}>{name}</span>;
}

export async function Header() {
  const [settings, navData] = await Promise.all([getSettings(), getNavData()]);
  const nav: NavData = {
    collections: navData.categories.map((c) => ({ label: c.name, href: `/watches/${c.slug}` })),
    brands: navData.brands.map((b) => ({ label: b.name, href: `/brands/${b.slug}` })),
  };
  return (
    <>
      <div className="bg-ink px-4 py-2 text-center text-[13.5px] text-on-dark">{settings.announcement}</div>
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="container-site flex h-[68px] items-center gap-1 sm:gap-4 lg:h-[80px] lg:gap-8">
          <MobileDrawer nav={nav} />
          <Link href="/" aria-label={`${settings.brandName} home`} className="shrink-0">
            <Logo name={settings.brandName} className="text-[21px] tracking-[0.14em] sm:text-[24px] lg:text-[30px] lg:tracking-[0.18em]" />
          </Link>
          <div className="flex flex-1 justify-center">
            <DesktopNav nav={nav} />
          </div>
          <SearchBox className="hidden w-[242px] xl:block" />
          <Link href="/search" className="inline-flex h-11 w-11 items-center justify-center xl:hidden" aria-label="Search">
            <Search size={21} strokeWidth={1.6} aria-hidden="true" />
          </Link>
          <HeaderIcons />
        </div>
      </header>
    </>
  );
}
