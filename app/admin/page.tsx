import Link from 'next/link';
import { AdminPage, Card, Notice, Table, Td } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import { mockedIntegrations } from '@/lib/env';
import { formatPaise } from '@/lib/money';

export const dynamic = 'force-dynamic';

function startOfTodayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600 * 1000);
}

export default async function Dashboard() {
  await requireStaff();
  const since = startOfTodayIST();
  const paidStatuses = ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
  const [todayOrders, revenue, lowStock, returns, tickets, toShip, failedJobs] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: since }, status: { in: [...paidStatuses] } } }),
    db.order.aggregate({ where: { createdAt: { gte: since }, status: { in: [...paidStatuses] } }, _sum: { totalPaise: true } }),
    db.$queryRaw<{ id: string; sku: string; label: string; stock: number; reserved: number; name: string; productId: string }[]>`
      SELECT v.id, v.sku, v.label, v.stock, v.reserved, p.name, p.id AS "productId"
      FROM "Variant" v JOIN "Product" p ON p.id = v."productId"
      WHERE p."isActive" = true AND v.stock - v.reserved <= 3 ORDER BY v.stock - v.reserved ASC LIMIT 20`,
    db.returnRequest.count({ where: { status: 'REQUESTED' } }),
    db.supportTicket.count({ where: { status: 'OPEN' } }),
    db.order.count({ where: { status: { in: ['CONFIRMED', 'PACKED'] } } }),
    db.job.count({ where: { status: 'FAILED' } }),
  ]);
  const mocked = mockedIntegrations();
  return (
    <AdminPage title="Dashboard">
      {mocked.length > 0 && <Notice tone="warn">Running with mock integrations (no API keys): {mocked.join(', ')}. Add keys in Vercel → Settings → Environment Variables.</Notice>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Orders today', String(todayOrders), '/admin/orders'],
          ['Revenue today', formatPaise(revenue._sum.totalPaise ?? 0), '/admin/orders'],
          ['To ship', String(toShip), '/admin/orders?status=CONFIRMED'],
          ['Pending returns', String(returns), '/admin/returns'],
          ['Open tickets', String(tickets), '/admin/tickets'],
        ].map(([label, value, href]) => (
          <Link key={label} href={href} className="card p-5 hover:border-ink">
            <p className="text-[13px] tracking-[0.06em] text-muted uppercase">{label}</p>
            <p className="mt-2 text-[28px] font-semibold">{value}</p>
          </Link>
        ))}
      </div>
      {failedJobs > 0 && <Notice tone="warn">{failedJobs} notification(s) failed after retries. Check provider keys and templates.</Notice>}
      <Card title="Low stock (3 or fewer available)" className="mt-6">
        {lowStock.length === 0 ? (
          <p className="text-muted">All good.</p>
        ) : (
          <Table head={['Product', 'Variant', 'SKU', 'Available']}>
            {lowStock.map((v) => (
              <tr key={v.id}>
                <Td>
                  <Link href={`/admin/products/${v.productId}`} className="link">
                    {v.name}
                  </Link>
                </Td>
                <Td>{v.label}</Td>
                <Td>{v.sku}</Td>
                <Td className={v.stock - v.reserved <= 0 ? 'font-semibold text-warning' : ''}>{v.stock - v.reserved}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AdminPage>
  );
}
