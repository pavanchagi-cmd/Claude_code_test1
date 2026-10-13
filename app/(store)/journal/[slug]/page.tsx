import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/product/product-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { JsonLd } from '@/components/ui/json-ld';
import { ShareLinks } from '@/components/ui/share-links';
import { productsBySlugs } from '@/lib/catalog';
import { db } from '@/lib/db';
import { siteUrl } from '@/lib/env';
import { Markdown, plainText } from '@/lib/markdown';
import { getSettings } from '@/lib/settings';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    return (await db.post.findMany({ where: { publishedAt: { lte: new Date() } }, select: { slug: true } })).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

async function load(slug: string) {
  const post = await db.post.findUnique({ where: { slug } });
  return post && post.publishedAt && post.publishedAt <= new Date() ? post : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load((await params).slug);
  if (!post) return {};
  const description = post.seoDescription ?? post.excerpt ?? plainText(post.body);
  return {
    title: post.seoTitle ?? post.title,
    description,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description, publishedTime: post.publishedAt?.toISOString(), images: post.coverImage ? [post.coverImage] : undefined },
  };
}

export default async function ArticlePage({ params }: Props) {
  const post = await load((await params).slug);
  if (!post) notFound();
  const [related, settings] = await Promise.all([productsBySlugs(post.relatedProductSlugs), getSettings()]);
  const url = `${siteUrl()}/journal/${post.slug}`;
  return (
    <article className="pt-8 pb-[88px]">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt ?? undefined,
          image: post.coverImage ? [post.coverImage] : undefined,
          datePublished: post.publishedAt?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: { '@type': 'Organization', name: settings.brandName },
          publisher: { '@type': 'Organization', name: settings.brandName },
          mainEntityOfPage: url,
        }}
      />
      <div className="container-narrow max-w-[860px]">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Journal', href: '/journal' }, { label: post.title }]} />
        <p className="eyebrow mt-8">{post.category}</p>
        <h1 className="h1-page mt-3">{post.title}</h1>
        <p className="mt-4 text-[15px] text-muted">
          {post.publishedAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {post.readingMin} min read
        </p>
      </div>
      <div className="container-narrow mt-8 max-w-[1000px]">
        <div className="relative aspect-[16/8]" style={{ backgroundColor: post.coverColor ?? 'var(--color-placeholder)' }}>
          {post.coverImage && <Image src={post.coverImage} alt="" fill priority sizes="1000px" className="object-cover" />}
        </div>
      </div>
      <div className="container-narrow prose-article mt-10 max-w-[760px]">
        <Markdown source={post.body} />
        <div className="mt-10 border-t border-line pt-6">
          <ShareLinks url={url} title={post.title} />
        </div>
      </div>
      {related.length > 0 && (
        <section className="container-site mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="h2-section">
            Watches in this story
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
