'use client';

import { useEffect, useState } from 'react';
import type { ProductCardData } from '@/lib/catalog';
import { ProductCard } from './product-card';

const KEY = 'recently-viewed';

/** Records this product and shows the visitor's other recently viewed watches. */
export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [items, setItems] = useState<ProductCardData[]>([]);
  useEffect(() => {
    let list: string[] = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      list = [];
    }
    const others = list.filter((s) => s !== currentSlug).slice(0, 4);
    try {
      localStorage.setItem(KEY, JSON.stringify([currentSlug, ...others].slice(0, 12)));
    } catch {
      /* ignore */
    }
    if (!others.length) return;
    fetch(`/api/products?slugs=${others.join(',')}`)
      .then((r) => r.json())
      .then((j: { products: ProductCardData[] }) => setItems(j.products))
      .catch(() => {});
  }, [currentSlug]);

  if (!items.length) return null;
  return (
    <section className="container-site pb-[88px]" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="h2-section">
        Recently viewed
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} compact />
        ))}
      </div>
    </section>
  );
}
