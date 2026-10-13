import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/account/login-form';
import { currentUser } from '@/lib/auth';
import { configured } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: true } };

const BENEFITS = [
  ['Track every order', 'Live status, invoices and returns in one place'],
  ['Save your wishlist', 'Get alerts on price drops and restocks'],
  ['Digital warranty cards', 'Register your watch and claim service easily'],
  ['Early access', 'First look at limited editions'],
];

type Props = { searchParams: Promise<{ next?: string; 'check-email'?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/account';
  if (await currentUser()) redirect(next);
  return (
    <div className="container-site py-12 md:py-[72px]">
      <div className="mx-auto grid max-w-[1032px] md:grid-cols-2">
        <div className="border border-line bg-surface p-8 md:p-10">
          {sp.error && <p className="mb-4 bg-sand p-3 text-[14.5px] text-warning">Sign-in did not complete. Please try again.</p>}
          <LoginForm next={next} googleEnabled={configured.google} checkEmail={Boolean(sp['check-email'])} />
        </div>
        <div className="flex flex-col justify-center bg-ink p-8 text-on-dark md:p-10">
          <h2 className="font-display text-[clamp(30px,3vw,38px)]">Why create an account?</h2>
          <ul className="mt-6 space-y-5">
            {BENEFITS.map(([title, body]) => (
              <li key={title} className="flex gap-4">
                <Check size={20} strokeWidth={1.8} className="mt-1 shrink-0 text-brass-light" aria-hidden="true" />
                <span>
                  <span className="block text-[17px] font-semibold">{title}</span>
                  <span className="block text-[15px] text-on-dark-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/checkout" className="mt-8 text-[15.5px] underline underline-offset-[3px] hover:text-brass-light">
            Just browsing? Check out as a guest
          </Link>
        </div>
      </div>
    </div>
  );
}
