import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { siteUrl } from '@/lib/env';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const fixed = ['', '/watches', '/watches/men', '/watches/women', '/watches/straps-accessories', '/brands', '/about', '/journal', '/help', '/track-order'].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: 'daily' as const,
    priority: p === '' ? 1 : 0.7,
  }));
  try {
    const [products, categories, brands, posts, policies] = await Promise.all([
      db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      db.category.findMany({ select: { slug: true, updatedAt: true } }),
      db.brand.findMany({ select: { slug: true, updatedAt: true } }),
      db.post.findMany({ where: { publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
      db.policy.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...fixed,
      ...products.map((p) => ({ url: `${base}/watch/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.9 })),
      ...categories.filter((c) => c.slug !== 'straps-accessories').map((c) => ({ url: `${base}/watches/${c.slug}`, lastModified: c.updatedAt, priority: 0.6 })),
      ...brands.map((b) => ({ url: `${base}/brands/${b.slug}`, lastModified: b.updatedAt, priority: 0.6 })),
      ...posts.map((p) => ({ url: `${base}/journal/${p.slug}`, lastModified: p.updatedAt, priority: 0.5 })),
      ...policies.map((p) => ({ url: `${base}/policies/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
    ];
  } catch {
    return fixed;
  }
}
