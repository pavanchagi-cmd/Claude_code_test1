import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderTimeline, STATUS_LABEL } from '@/components/checkout/order-timeline';
import { AutoRefresh, PurchaseTracker } from '@/components/checkout/purchase-tracker';
import { WatchArt } from '@/components/product/watch-art';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPaise } from '@/lib/money';
import { getOrderForViewer } from '@/lib/orders';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

const METHOD_LABEL: Record<string, string> = { UPI: 'UPI', CARD: 'card', EMI: 'EMI', NETBANKING: 'net banking', COD: 'cash on delivery' };

export default async function OrderConfirmedPage({ params, searchParams }: Props) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const user = await currentUser();
  const order = await getOrderForViewer(decodeURIComponent(id), { token: t, userId: user?.id, isStaff: user?.role !== 'CUSTOMER' && Boolean(user) });
  if (!order) notFound();
  const settings = await getSettings();
  const addr = order.shippingAddress as { name: string; line1: string; line2?: string; city: string; state: string; pincode: string; phone: string };
  const products = await db.product.findMany({
    where: { id: { in: order.items.map((i) => i.productId ?? '') } },
    select: { id: true, slug: true, artStrap: true, artCase: true, artDial: true },
  });
  const art = new Map(products.map((p) => [p.id, p]));
  const firstName = addr.name.split(' ')[0];
  const invoiceHref = `/api/orders/${encodeURIComponent(order.number)}/invoice?t=${order.accessToken}`;
  const pending = order.status === 'PENDING_PAYMENT';
  const failed = order.status === 'CANCELLED' && order.paymentStatus === 'FAILED';

  return (
    <div className="container-confirm pt-16 pb-[88px]">
      {pending && <AutoRefresh />}
      {!pending && !failed && (
        <PurchaseTracker
          orderNumber={order.number}
          token={order.accessToken}
          valueRupees={order.totalPaise / 100}
          items={order.items.map((i) => ({ id: i.sku, name: i.productName, price: i.pricePaise / 100, quantity: i.qty }))}
        />
      )}
      <div className="text-center">
        <span
          className={`mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full ${failed ? 'bg-sand text-warning' : 'bg-[color-mix(in_srgb,var(--color-success)_14%,white)] text-success'}`}
          aria-hidden="true"
        >
          <Check size={34} strokeWidth={1.8} />
        </span>
        <h1 className="h1-page mt-7">{pending ? 'Confirming your payment…' : failed ? 'Payment not completed' : `Thank you, ${firstName}`}</h1>
        <p className="mx-auto mt-4 max-w-[520px] text-[18px] text-body-2">
          {pending ? (
            <>
              We are waiting for the payment gateway to confirm order <strong>#{order.number}</strong>. This page refreshes automatically.
            </>
          ) : failed ? (
            <>
              Order <strong>#{order.number}</strong> was not paid, so we released the items. You can try again from your cart.
            </>
          ) : (
            <>
              Your order <strong>#{order.number}</strong> is confirmed. We’ve sent the details and invoice to your {order.contactEmail ? 'email, ' : ''}SMS
              {order.whatsappOptIn ? ' and WhatsApp' : ''}.
            </>
          )}
        </p>
      </div>

      {!failed && (
        <section className="card mt-9 p-7" aria-labelledby="status-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="status-heading" className="font-sans text-[21px] font-semibold">
              Delivery status
            </h2>
            <p className="text-[16px] font-semibold">{order.status === 'DELIVERED' ? 'Delivered' : `Status: ${STATUS_LABEL[order.status]}`}</p>
          </div>
          <OrderTimeline status={order.status} events={order.events} />
        </section>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-sans text-[19px] font-semibold">Shipping to</h2>
          <address className="mt-3 text-[16px] leading-[1.6] text-body-2 not-italic">
            {addr.name}
            <br />
            {addr.line1}
            {addr.line2 ? `, ${addr.line2}` : ''}
            <br />
            {addr.city}, {addr.state} – {addr.pincode}
            <br />
            +91 {addr.phone}
          </address>
        </section>
        <section className="card p-6">
          <h2 className="font-sans text-[19px] font-semibold">Payment</h2>
          <p className="mt-3 text-[16px] text-body-2">
            {order.paymentMethod === 'COD' ? 'Pay on delivery' : pending ? 'Processing' : 'Paid'} via {METHOD_LABEL[order.paymentMethod]} · {formatPaise(order.totalPaise)}
          </p>
          {order.invoice && (
            <a href={invoiceHref} className="link mt-3 inline-block text-[15.5px] font-semibold">
              Download GST invoice
            </a>
          )}
        </section>
      </div>

      <section className="card mt-5 p-6" aria-labelledby="items-heading">
        <h2 id="items-heading" className="font-sans text-[19px] font-semibold">
          Items
        </h2>
        <ul className="mt-4 space-y-4">
          {order.items.map((i) => {
            const a = i.productId ? art.get(i.productId) : undefined;
            return (
              <li key={i.id} className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center bg-stone">
                  {a?.artDial && <WatchArt strap={a.artStrap ?? '#A9A59C'} caseColor={a.artCase ?? '#CFCBC2'} dial={a.artDial} variant="dot" className="h-10" />}
                </span>
                <span className="flex-1 text-[16.5px] font-medium">
                  {i.productName}
                  <span className="block text-[14px] font-normal text-muted">
                    {i.variantLabel} · Qty {i.qty}
                  </span>
                </span>
                <span className="text-[16.5px]">{formatPaise(i.pricePaise * i.qty)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {!failed && (
        <section className="mt-5 flex flex-col gap-5 bg-ink p-7 text-on-dark md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-[27px]">Register your warranty</h2>
            <p className="mt-2 max-w-[500px] text-[15px] text-on-dark-muted">
              Once your watch arrives, register its serial number to activate your {settings.warrantyYears}-year warranty and get a digital warranty card.
            </p>
          </div>
          <Link href={user ? '/account/warranty' : `/login?next=/account/warranty`} className="btn btn-accent shrink-0">
            {user ? 'Register warranty' : 'Set a reminder'}
          </Link>
        </section>
      )}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href={`/track-order?order=${encodeURIComponent(order.number)}`} className="btn btn-primary btn-lg">
          Track order
        </Link>
        <Link href={failed ? '/cart' : '/watches'} className="btn btn-secondary btn-lg">
          {failed ? 'Back to cart' : 'Continue shopping'}
        </Link>
      </div>
    </div>
  );
}
