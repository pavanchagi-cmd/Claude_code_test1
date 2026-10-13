import { ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrivalsTabs } from '@/components/home/arrivals-tabs';
import { NewsletterForm } from '@/components/home/newsletter';
import { WatchArt } from '@/components/product/watch-art';
import { Stars } from '@/components/ui/stars';
import { homeTabs } from '@/lib/catalog';
import { getContent } from '@/lib/content';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';

export const revalidate = 60;

const BUDGETS = [
  { label: 'Under ₹10,000', price: '0-10000' },
  { label: '₹10,000 – ₹25,000', price: '10000-25000' },
  { label: '₹25,000 – ₹50,000', price: '25000-50000' },
  { label: '₹50,000 and above', price: '50000-' },
];

function isLightTile(hex: string | null) {
  if (!hex) return true;
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160;
}

export default async function HomePage() {
  const [settings, tabs, categories, reviews, instagram, posts, story, newsletter] = await Promise.all([
    getSettings(),
    homeTabs(),
    db.category.findMany({ where: { featured: true }, orderBy: { sortOrder: 'asc' }, take: 5 }),
    db.review.findMany({ where: { featured: true, status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 3 }),
    db.instagramImage.findMany({ orderBy: { sortOrder: 'asc' }, take: 6 }),
    db.post.findMany({ where: { publishedAt: { lte: new Date() } }, orderBy: { publishedAt: 'desc' }, take: 3 }),
    getContent('home.story'),
    getContent('newsletter'),
  ]);
  const hero = settings.hero;

  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-on-dark">
        <div className="container-site grid items-center gap-10 py-14 md:py-[80px] lg:grid-cols-2">
          <div>
            <p className="eyebrow text-brass-light">{hero.eyebrow}</p>
            <h1 className="h1-hero mt-5">{hero.headline}</h1>
            <p className="mt-6 max-w-[470px] text-[18px] leading-[1.6] text-on-dark-muted">{hero.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={hero.primaryCta.href} className="btn btn-accent btn-lg">
                {hero.primaryCta.label}
              </Link>
              <Link href={hero.secondaryCta.href} className="btn btn-ghost-dark btn-lg">
                {hero.secondaryCta.label}
              </Link>
            </div>
          </div>
          <div className="relative flex aspect-[592/460] items-center justify-center bg-ink-2">
            {hero.videoUrl ? (
              <video src={hero.videoUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" aria-label="Featured watch video" />
            ) : hero.imageUrl ? (
              <Image src={hero.imageUrl} alt="Featured watch" fill priority sizes="(min-width:1024px) 592px, 100vw" className="object-cover" />
            ) : (
              <WatchArt strap="#2C2F33" caseColor="#C9A86A" dial="#0F2A3A" variant="hero" className="h-[85%]" title="Featured watch" />
            )}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-line bg-surface" aria-label="Why shop with us">
        <ul className="container-site grid grid-cols-2 gap-x-6 gap-y-5 py-7 md:grid-cols-3 lg:grid-cols-5">
          {settings.trustItems.map((t) => (
            <li key={t.title} className="flex items-center gap-3">
              <ShieldCheck size={28} strokeWidth={1.6} className="shrink-0 text-brass" aria-hidden="true" />
              <span>
                <span className="block text-[15px] font-semibold">{t.title}</span>
                <span className="block text-[13.5px] text-muted">{t.subtitle}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by style */}
      <section className="container-site pt-[88px]" aria-labelledby="style-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="style-heading" className="h2-section">
            Shop by style
          </h2>
          <Link href="/watches" className="link text-[16px] font-semibold">
            View all watches
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            const light = isLightTile(c.tileColor);
            return (
              <Link
                key={c.id}
                href={`/watches/${c.slug}`}
                className={`flex aspect-[234/268] flex-col justify-between p-6 transition-opacity hover:opacity-90 ${light ? 'text-ink' : 'text-on-dark'}`}
                style={{ backgroundColor: c.tileColor ?? 'var(--color-sand)' }}
              >
                <span className={`text-[12.5px] tracking-[0.14em] uppercase ${light ? 'text-body-2' : 'text-on-dark-muted'}`}>Category</span>
                <span className="font-display text-[28px] leading-none">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <ArrivalsTabs data={tabs} />

      {/* Shop by budget */}
      <section className="container-site pt-[88px] pb-[72px]" aria-labelledby="budget-heading">
        <h2 id="budget-heading" className="h2-section">
          Shop by budget
        </h2>
        <ul className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BUDGETS.map((b) => (
            <li key={b.price}>
              <Link
                href={`/watches?price=${b.price}`}
                className="flex min-h-[84px] items-center border border-line-strong bg-surface px-6 text-[19px] font-medium hover:border-ink"
              >
                {b.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Brand story */}
      <section className="border-y border-line bg-surface">
        <div className="container-site grid items-center gap-10 py-[88px] lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-[588/420] bg-placeholder">
            {story.imageUrl ? (
              <Image src={story.imageUrl} alt="Our workshop" fill sizes="(min-width:1024px) 588px, 100vw" className="object-cover" />
            ) : (
              <div className="placeholder-box h-full">[Workshop / founder photo]</div>
            )}
          </div>
          <div>
            <p className="eyebrow">{story.eyebrow}</p>
            <h2 className="mt-4 font-display text-[clamp(32px,3.6vw,48px)] leading-[1.1]">{story.title}</h2>
            <p className="mt-6 text-[17px] leading-[1.65] text-body-2">{story.body}</p>
            <Link href="/about" className="link mt-6 inline-block text-[16px] font-semibold">
              {story.linkLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="container-site pt-[88px]" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="h2-section">
          What customers say
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="card p-7">
              <Stars rating={r.rating} />
              <blockquote className="mt-4 text-[17px]">{r.body}</blockquote>
              <figcaption className="mt-4 text-[14.5px] text-muted">
                {r.authorName}
                {r.city ? `, ${r.city}` : ''}
                {r.verifiedBuyer ? ' · Verified buyer' : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Instagram grid */}
      <section className="container-site pt-[88px]" aria-labelledby="wrist-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="wrist-heading" className="h2-section">
            On the wrist
          </h2>
          <a href={`https://instagram.com/${settings.instagramHandle.replace(/[[\]@]/g, '')}`} className="link text-[16px] font-semibold" target="_blank" rel="noopener noreferrer">
            @{settings.instagramHandle} on Instagram
          </a>
        </div>
        <ul className="mt-7 grid grid-cols-3 gap-3 md:grid-cols-6">
          {instagram.map((img) => (
            <li key={img.id} className="relative aspect-square bg-placeholder">
              {img.url ? (
                <Image src={img.url} alt={img.alt} fill sizes="(min-width:768px) 166px, 33vw" className="object-cover" />
              ) : (
                <div className="placeholder-box h-full text-[11px] md:text-[13px]">{img.alt}</div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Journal */}
      <section className="container-site pt-[88px] pb-[88px]" aria-labelledby="journal-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="journal-heading" className="h2-section">
            From the journal
          </h2>
          <Link href="/journal" className="link text-[16px] font-semibold">
            All articles
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/journal/${p.slug}`} className="group block">
              <div className="relative aspect-[395/296]" style={{ backgroundColor: p.coverColor ?? 'var(--color-placeholder)' }}>
                {p.coverImage && <Image src={p.coverImage} alt="" fill sizes="(min-width:768px) 395px, 100vw" className="object-cover" />}
              </div>
              <p className="eyebrow mt-4">{p.category}</p>
              <h3 className="mt-3 font-display text-[25px] leading-[1.2] group-hover:text-brass">{p.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-sand" aria-labelledby="newsletter-heading">
        <div className="container-site flex flex-col gap-8 py-16 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[480px]">
            <h2 id="newsletter-heading" className="h2-section">
              {newsletter.title}
            </h2>
            <p className="mt-3 text-[16px] text-body-2">{newsletter.body}</p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
