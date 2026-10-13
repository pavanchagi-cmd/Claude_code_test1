import Link from 'next/link';
import { AdminPage, Notice, Submit, Table, Td } from '@/components/admin/ui';
import { requireStaff, rupees } from '@/lib/admin';
import { db } from '@/lib/db';
import { updateReturn } from '../orders/actions';

export const dynamic = 'force-dynamic';

export default async function ReturnsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const returns = await db.returnRequest.findMany({ orderBy: { createdAt: 'desc' }, include: { order: true, orderItem: true }, take: 200 });
  return (
    <AdminPage title="Returns">
      {sp.saved && <Notice>Updated.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <Table head={['Requested', 'Order', 'Item', 'Reason', 'Status', 'Actions']}>
        {returns.map((r) => (
          <tr key={r.id}>
            <Td>{r.createdAt.toLocaleDateString('en-IN')}</Td>
            <Td>
              <Link href={`/admin/orders/${r.orderId}`} className="link">
                {r.order.number}
              </Link>
            </Td>
            <Td>{r.orderItem.productName}</Td>
            <Td className="max-w-[260px]">{r.reason}</Td>
            <Td>{r.status.replace('_', ' ').toLowerCase()}</Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                {r.status === 'REQUESTED' && (
                  <>
                    <form action={updateReturn}>
                      <input type="hidden" name="returnId" value={r.id} />
                      <input type="hidden" name="action" value="approve" />
                      <Submit variant="outline">Approve</Submit>
                    </form>
                    <form action={updateReturn} className="flex gap-1">
                      <input type="hidden" name="returnId" value={r.id} />
                      <input type="hidden" name="action" value="reject" />
                      <input name="note" placeholder="Reason" aria-label="Rejection reason" className="input min-h-10 w-[140px] text-[14px]" />
                      <Submit variant="danger">Reject</Submit>
                    </form>
                  </>
                )}
                {r.status === 'APPROVED' && (
                  <form action={updateReturn}>
                    <input type="hidden" name="returnId" value={r.id} />
                    <input type="hidden" name="action" value="picked_up" />
                    <Submit variant="outline">Mark picked up</Submit>
                  </form>
                )}
                {r.status === 'PICKED_UP' && user.role === 'ADMIN' && (
                  <form action={updateReturn} className="flex gap-1">
                    <input type="hidden" name="returnId" value={r.id} />
                    <input type="hidden" name="action" value="refund" />
                    <input
                      name="amount"
                      defaultValue={rupees(r.orderItem.pricePaise * r.orderItem.qty)}
                      aria-label="Refund amount in rupees"
                      className="input min-h-10 w-[110px] text-[14px]"
                    />
                    <Submit variant="danger">Refund</Submit>
                  </form>
                )}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
      {returns.length === 0 && <p className="mt-4 text-muted">No return requests.</p>}
    </AdminPage>
  );
}
