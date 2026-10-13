import Link from 'next/link';
import { AdminPage, LinkButton, Table, Td } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import { formatPaise } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  const products = await db.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } }] } : undefined,
    include: { brand: true, variants: true, _count: { select: { images: true } } },
    orderBy: [{ isAccessory: 'asc' }, { updatedAt: 'desc' }],
    take: 200,
  });
  return (
    <AdminPage
      title="Products"
      actions={
        <>
          <LinkButton href="/admin/products/import">Import CSV</LinkButton>
          <Link href="/admin/products/new" className="btn btn-primary min-h-10 px-4 text-[14.5px]">
            Add product
          </Link>
        </>
      }
    >
      <form className="mb-4 flex max-w-[420px] gap-2">
        <label htmlFor="pq" className="sr-only">
          Search products
        </label>
        <input id="pq" name="q" defaultValue={q} placeholder="Search name or SKU" className="input min-h-10" />
        <button className="btn btn-outline min-h-10">Search</button>
      </form>
      <Table head={['Product', 'Brand', 'Price', 'Stock', 'Images', 'Status']}>
        {products.map((p) => {
          const prices = p.variants.map((v) => v.pricePaise);
          const stock = p.variants.reduce((a, v) => a + v.stock - v.reserved, 0);
          return (
            <tr key={p.id}>
              <Td>
                <Link href={`/admin/products/${p.id}`} className="link font-medium">
                  {p.name}
                </Link>
                <span className="block text-[13px] text-muted">{p.slug}</span>
              </Td>
              <Td>{p.brand.name}</Td>
              <Td>{prices.length ? formatPaise(Math.min(...prices)) : '—'}</Td>
              <Td className={stock <= 3 ? 'font-semibold text-warning' : ''}>{stock}</Td>
              <Td>{p._count.images}</Td>
              <Td>{p.isActive ? 'Live' : 'Hidden'}</Td>
            </tr>
          );
        })}
      </Table>
    </AdminPage>
  );
}
