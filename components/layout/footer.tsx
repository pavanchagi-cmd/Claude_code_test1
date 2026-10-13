import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { Logo } from './header';

const columns = [
  {
    title: 'Shop',
    links: [
      ['Men’s watches', '/watches/men'],
      ['Women’s watches', '/watches/women'],
      ['New arrivals', '/watches?sort=newest'],
      ['Brands A–Z', '/brands'],
      ['Straps & accessories', '/watches/straps-accessories'],
      ['Gift cards', '/help#contact'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['Contact us', '/help#contact'],
      ['Track your order', '/track-order'],
      ['FAQ', '/help#faq'],
      ['Size guide', '/help#size-guide'],
      ['Shipping policy', '/policies/shipping'],
      ['Returns & refunds', '/policies/returns'],
      ['Warranty & service', '/policies/warranty'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About us', '/about'],
      ['Authenticity promise', '/about#authenticity'],
      ['Journal', '/journal'],
      ['Privacy policy', '/policies/privacy'],
      ['Terms & conditions', '/policies/terms'],
      ['Grievance officer', '/policies/grievance-officer'],
    ],
  },
];

const payments = ['UPI', 'Visa', 'Mastercard', 'RuPay', 'EMI', 'COD'];

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="bg-ink text-on-dark">
      <div className="container-site pt-[72px] pb-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo name={s.brandName} className="text-on-dark" />
            <p className="mt-6 text-[15px] text-on-dark-muted">{s.brandDescription}</p>
            <p className="mt-5 text-[15px] text-on-dark-muted">
              WhatsApp: {s.whatsappNumber}
              <br />
              {s.supportEmail}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="font-sans text-[13px] font-bold tracking-[0.14em] text-brass-light uppercase">{col.title}</h2>
              <ul className="mt-4 space-y-[9px]">
                {col.links.map(([label, href]) => (
                  <li key={href + label}>
                    <Link href={href} className="text-[15px] underline underline-offset-[3px] hover:text-brass-light">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-5 border-t border-white/15 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[14px] text-on-dark-muted">
            © {new Date().getFullYear()} {s.legalEntityName} · GSTIN {s.gstin} · {s.registeredAddress}
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
            {payments.map((p) => (
              <li key={p} className="border border-white/25 px-2.5 py-1 text-[13px] text-on-dark-muted">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
