import { productsBySlugs } from '@/lib/catalog';
import { json } from '@/lib/api';

/** Card data for a list of slugs (used by "Recently viewed"). */
export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get('slugs') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,120}$/.test(s))
    .slice(0, 12);
  const cards = await productsBySlugs(slugs);
  const order = new Map(slugs.map((s, i) => [s, i]));
  cards.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  return json({ products: cards }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
