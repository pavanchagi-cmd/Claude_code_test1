import Link from 'next/link';
import { ProductCard } from '@/components/product/product-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { listProducts, type Scope } from '@/lib/catalog';
import { FILTER_KEYS, SORT_OPTIONS, labelFor, serializeFilters, type ShopFilters } from '@/lib/filters';
import { FilterPanel, SortSelect } from './filter-panel';

type Props = {
  title: string;
  description?: string | null;
  basePath: string;
  scope: Scope;
  filters: ShopFilters;
  crumbs: { label: string; href?: string }[];
};

export async function ShopView({ title, description, basePath, scope, filters, crumbs }: Props) {
  const { products, total, page, pages, facets, brands } = await listProducts(scope, filters);

  const chips = FILTER_KEYS.flatMap((k) =>
    filters[k].map((v) => ({
      key: k,
      value: v,
      label: labelFor(k, v, brands),
      href: basePath + serializeFilters({ ...filters, [k]: filters[k].filter((x) => x !== v), page: 1 }),
    })),
  );

  const pageHref = (n: number) => basePath + serializeFilters({ ...filters, page: n });

  return (
    <div className="container-site pt-8 pb-[88px]">
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="h1-page">{title}</h1>
          <p className="mt-3 text-[18px] text-muted">
            {total} {total === 1 ? 'watch' : 'watches'}
            {description ? ` · ${description}` : ''}
          </p>
        </div>
        <SortSelect filters={filters} options={SORT_OPTIONS} />
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[240px_1fr] lg:grid-cols-[282px_1fr]">
        <FilterPanel key={JSON.stringify(filters)} facets={facets} filters={filters} />

        <section aria-label="Products" aria-live="polite">
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-[15px] text-muted">Active:</span>
              {chips.map((c) => (
                <Link
                  key={`${c.key}-${c.value}`}
                  href={c.href}
                  scroll={false}
                  className="inline-flex min-h-9 items-center gap-2 bg-ink px-3 text-[14.5px] text-on-dark"
                  aria-label={`Remove filter ${c.label}`}
                >
                  {c.label} <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href={basePath + serializeFilters({ sort: filters.sort, q: filters.q })} scroll={false} className="link ml-1 text-[14.5px] text-brass">
                Clear all
              </Link>
            </div>
          )}

          {products.length === 0 ? (
            <div className="card p-10 text-center">
              <h2 className="font-display text-[28px]">No watches match these filters</h2>
              <p className="mt-2 text-muted">Try removing a filter or two.</p>
              <Link href={basePath} className="btn btn-primary mt-6">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex justify-center gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="chip" rel="prev">
                  Previous
                </Link>
              )}
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={pageHref(n)} aria-current={n === page ? 'page' : undefined} data-active={n === page} className="chip min-w-11 justify-center">
                  {n}
                </Link>
              ))}
              {page < pages && (
                <Link href={pageHref(page + 1)} className="chip" rel="next">
                  Next
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
