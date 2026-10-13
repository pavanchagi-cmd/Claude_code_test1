import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { db } from '@/lib/db';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Brands A–Z', description: 'Every watch brand we stock, from A to Z.', alternates: { canonical: '/brands' } };

export default async function BrandsPage() {
  const brands = await db.brand.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: { where: { isActive: true } } } } } });
  const groups = new Map<string, typeof brands>();
  for (const b of brands) {
    const letter = (b.name.replace(/[^A-Za-z]/g, '')[0] ?? '#').toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), b]);
  }
  return (
    <div className="container-site pt-8 pb-[88px]">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Brands' }]} />
      <h1 className="h1-page mt-6">Brands A–Z</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-3 lg:grid-cols-4">
        {[...groups.entries()].map(([letter, list]) => (
          <section key={letter}>
            <h2 className="font-display text-[32px] text-brass">{letter}</h2>
            <ul className="mt-3 space-y-2">
              {list.map((b) => (
                <li key={b.id}>
                  <Link href={`/brands/${b.slug}`} className="link text-[17px]">
                    {b.name}
                  </Link>{' '}
                  <span className="text-[14px] text-muted">({b._count.products})</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
