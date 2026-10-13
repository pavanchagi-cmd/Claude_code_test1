import type { Metadata } from 'next';
import { activeFilterCount, type ShopFilters } from '@/lib/filters';

/** Canonical to the unfiltered listing; heavily filtered URLs are noindex, follow. */
export function listingMeta(title: string, description: string, basePath: string, f: ShopFilters): Metadata {
  const many = activeFilterCount(f) > 1 || Boolean(f.q);
  return {
    title,
    description,
    alternates: { canonical: f.page > 1 && !many ? `${basePath}?page=${f.page}` : basePath },
    robots: many ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: basePath },
  };
}
