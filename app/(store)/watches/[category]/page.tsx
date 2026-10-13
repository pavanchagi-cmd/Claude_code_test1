import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopView } from '@/components/shop/shop-view';
import type { Scope } from '@/lib/catalog';
import { db } from '@/lib/db';
import { parseFilters } from '@/lib/filters';
import { listingMeta } from '@/lib/seo';

type Props = { params: Promise<{ category: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const GENDER_PAGES: Record<string, { title: string; gender: 'MEN' | 'WOMEN' }> = {
  men: { title: 'Men’s watches', gender: 'MEN' },
  women: { title: 'Women’s watches', gender: 'WOMEN' },
};

async function resolve(slug: string): Promise<{ title: string; description: string | null; scope: Scope } | null> {
  const g = GENDER_PAGES[slug];
  if (g) return { title: g.title, description: '[Short collection description]', scope: { gender: g.gender } };
  const cat = await db.category.findUnique({ where: { slug } });
  if (!cat) return null;
  const isAcc = slug === 'straps-accessories';
  return {
    title: isAcc ? 'Straps & accessories' : `${cat.name} watches`,
    description: cat.description ?? '[Short collection description]',
    scope: isAcc ? { accessories: true } : { categorySlug: slug },
  };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params;
  const r = await resolve(category);
  if (!r) return {};
  return listingMeta(r.title, `${r.title}: genuine pieces with warranty and free insured shipping across India.`, `/watches/${category}`, parseFilters(await searchParams));
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const r = await resolve(category);
  if (!r) notFound();
  const filters = parseFilters(await searchParams);
  return (
    <ShopView
      title={r.title}
      description={r.description}
      basePath={`/watches/${category}`}
      scope={r.scope}
      filters={filters}
      crumbs={[{ label: 'Home', href: '/' }, { label: r.title }]}
    />
  );
}
