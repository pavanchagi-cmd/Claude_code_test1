import type { Metadata } from 'next';
import Link from 'next/link';
import { OrderTimeline, STATUS_LABEL } from '@/components/checkout/order-timeline';
import { TrackForm } from '@/components/home/track-form';
import { db } from '@/lib/db';
import { shipping, type TrackingEvent } from '@/lib/integrations/shiprocket';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Track your order',
  description: 'Track your order with your order number and the mobile number or email used at checkout.',
  alternates: { canonical: '/track-order' },
};

type Props = { searchParams: Promise<{ order?: string; contact?: string }> };

async function lookup(orderRaw: string, contactRaw: string) {
  const number = orderRaw.trim().replace(/^#/, '').toUpperCase();
  const contact = contactRaw.trim().toLowerCase();
  const digits = contact.replace(/\D/g, '').slice(-10);
  const order = await db.order.findUnique({ where: { number }, include: { events: { orderBy: { createdAt: 'asc' } }, shipment: true, items: true } });
  if (!order) return null;
  const match = (digits.length === 10 && order.contactPhone === digits) || (contact.includes('@') && order.contactEmail?.toLowerCase() === contact);
  return match ? order : null;
}

export default async function TrackOrderPage({ searchParams }: Props) {
  const { order: orderQ = '', contact = '' } = await searchParams;
  let result: Awaited<ReturnType<typeof lookup>> = null;
  let message: string | null = null;
  let events: TrackingEvent[] = [];
  if (orderQ && contact) {
    if (!(await rateLimit(`track:${await clientIp()}`, 20, 600))) message = 'Too many lookups. Please try again in a few minutes.';
    else {
      result = await lookup(orderQ, contact);
      if (!result) message = 'We could not find an order with those details. Check the order number and the mobile number or email used at checkout.';
      else {
        events = (result.shipment?.events as TrackingEvent[] | null) ?? [];
        if (result.shipment?.awb && !shipping.mock) events = await shipping.track(result.shipment.awb).catch(() => events);
      }
    }
  }

  return (
    <div className="container-narrow pt-12 pb-[88px]">
      <h1 className="h1-page">Track your order</h1>
      <div className="mt-8">
        <TrackForm order={orderQ} contact={contact} heading={false} />
      </div>
      {message && (
        <p role="alert" className="mt-6 bg-sand p-4 text-[16px] text-warning">
          {message}
        </p>
      )}
      {result && (
        <section className="card mt-6 p-7" aria-labelledby="track-result">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="track-result" className="font-sans text-[21px] font-semibold">
              Order #{result.number}
            </h2>
            <p className="text-[16px] font-semibold">{STATUS_LABEL[result.status]}</p>
          </div>
          <p className="mt-1 text-[15px] text-muted">{result.items.map((i) => `${i.productName} × ${i.qty}`).join(', ')}</p>
          <OrderTimeline status={result.status} events={result.events} />
          {result.shipment?.awb && (
            <p className="mt-6 text-[15px]">
              {result.shipment.courier ?? 'Courier'} · AWB {result.shipment.awb}
              {result.shipment.trackingUrl?.startsWith('http') && (
                <>
                  {' · '}
                  <a href={result.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="link font-semibold">
                    Courier tracking
                  </a>
                </>
              )}
            </p>
          )}
          {events.length > 0 && (
            <ol className="mt-6 space-y-3 border-t border-line pt-5">
              {events.map((e, i) => (
                <li key={i} className="grid gap-1 text-[15px] md:grid-cols-[180px_1fr]">
                  <span className="text-muted">{e.date}</span>
                  <span>
                    <strong className="font-semibold">{e.status}</strong>
                    {e.location ? ` · ${e.location}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 text-[14.5px] text-muted">
            Need help?{' '}
            <Link href="/help#contact" className="link text-ink">
              Contact us
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
