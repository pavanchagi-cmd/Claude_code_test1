import { db } from '@/lib/db';
import { json } from '@/lib/api';
import { formatPaise } from '@/lib/money';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  if (q.length < 2) return json({ results: [] });
  if (!(await rateLimit(`search:${await clientIp()}`, 120, 60))) return json({ results: [] }, 429);

  // Postgres full-text search with a prefix match fallback for partial words.
  const tsQuery = q
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(' & ');
  let ids: string[] = [];
  if (tsQuery) {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM "Product" p JOIN "Brand" b ON b.id = p."brandId"
      WHERE p."isActive" = true AND to_tsvector('simple', p.name || ' ' || b.name || ' ' || coalesce(p."dialColour", '') || ' ' || coalesce(p."caseMaterial", '') || ' ' || coalesce(p.reference, ''))
        @@ to_tsquery('simple', ${tsQuery})
      ORDER BY p."isAccessory" ASC, p."featuredRank" DESC
      LIMIT 6`;
    ids = rows.map((r) => r.id);
  }
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    include: { brand: true, variants: { orderBy: { pricePaise: 'asc' }, take: 1 }, images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return json({
    results: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand.name,
      price: formatPaise(p.variants[0]?.pricePaise ?? 0),
      image: p.images[0]?.url.startsWith('http') || p.images[0]?.url.startsWith('/') ? p.images[0].url : null,
      art: p.artDial ? { strap: p.artStrap ?? '#A9A59C', case: p.artCase ?? '#CFCBC2', dial: p.artDial } : null,
    })),
  });
}
