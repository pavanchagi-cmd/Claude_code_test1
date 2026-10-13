import 'server-only';
import { db } from '@/lib/db';

export const JOURNAL_CATEGORIES = ['Guides', 'Buying advice', 'Care', 'Brand stories'] as const;
export const POSTS_PER_PAGE = 9;

export async function listPosts(category: string | null, page: number, excludeId?: string | null) {
  const where = { publishedAt: { lte: new Date() }, ...(category ? { category } : {}), ...(excludeId ? { id: { not: excludeId } } : {}) };
  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
      select: { id: true, slug: true, title: true, category: true, coverImage: true, coverColor: true, readingMin: true, publishedAt: true, excerpt: true, featured: true },
    }),
    db.post.count({ where }),
  ]);
  return { posts, total, hasMore: page * POSTS_PER_PAGE < total };
}

export type PostCard = Awaited<ReturnType<typeof listPosts>>['posts'][number];

export async function featuredPost(category: string | null) {
  return db.post.findFirst({ where: { featured: true, publishedAt: { lte: new Date() }, ...(category ? { category } : {}) }, orderBy: { publishedAt: 'desc' } });
}
