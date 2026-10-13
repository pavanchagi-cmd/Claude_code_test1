import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { Gallery } from '@/components/product/gallery';
import { ProductCard } from '@/components/product/product-card';
import { PurchasePanel } from '@/components/product/purchase-panel';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { AskQuestionButton, WriteReviewButton } from '@/components/product/review-forms';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { JsonLd } from '@/components/ui/json-ld';
import { Stars } from '@/components/ui/stars';
import { getProductBySlug, movementLabel, ratingBreakdown, similarProducts } from '@/lib/catalog';
import { db } from '@/lib/db';
import { siteUrl } from '@/lib/env';
import { waLink } from '@/lib/links';
import { getSettings, whatsappDigits } from '@/lib/settings';

export const revalidate = 3600; // plus on-demand revalidation when admin edits the product

/** No-cost EMI line uses the longest common no-cost tenure. Confirm with Razorpay plans. */
const EMI_MONTHS = 6;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const rows = await db.product.findMany({ where: { isActive: true }, select: { slug: true }, take: 200 });
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

async function load(slug: string) {
  const p = await getProductBySlug(slug);
  if (p && p.isActive) return p;
  const redirect = await db.slugRedirect.findUnique({ where: { fromSlug: slug }, include: { product: { select: { slug: true } } } });
  if (redirect) permanentRedirect(`/watch/${redirect.product.slug}`);
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return {};
  const title = p.seoTitle ?? `${p.name} by ${p.brand.name}`;
  const description = p.seoDescription ?? `${p.name}: ${movementLabel(p.movement)} ${p.caseSizeMm ? `${Number(p.caseSizeMm)} mm ` : ''}watch. Genuine, under warranty.`;
  return {
    title,
    description,
    alternates: { canonical: `/watch/${p.slug}` },
    openGraph: { title, description, type: 'website', url: `/watch/${p.slug}` },
  };
}

const ph = (v: unknown, unit = '', placeholder = '[X]') =>
  v === null || v === undefined || v === '' ? `${placeholder}${unit}` : `${typeof v === 'object' ? Number(v) : v}${unit}`;

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();

  const [settings, breakdown, similar] = await Promise.all([getSettings(), ratingBreakdown(p.id), similarProducts(p)]);
  const art = p.artDial ? { strap: p.artStrap ?? '#A9A59C', case: p.artCase ?? '#CFCBC2', dial: p.artDial } : null;
  const defaultVariant = p.variants[0];
  const variantImages = defaultVariant?.images.length ? defaultVariant.images : p.images;
  const images = variantImages.map((i) => ({ url: i.url, alt: i.alt, angle: i.angle }));
  const wa = whatsappDigits(settings);
  const url = `${siteUrl()}/watch/${p.slug}`;
  const isWatch = !p.isAccessory;
  const primaryCategory =
    p.gender === 'WOMEN'
      ? { label: 'Women’s watches', href: '/watches/women' }
      : p.isAccessory
        ? { label: 'Straps & accessories', href: '/watches/straps-accessories' }
        : { label: 'Men’s watches', href: '/watches/men' };

  const specs: [string, string][] = isWatch
    ? [
        ['Movement', `${movementLabel(p.movement) || '[Movement]'}, calibre ${p.calibre ?? '[CALIBRE]'}`],
        ['Power reserve', ph(p.powerReserveH, ' hours')],
        ['Case diameter', ph(p.caseSizeMm, ' mm')],
        ['Thickness', ph(p.caseThicknessMm, ' mm')],
        ['Lug to lug', ph(p.lugToLugMm, ' mm')],
        ['Lug width', ph(p.lugWidthMm, ' mm')],
        ['Case material', ph(p.caseMaterial, '', '[Case material]')],
        ['Crystal', ph(p.crystal, '', '[Sapphire / mineral]')],
        ['Water resistance', ph(p.waterResistanceM, ' m')],
        ['Dial', ph(p.dialDetail ?? p.dialColour, '', '[Dial]')],
        ['Strap / bracelet', defaultVariant?.label ?? ph(p.strapDetail, '', '[Strap]')],
        ['Weight', ph(p.weightG, ' g')],
      ]
    : [];

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: defaultVariant?.sku,
    mpn: p.reference ?? undefined,
    brand: { '@type': 'Brand', name: p.brand.name },
    description: p.description ?? undefined,
    image: p.images.filter((i) => i.url.startsWith('http')).map((i) => i.url),
    url,
    itemCondition: p.condition === 'NEW' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    offers: p.variants.map((v) => ({
      '@type': 'Offer',
      sku: v.sku,
      priceCurrency: 'INR',
      price: (v.pricePaise / 100).toFixed(2),
      availability: v.stock - v.reserved > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
      seller: { '@type': 'Organization', name: settings.brandName },
    })),
    aggregateRating: p.ratingCount > 0 ? { '@type': 'AggregateRating', ratingValue: Number(p.ratingAvg).toFixed(1), reviewCount: p.ratingCount } : undefined,
  };

  const assurance = [
    { title: '100% authentic', subtitle: 'Certificate included' },
    { title: `${settings.warrantyYears}-year warranty`, subtitle: 'Register online' },
    { title: 'Insured delivery', subtitle: 'Free across India' },
    { title: `${settings.returnWindowDays > 0 ? settings.returnWindowDays : '[X]'}-day returns`, subtitle: 'Easy pickup' },
  ];

  return (
    <>
      <JsonLd data={productLd} />
      <section className="container-site pt-8 pb-[72px]">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, primaryCategory, { label: p.name }]} />
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
          <Gallery images={images} art={art} name={p.name} />
          <div>
            <p className="eyebrow">{p.brand.name}</p>
            <h1 className="h1-page mt-2">{p.name}</h1>
            <p className="mt-2 text-[15px] text-muted">
              Ref. {p.reference ?? '[REFERENCE NO.]'}
              {p.ratingCount > 0 && (
                <>
                  {' '}
                  · <span aria-hidden="true">★</span> {Number(p.ratingAvg).toFixed(1)} ·{' '}
                  <a href="#reviews" className="link text-ink">
                    {p.ratingCount} review{p.ratingCount === 1 ? '' : 's'}
                  </a>
                </>
              )}
            </p>
            <PurchasePanel
              productId={p.id}
              productName={p.name}
              caseSizeMm={p.caseSizeMm ? Number(p.caseSizeMm) : null}
              isAccessory={p.isAccessory}
              variants={p.variants.map((v) => ({ id: v.id, label: v.label, pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, available: Math.max(0, v.stock - v.reserved) }))}
              emiMonths={EMI_MONTHS}
              whatsappHref={wa ? waLink(wa, `Hi ${settings.brandName}, I have a question about ${p.name}: ${url}`) : null}
              assurance={assurance}
              inTheBox={p.inTheBox}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container-site grid gap-12 py-[72px] lg:grid-cols-2">
          <div>
            <h2 className="h2-section">About this {isWatch ? 'watch' : 'item'}</h2>
            <div className="mt-5 space-y-4 text-[17px] leading-[1.65] text-body-2">
              {(p.description ?? '').split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {isWatch && (
              <>
                <h3 className="mt-9 text-[20px] font-semibold">Warranty &amp; authenticity</h3>
                <p className="mt-3 text-[16px] leading-[1.65] text-body-2">
                  {p.warrantyMonths ? `${Math.round(p.warrantyMonths / 12)}-year` : '[X]-year'} [brand / seller] warranty covering the movement. Each piece ships with an
                  authenticity certificate and serial number you can verify with us.
                </p>
              </>
            )}
          </div>
          {specs.length > 0 && (
            <div>
              <h2 className="h2-section">Specifications</h2>
              <table className="mt-5 w-full text-[16px]">
                <tbody>
                  {specs.map(([k, v]) => (
                    <tr key={k} className="border-b border-line">
                      <th scope="row" className="w-[45%] py-3 text-left font-medium text-body-2">
                        {k}
                      </th>
                      <td className="py-3">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section id="reviews" className="container-site grid gap-10 py-[72px] lg:grid-cols-[260px_1fr] lg:gap-12" aria-labelledby="reviews-heading">
        <div>
          <h2 id="reviews-heading" className="h2-section">
            Reviews
          </h2>
          {breakdown.total > 0 ? (
            <>
              <p className="mt-4">
                <span className="text-[48px] font-semibold">{Number(p.ratingAvg).toFixed(1)}</span>
                <span className="ml-1 text-[18px] text-muted">/ 5</span>
              </p>
              <p className="mt-1 text-[15px] text-muted">
                Based on {breakdown.total} verified review{breakdown.total === 1 ? '' : 's'}
              </p>
              <ul className="mt-4 space-y-2">
                {breakdown.counts.map((c) => (
                  <li key={c.rating} className="flex items-center gap-3 text-[14px]">
                    <span className="w-6">
                      {c.rating}
                      <span aria-hidden="true">★</span>
                      <span className="sr-only"> stars</span>
                    </span>
                    <span className="h-[7px] flex-1 bg-line" aria-hidden="true">
                      <span className="block h-full bg-brass" style={{ width: `${(c.count / breakdown.total) * 100}%` }} />
                    </span>
                    <span className="sr-only">{c.count} reviews</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-[15px] text-muted">No reviews yet. Be the first verified buyer to review this watch.</p>
          )}
          <WriteReviewButton productId={p.id} slug={p.slug} />
        </div>
        <div className="space-y-4">
          {p.reviews.map((r) => (
            <article key={r.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Stars rating={r.rating} size={16} />
                <p className="text-[14px] text-muted">
                  {r.authorName}
                  {r.verifiedBuyer ? ' · Verified buyer' : ''} · {r.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <h3 className="mt-3 text-[17px] font-semibold">{r.title}</h3>
              <p className="mt-2 text-[16px] text-body-2">{r.body}</p>
              {r.photos.length > 0 && (
                <div className="mt-4 flex gap-2">
                  {r.photos.map((src) => (
                    <div key={src} className="relative h-[72px] w-[72px] bg-placeholder">
                      <Image src={src} alt="Customer photo" fill sizes="72px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
          <div className="card p-6">
            <h3 className="text-[17px] font-semibold">Questions &amp; answers</h3>
            {p.questions.length === 0 && <p className="mt-2 text-[15px] text-muted">No questions yet.</p>}
            {p.questions.map((q) => (
              <div key={q.id} className="mt-3 text-[16px]">
                <p>
                  <strong>Q:</strong> {q.text}
                </p>
                <p className="mt-1 text-body-2">
                  <strong className="text-ink">A:</strong> {q.answer}
                </p>
              </div>
            ))}
            <AskQuestionButton productId={p.id} />
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="container-site pb-[88px]" aria-labelledby="similar-heading">
          <h2 id="similar-heading" className="h2-section">
            You may also like
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
            {similar.map((s) => (
              <ProductCard key={s.id} product={s} compact />
            ))}
          </div>
        </section>
      )}
      <RecentlyViewed currentSlug={p.slug} />
    </>
  );
}
