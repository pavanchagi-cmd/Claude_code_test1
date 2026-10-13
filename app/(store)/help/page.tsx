import { Clock, CreditCard, PackageSearch, Ruler, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from '@/components/home/contact-form';
import { FaqSearch } from '@/components/home/faq-search';
import { TrackForm } from '@/components/home/track-form';
import { JsonLd } from '@/components/ui/json-ld';
import { db } from '@/lib/db';
import { waLink } from '@/lib/links';
import { getSettings, whatsappDigits } from '@/lib/settings';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Help centre: FAQ, order tracking, size guide and contact',
  description: 'Answers about delivery, returns, warranty, COD and EMI. Track your order, find your case size or contact us.',
  alternates: { canonical: '/help' },
};

const TOPICS = [
  { label: 'Track order', href: '#track', icon: PackageSearch },
  { label: 'Returns & refunds', href: '/policies/returns', icon: RotateCcw },
  { label: 'Warranty claim', href: '/policies/warranty', icon: ShieldCheck },
  { label: 'Size guide', href: '#size-guide', icon: Ruler },
  { label: 'Shipping', href: '/policies/shipping', icon: Truck },
  { label: 'Payments & EMI', href: '#faq', icon: CreditCard },
];

const SIZES = [
  ['Under 15 cm', '34 – 38 mm'],
  ['15 – 16.5 cm', '36 – 40 mm'],
  ['16.5 – 18 cm', '38 – 42 mm'],
  ['18 – 19.5 cm', '40 – 44 mm'],
  ['Over 19.5 cm', '42 – 46 mm'],
];

export default async function HelpPage() {
  const [faqs, s] = await Promise.all([db.faq.findMany({ orderBy: { sortOrder: 'asc' } }), getSettings()]);
  const wa = whatsappDigits(s);
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
        }}
      />
      <FaqSearch faqs={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))}>
        <div className="container-narrow pt-12">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {TOPICS.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <Link href={href} className="card flex h-full min-h-[146px] flex-col gap-4 p-5 hover:border-ink">
                  <Icon size={24} strokeWidth={1.6} className="text-brass" aria-hidden="true" />
                  <span className="text-[16px] font-semibold">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div id="track" className="container-narrow scroll-mt-24 pt-16">
          <TrackForm />
        </div>
      </FaqSearch>

      <section id="size-guide" className="container-narrow grid scroll-mt-24 gap-10 pt-[88px] lg:grid-cols-2" aria-labelledby="size-heading">
        <div>
          <h2 id="size-heading" className="h2-section">
            Size guide
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.65] text-body-2">
            Wrap a soft measuring tape (or a strip of paper) around your wrist just above the wrist bone. Use the table to find case sizes that will sit comfortably. Lug-to-lug
            length matters too: it should not overhang your wrist.
          </p>
          <div className="placeholder-box mt-5 aspect-[546/220]">[How-to-measure illustration]</div>
        </div>
        <table className="h-fit w-full border border-line bg-surface text-[16px]">
          <caption className="sr-only">Suggested case size by wrist size</caption>
          <thead className="bg-ink text-left text-on-dark">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                Wrist size
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Suggested case size
              </th>
            </tr>
          </thead>
          <tbody>
            {SIZES.map(([w, c]) => (
              <tr key={w} className="border-t border-line">
                <td className="px-5 py-3.5">{w}</td>
                <td className="px-5 py-3.5 font-semibold">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="contact" className="container-narrow grid scroll-mt-24 gap-10 pt-[88px] pb-[96px] lg:grid-cols-[407px_1fr]" aria-labelledby="contact-heading">
        <div>
          <h2 id="contact-heading" className="h2-section">
            Contact us
          </h2>
          <p className="mt-5 flex gap-2 text-[16.5px] text-body-2">
            <Clock size={18} strokeWidth={1.6} className="mt-1 shrink-0 text-brass" aria-hidden="true" /> {s.supportHours}
          </p>
          {wa ? (
            <a href={waLink(wa, `Hi ${s.brandName}, I need help with…`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-lg mt-5 w-full">
              Chat on WhatsApp
            </a>
          ) : (
            <span className="btn btn-whatsapp btn-lg mt-5 w-full opacity-80">Chat on WhatsApp</span>
          )}
          <dl className="mt-6 space-y-2 text-[16px]">
            <div>
              <dt className="inline font-semibold">Phone: </dt>
              <dd className="inline">{s.supportPhone}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Email: </dt>
              <dd className="inline">{s.supportEmail}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Address: </dt>
              <dd className="inline">{s.registeredAddress}</dd>
            </div>
          </dl>
        </div>
        <ContactForm />
      </section>
    </>
  );
}
