import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopView } from '@/components/shop/shop-view';
import { db } from '@/lib/db';
import { parseFilters } from '@/lib/filters';
import { listingMeta } from '@/lib/seo';

type Props = { params: Promise<{ brand: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand } = await params;
  const b = await db.brand.findUnique({ where: { slug: brand } });
  if (!b) return {};
  return listingMeta(`${b.name} watches`, b.description ?? `Shop genuine ${b.name} watches.`, `/brands/${brand}`, parseFilters(await searchParams));
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { brand } = await params;
  const b = await db.brand.findUnique({ where: { slug: brand } });
  if (!b) notFound();
  return (
    <ShopView
      title={`${b.name} watches`}
      description={b.description}
      basePath={`/brands/${brand}`}
      scope={{ brandSlug: brand }}
      filters={parseFilters(await searchParams)}
      crumbs={[{ label: 'Home', href: '/' }, { label: 'Brands', href: '/brands' }, { label: b.name }]}
    />
  );
}
