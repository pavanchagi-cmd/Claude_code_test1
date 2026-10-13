'use client';

import { useState } from 'react';
import { ProductCard } from '@/components/product/product-card';
import type { ProductCardData } from '@/lib/catalog';

const TABS = [
  { key: 'new', label: 'New' },
  { key: 'bestsellers', label: 'Bestsellers' },
  { key: 'men', label: 'Men' },
  { key: 'women', label: 'Women' },
] as const;

type Key = (typeof TABS)[number]['key'];

/** Client-side tab switch; all four lists are preloaded on the server. */
export function ArrivalsTabs({ data }: { data: Record<Key, ProductCardData[]> }) {
  const [tab, setTab] = useState<Key>('new');
  return (
    <section className="container-site pt-[72px]" aria-labelledby="arrivals-heading">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <h2 id="arrivals-heading" className="h2-section">
          New arrivals
        </h2>
        <div role="tablist" aria-label="Filter new arrivals" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="arrivals-panel"
              data-active={tab === t.key}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => {
                const i = TABS.findIndex((x) => x.key === tab);
                if (e.key === 'ArrowRight') setTab(TABS[(i + 1) % TABS.length].key);
                if (e.key === 'ArrowLeft') setTab(TABS[(i + TABS.length - 1) % TABS.length].key);
              }}
              tabIndex={tab === t.key ? 0 : -1}
              className="chip"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div id="arrivals-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-8 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
        {data[tab].map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {data[tab].length === 0 && <p className="col-span-full text-muted">No watches here yet.</p>}
      </div>
    </section>
  );
}
