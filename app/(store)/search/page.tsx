import type { Metadata } from 'next';
import { ShopView } from '@/components/shop/shop-view';
import { parseFilters } from '@/lib/filters';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  return { title: f.q ? `Search: ${f.q}` : 'Search', robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  if (!filters.q) {
    return (
      <div className="container-narrow py-[72px]">
        <h1 className="h1-page">Search</h1>
        <form action="/search" className="mt-8 flex max-w-[640px] gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Search watches and brands
          </label>
          <input id="q" name="q" type="search" required placeholder="Search watches, brands…" className="input flex-1" autoFocus />
          <button type="submit" className="btn btn-primary min-h-12">
            Search
          </button>
        </form>
      </div>
    );
  }
  return (
    <ShopView title={`Results for “${filters.q}”`} basePath="/search" scope={{ q: filters.q }} filters={filters} crumbs={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />
  );
}
