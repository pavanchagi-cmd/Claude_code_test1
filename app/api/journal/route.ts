import { json } from '@/lib/api';
import { JOURNAL_CATEGORIES, featuredPost, listPosts } from '@/lib/journal';

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const c = sp.get('category');
  const category = c && (JOURNAL_CATEGORIES as readonly string[]).includes(c) ? c : null;
  const page = Math.max(1, Number(sp.get('page') ?? 1) || 1);
  const featured = await featuredPost(category);
  const { posts, hasMore } = await listPosts(category, page, featured?.id);
  return json({ posts: posts.map((p) => ({ ...p, publishedAt: p.publishedAt?.toISOString() ?? null })), hasMore });
}
