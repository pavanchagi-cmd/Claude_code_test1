import Link from 'next/link';
import { STATUS_LABEL } from '@/components/checkout/order-timeline';
import { ReturnDialog } from '@/components/account/return-dialog';
import { WatchArt } from '@/components/product/watch-art';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPaise } from '@/lib/money';
import { canRequestReturn } from '@/lib/returns';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function OrdersPage() {
  const user = await requireUser('/account');
  const [orders, settings] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id, NOT: { status: 'PENDING_PAYMENT' } },
      orderBy: { createdAt: 'desc' },
      include: { items: true, events: { orderBy: { createdAt: 'asc' } }, invoice: true, shipment: true, returns: true },
      take: 50,
    }),
    getSettings(),
  ]);
  const productIds = orders.flatMap((o) => o.items.map((i) => i.productId ?? ''));
  const arts = new Map(
    (await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, slug: true, artStrap: true, artCase: true, artDial: true } })).map((p) => [p.id, p]),
  );

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="font-sans text-[26px] font-semibold">
        My orders
      </h2>
      {orders.length === 0 && (
        <div className="card mt-4 p-8 text-center">
          <p className="text-muted">You have not placed any orders yet.</p>
          <Link href="/watches" className="btn btn-primary mt-5">
            Start shopping
          </Link>
        </div>
      )}
      <ul className="mt-4 space-y-4">
        {orders.map((o) => {
          const last = o.events.at(-1);
          const tone = o.status === 'DELIVERED' ? 'text-success' : o.status === 'CANCELLED' ? 'text-warning' : 'text-brass';
          const statusLine =
            o.status === 'DELIVERED'
              ? `Delivered on ${last ? fmt(last.createdAt) : ''}`
              : o.status === 'SHIPPED' || o.status === 'OUT_FOR_DELIVERY'
                ? `${STATUS_LABEL[o.status]}${o.shipment?.courier ? ` · ${o.shipment.courier}` : ''}`
                : STATUS_LABEL[o.status];
          return (
            <li key={o.id} className="border border-line bg-surface">
              <div className="flex flex-wrap justify-between gap-2 bg-stone px-5 py-3 text-[14.5px] text-body-2">
                <span>
                  Order #{o.number} · Placed {fmt(o.createdAt)}
                </span>
                <span>Total {formatPaise(o.totalPaise)}</span>
              </div>
              {o.items.map((i, idx) => {
                const a = i.productId ? arts.get(i.productId) : undefined;
                return (
                  <div key={i.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                    <span className="flex h-[88px] w-[88px] shrink-0 items-center justify-center bg-stone">
                      {a?.artDial && <WatchArt strap={a.artStrap ?? '#A9A59C'} caseColor={a.artCase ?? '#CFCBC2'} dial={a.artDial} variant="dot" className="h-12" />}
                    </span>
                    <div className="flex-1">
                      {a ? (
                        <Link href={`/watch/${a.slug}`} className="text-[18px] font-semibold hover:text-brass">
                          {i.productName}
                        </Link>
                      ) : (
                        <span className="text-[18px] font-semibold">{i.productName}</span>
                      )}
                      <p className={`mt-1 text-[15px] font-semibold ${tone}`}>{statusLine}</p>
                      {o.returns.find((r) => r.orderItemId === i.id) && (
                        <p className="mt-1 text-[14px] text-muted">
                          Return:{' '}
                          {o.returns
                            .find((r) => r.orderItemId === i.id)!
                            .status.toLowerCase()
                            .replace('_', ' ')}
                        </p>
                      )}
                    </div>
                    {idx === 0 && (
                      <div className="flex flex-wrap gap-2">
                        <Link href={o.shipment?.trackingUrl?.startsWith('http') ? o.shipment.trackingUrl : `/track-order?order=${o.number}`} className="btn btn-primary min-h-11">
                          Track
                        </Link>
                        {o.invoice && (
                          <a href={`/api/orders/${encodeURIComponent(o.number)}/invoice`} className="btn btn-outline min-h-11">
                            Invoice
                          </a>
                        )}
                        {canRequestReturn(o, settings.returnWindowDays) && <ReturnDialog orderId={o.id} items={o.items.map((x) => ({ id: x.id, name: x.productName }))} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
