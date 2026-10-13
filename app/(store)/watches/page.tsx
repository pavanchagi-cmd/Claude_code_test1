import type { Metadata } from 'next';
import { ShopView } from '@/components/shop/shop-view';
import { parseFilters } from '@/lib/filters';
import { listingMeta } from '@/lib/seo';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return listingMeta(
    'All watches',
    'Shop genuine automatic, quartz, mechanical and solar watches. Free insured shipping across India, UPI, EMI and COD.',
    '/watches',
    parseFilters(await searchParams),
  );
}

export default async function WatchesPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  return (
    <ShopView
      title="All watches"
      description="[Short collection description]"
      basePath="/watches"
      scope={{}}
      filters={filters}
      crumbs={[{ label: 'Home', href: '/' }, { label: 'All watches' }]}
    />
  );
}
