import Link from 'next/link';
import { STATUS_LABEL } from '@/components/checkout/order-timeline';
import { AdminPage, Table, Td } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import type { OrderStatus } from '@/lib/generated/prisma/enums';
import { formatPaise } from '@/lib/money';

export const dynamic = 'force-dynamic';

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff();
  const { status, q } = await searchParams;
  const st = STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const orders = await db.order.findMany({
    where: {
      ...(st ? { status: st } : {}),
      ...(q ? { OR: [{ number: { contains: q.toUpperCase() } }, { contactPhone: { contains: q } }, { contactEmail: { contains: q.toLowerCase() } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
    take: 200,
  });
  return (
    <AdminPage title="Orders">
      <form className="mb-4 flex flex-wrap gap-2">
        <label htmlFor="os" className="sr-only">
          Status
        </label>
        <select id="os" name="status" defaultValue={st ?? ''} className="input min-h-10 w-[220px]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <label htmlFor="oq" className="sr-only">
          Search
        </label>
        <input id="oq" name="q" defaultValue={q} placeholder="Order no., phone or email" className="input min-h-10 w-[260px]" />
        <button className="btn btn-outline min-h-10">Filter</button>
      </form>
      <Table head={['Order', 'Placed', 'Customer', 'Items', 'Total', 'Payment', 'Status']}>
        {orders.map((o) => (
          <tr key={o.id}>
            <Td>
              <Link href={`/admin/orders/${o.id}`} className="link font-medium">
                {o.number}
              </Link>
            </Td>
            <Td>{o.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Td>
            <Td>
              {(o.shippingAddress as { name?: string }).name}
              <span className="block text-[13px] text-muted">+91 {o.contactPhone}</span>
            </Td>
            <Td>{o.items.reduce((a, i) => a + i.qty, 0)}</Td>
            <Td>{formatPaise(o.totalPaise)}</Td>
            <Td>
              {o.paymentMethod}
              <span className="block text-[13px] text-muted">{o.paymentStatus.replace('_', ' ').toLowerCase()}</span>
            </Td>
            <Td>{STATUS_LABEL[o.status]}</Td>
          </tr>
        ))}
      </Table>
      {orders.length === 0 && <p className="mt-4 text-muted">No orders found.</p>}
    </AdminPage>
  );
}
