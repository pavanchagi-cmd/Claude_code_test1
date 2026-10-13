import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, Manrope } from 'next/font/google';
import { ConsentProvider } from '@/components/layout/consent';
import { StoreProvider } from '@/components/store-provider';
import { JsonLd } from '@/components/ui/json-ld';
import { siteUrl } from '@/lib/env';
import { getSettings } from '@/lib/settings';
import './globals.css';

// Variable font with the optical-size axis: high-contrast cuts at display sizes (400–600 used).
const bodoni = Bodoni_Moda({ subsets: ['latin'], axes: ['opsz'], display: 'swap', variable: '--font-bodoni' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-manrope' });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${s.brandName} · Genuine watches, delivered across India`, template: `%s · ${s.brandName}` },
    description: `Shop authentic automatic, quartz and smart watches at ${s.brandName}. Free insured shipping, easy returns, UPI, EMI and COD.`,
    openGraph: { type: 'website', siteName: s.brandName, locale: 'en_IN' },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: '/' },
  };
}

export const viewport: Viewport = { themeColor: '#15171A', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const url = siteUrl();
  return (
    <html lang="en-IN" className={`${bodoni.variable} ${manrope.variable}`}>
      <body>
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: s.brandName,
              legalName: s.legalEntityName,
              url,
              email: s.supportEmail,
              telephone: s.supportPhone,
              address: { '@type': 'PostalAddress', streetAddress: s.registeredAddress, addressCountry: 'IN' },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: s.brandName,
              url,
              potentialAction: { '@type': 'SearchAction', target: `${url}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
            },
          ]}
        />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-surface focus:p-3">
          Skip to content
        </a>
        <StoreProvider>
          <ConsentProvider>{children}</ConsentProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
