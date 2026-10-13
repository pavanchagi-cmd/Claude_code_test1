'use client';

import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import Link from 'next/link';
import Script from 'next/script';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Consent = { analytics: boolean; marketing: boolean } | null;
const KEY = 'cookie-consent:v1';
const ConsentCtx = createContext<Consent>(null);
export const useConsent = () => useContext(ConsentCtx);

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function save(c: NonNullable<Consent>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
  // Record consent server-side for DPDP compliance (anonymous visitor id).
  void fetch('/api/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).catch(() => {});
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<Consent>(null);
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read persisted consent once on mount
      if (raw) setConsent(JSON.parse(raw));
      else setDecided(false);
    } catch {
      setDecided(false);
    }
  }, []);

  const choose = (c: NonNullable<Consent>) => {
    setConsent(c);
    setDecided(true);
    save(c);
  };

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <ConsentCtx.Provider value={consent}>
      {children}
      {consent?.analytics && <VercelAnalytics />}
      {consent?.analytics && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />
          <Script id="ga-init" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent?.marketing && pixelId && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      )}
      {!decided && (
        <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-surface p-5 shadow-2xl">
          <div className="container-site flex flex-col gap-4 px-0 md:flex-row md:items-center md:justify-between">
            <p className="max-w-[720px] text-[14.5px] text-body-2">
              We use essential cookies to run the store. With your permission we also use analytics and marketing cookies to improve the site and measure ads. See our{' '}
              <Link href="/policies/privacy" className="link">
                privacy policy
              </Link>
              .
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" className="btn btn-outline" onClick={() => choose({ analytics: false, marketing: false })}>
                Essential only
              </button>
              <button type="button" className="btn btn-outline" onClick={() => choose({ analytics: true, marketing: false })}>
                Allow analytics
              </button>
              <button type="button" className="btn btn-primary" onClick={() => choose({ analytics: true, marketing: true })}>
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}
    </ConsentCtx.Provider>
  );
}

/** Fire GA4 + Meta purchase events (consent permitting). */
export function trackPurchase(p: { orderNumber: string; valueRupees: number; items: { id: string; name: string; price: number; quantity: number }[] }) {
  window.gtag?.('event', 'purchase', {
    transaction_id: p.orderNumber,
    value: p.valueRupees,
    currency: 'INR',
    items: p.items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
  });
  window.fbq?.('track', 'Purchase', { value: p.valueRupees, currency: 'INR', content_ids: p.items.map((i) => i.id), content_type: 'product' });
}
