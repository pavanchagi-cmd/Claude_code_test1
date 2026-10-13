import { Lock } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/layout/header';
import { getSettings } from '@/lib/settings';

/** Minimal checkout chrome: logo + "Secure checkout", no footer distractions. */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="container-narrow flex h-[76px] items-center justify-between">
          <Link href="/" aria-label={`${s.brandName} home`}>
            <Logo name={s.brandName} className="text-[26px]" />
          </Link>
          <p className="flex items-center gap-2 text-[15px] font-medium">
            <Lock size={18} strokeWidth={1.6} className="text-success" aria-hidden="true" /> Secure checkout
          </p>
        </div>
      </header>
      <main id="main">{children}</main>
    </>
  );
}
