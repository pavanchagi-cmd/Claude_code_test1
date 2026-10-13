import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { JournalGrid } from '@/components/home/journal-grid';
import { JOURNAL_CATEGORIES, featuredPost, listPosts } from '@/lib/journal';

export const revalidate = 300;

type Props = { searchParams: Promise<{ category?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category } = await searchParams;
  return {
    title: category ? `${category} · The Journal` : 'The Journal',
    description: 'Guides, care tips and buying advice to help you choose and enjoy the right watch.',
    alternates: { canonical: category ? `/journal?category=${encodeURIComponent(category)}` : '/journal' },
  };
}

export default async function JournalPage({ searchParams }: Props) {
  const { category: raw } = await searchParams;
  const category = raw && (JOURNAL_CATEGORIES as readonly string[]).includes(raw) ? raw : null;
  const featured = await featuredPost(category);
  const { posts, hasMore } = await listPosts(category, 1, featured?.id);
  return (
    <div className="container-site pt-12 pb-[88px]">
      <h1 className="h1-page">The Journal</h1>
      <p className="mt-6 max-w-[620px] text-[18px] text-body-2">Guides, care tips and buying advice to help you choose and enjoy the right watch.</p>
      <nav aria-label="Journal categories" className="mt-6 flex flex-wrap gap-2">
        <Link href="/journal" className="chip" data-active={!category} aria-current={!category ? 'page' : undefined}>
          All
        </Link>
        {JOURNAL_CATEGORIES.map((c) => (
          <Link key={c} href={`/journal?category=${encodeURIComponent(c)}`} className="chip" data-active={category === c} aria-current={category === c ? 'page' : undefined}>
            {c}
          </Link>
        ))}
      </nav>

      {featured && (
        <Link href={`/journal/${featured.slug}`} className="group mt-8 grid border border-line bg-surface md:grid-cols-2">
          <div className="relative flex aspect-[616/400] items-center justify-center bg-ink-2">
            {featured.coverImage ? (
              <Image src={featured.coverImage} alt="" fill sizes="(min-width:768px) 616px, 100vw" className="object-cover" priority />
            ) : (
              <span className="text-[13px] tracking-[0.1em] text-on-dark-muted uppercase">[Featured article image]</span>
            )}
          </div>
          <div className="flex flex-col justify-center p-8 md:p-12">
            <p className="eyebrow">Featured · {featured.category}</p>
            <h2 className="mt-4 font-display text-[clamp(30px,3vw,40px)] leading-[1.15] group-hover:text-brass">{featured.title}</h2>
            <p className="mt-5 text-[17px] text-body-2">{featured.excerpt}</p>
            <p className="mt-5 text-[15.5px] font-semibold">Read article ({featured.readingMin} min)</p>
          </div>
        </Link>
      )}

      <div className="mt-14">
        <JournalGrid key={category ?? 'all'} initial={posts.map((p) => ({ ...p, publishedAt: p.publishedAt?.toISOString() ?? null }))} hasMore={hasMore} category={category} />
      </div>
    </div>
  );
}
