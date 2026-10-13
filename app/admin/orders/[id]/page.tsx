import { notFound } from 'next/navigation';
import { STATUS_LABEL } from '@/components/checkout/order-timeline';
import { AdminPage, Card, Input, Notice, Submit, Table, Td } from '@/components/admin/ui';
import { requireStaff, rupees } from '@/lib/admin';
import { db } from '@/lib/db';
import type { OrderStatus } from '@/lib/generated/prisma/enums';
import { formatPaise } from '@/lib/money';
import { canTransition } from '@/lib/orders';
import { changeStatus, createShipment, markCodReceived, refundOrder } from '../actions';

export const dynamic = 'force-dynamic';

export default async function OrderAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireStaff();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, events: { orderBy: { createdAt: 'desc' } }, shipment: true, invoice: true, coupon: true, returns: true },
  });
  if (!order) notFound();
  const addr = order.shippingAddress as Record<string, string>;
  const next = (Object.keys(STATUS_LABEL) as OrderStatus[]).filter((s) => canTransition(order.status, s));

  return (
    <AdminPage title={`Order ${order.number}`}>
      {sp.saved && <Notice>Updated.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card title="Items">
            <Table head={['Item', 'SKU', 'HSN', 'GST', 'Qty', 'Amount']}>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <Td>
                    {i.brandName} {i.productName}
                    <span className="block text-[13px] text-muted">{i.variantLabel}</span>
                  </Td>
                  <Td>{i.sku}</Td>
                  <Td>{i.hsnCode}</Td>
                  <Td>{i.gstRate}%</Td>
                  <Td>{i.qty}</Td>
                  <Td>{formatPaise(i.pricePaise * i.qty)}</Td>
                </tr>
              ))}
            </Table>
            <dl className="mt-4 grid max-w-[360px] grid-cols-2 gap-1 text-[15px]">
              <dt>Subtotal</dt>
              <dd className="text-right">{formatPaise(order.subtotalPaise)}</dd>
              <dt>Discount{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
              <dd className="text-right">− {formatPaise(order.discountPaise)}</dd>
              <dt>Shipping</dt>
              <dd className="text-right">{formatPaise(order.shippingPaise)}</dd>
              <dt>Gift wrap</dt>
              <dd className="text-right">{formatPaise(order.giftWrapPaise)}</dd>
              <dt>COD fee</dt>
              <dd className="text-right">{formatPaise(order.codFeePaise)}</dd>
              <dt className="font-semibold">Total</dt>
              <dd className="text-right font-semibold">{formatPaise(order.totalPaise)}</dd>
            </dl>
            {order.giftNote && <p className="mt-3 text-[15px]">Gift note: “{order.giftNote}”</p>}
          </Card>
          <Card title="Timeline">
            <ol className="space-y-2 text-[14.5px]">
              {order.events.map((e) => (
                <li key={e.id} className="grid gap-2 md:grid-cols-[170px_140px_1fr]">
                  <span className="text-muted">{e.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span className="font-semibold">{STATUS_LABEL[e.status]}</span>
                  <span>
                    {e.note} <span className="text-muted">· {e.actor}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Status">
            <p className="text-[17px] font-semibold">{STATUS_LABEL[order.status]}</p>
            <p className="text-[14px] text-muted">
              {order.paymentMethod} · {order.paymentStatus.replace('_', ' ').toLowerCase()}
              {order.razorpayPaymentId ? ` · ${order.razorpayPaymentId}` : ''}
            </p>
            {next.length > 0 && (
              <form action={changeStatus} className="mt-4 space-y-2">
                <input type="hidden" name="orderId" value={order.id} />
                <label htmlFor="to" className="label text-[13.5px]">
                  Move to
                </label>
                <select id="to" name="status" className="input min-h-10">
                  {next.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <Input label="Note (optional)" name="note" />
                <Submit>Update status</Submit>
              </form>
            )}
          </Card>
          <Card title="Shipping">
            <address className="text-[14.5px] not-italic">
              {addr.name}, +91 {addr.phone}
              <br />
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ''}
              {addr.landmark ? `, ${addr.landmark}` : ''}
              <br />
              {addr.city}, {addr.state} {addr.pincode}
            </address>
            {order.gstin && (
              <p className="mt-2 text-[14px]">
                GSTIN {order.gstin} · {order.businessName}
              </p>
            )}
            {order.shipment?.awb ? (
              <p className="mt-3 text-[14.5px]">
                {order.shipment.courier} · AWB {order.shipment.awb}
                {order.shipment.labelUrl && (
                  <>
                    {' · '}
                    <a href={order.shipment.labelUrl} target="_blank" rel="noopener noreferrer" className="link">
                      Print label
                    </a>
                  </>
                )}
              </p>
            ) : (
              ['CONFIRMED', 'PACKED'].includes(order.status) && (
                <form action={createShipment} className="mt-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <Submit>Create Shiprocket shipment</Submit>
                </form>
              )
            )}
          </Card>
          <Card title="Payment">
            {order.invoice && (
              <a href={`/api/orders/${encodeURIComponent(order.number)}/invoice`} className="link text-[14.5px]">
                Download invoice {order.invoice.number}
              </a>
            )}
            {order.paymentMethod === 'COD' && order.paymentStatus === 'COD_PENDING' && order.status === 'DELIVERED' && (
              <form action={markCodReceived} className="mt-3">
                <input type="hidden" name="orderId" value={order.id} />
                <Submit variant="outline">Mark COD received</Submit>
              </form>
            )}
            {user.role === 'ADMIN' &&
              order.paymentStatus !== 'REFUNDED' &&
              order.status !== 'PENDING_PAYMENT' &&
              (order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_RECEIVED') && (
                <form action={refundOrder} className="mt-4 space-y-2 border-t border-line pt-4">
                  <input type="hidden" name="orderId" value={order.id} />
                  <Input label="Refund amount (₹)" name="amount" defaultValue={rupees(order.totalPaise)} />
                  {order.paymentMethod === 'COD' && <Input label="Bank / UPI reference" name="reference" />}
                  <Submit variant="danger">{order.paymentMethod === 'COD' ? 'Record refund' : 'Refund via Razorpay'}</Submit>
                </form>
              )}
          </Card>
          <Card title="Customer">
            <p className="text-[14.5px]">
              +91 {order.contactPhone}
              <br />
              {order.contactEmail ?? 'No email'}
              <br />
              WhatsApp updates: {order.whatsappOptIn ? 'yes' : 'no'}
            </p>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
