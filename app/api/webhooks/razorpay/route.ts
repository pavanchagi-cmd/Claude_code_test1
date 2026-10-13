import { db } from '@/lib/db';
import { error, json } from '@/lib/api';
import { payments } from '@/lib/integrations/razorpay';
import { confirmOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

type RazorpayEvent = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; error_description?: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number } };
  };
};

/**
 * Source of truth for payments. Verified with RAZORPAY_WEBHOOK_SECRET and
 * idempotent: each event id is processed once (WebhookEvent table).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!payments.verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'))) return error('Invalid signature', 401);

  const eventId = req.headers.get('x-razorpay-event-id');
  let evt: RazorpayEvent;
  try {
    evt = JSON.parse(raw);
  } catch {
    return error('Invalid JSON', 400);
  }

  if (eventId) {
    try {
      await db.webhookEvent.create({ data: { source: 'razorpay', eventId } });
    } catch {
      return json({ ok: true, duplicate: true });
    }
  }

  try {
    if (evt.event === 'payment.captured' && evt.payload.payment) {
      const p = evt.payload.payment.entity;
      const order = await db.order.findUnique({ where: { razorpayOrderId: p.order_id } });
      if (order) {
        if (p.amount !== order.totalPaise) {
          await db.orderEvent.create({
            data: { orderId: order.id, status: order.status, actor: 'webhook:razorpay', note: `Amount mismatch: captured ${p.amount}, expected ${order.totalPaise}` },
          });
        } else {
          await confirmOrder(order.id, { actor: 'webhook:razorpay', razorpayPaymentId: p.id });
        }
      }
    } else if (evt.event === 'payment.failed' && evt.payload.payment) {
      const p = evt.payload.payment.entity;
      const order = await db.order.findUnique({ where: { razorpayOrderId: p.order_id } });
      // The buyer can retry inside the same checkout, so only log; the 15-minute
      // reservation expiry (or closing the window) releases the stock.
      if (order)
        await db.orderEvent.create({
          data: { orderId: order.id, status: order.status, actor: 'webhook:razorpay', note: `Payment attempt failed: ${p.error_description ?? 'unknown reason'}` },
        });
    } else if (evt.event === 'refund.processed' && evt.payload.refund) {
      const r = evt.payload.refund.entity;
      const order = await db.order.findFirst({ where: { razorpayPaymentId: r.payment_id } });
      if (order) {
        const full = r.amount >= order.totalPaise;
        await db.order.update({
          where: { id: order.id },
          data: { paymentStatus: full ? 'REFUNDED' : order.paymentStatus, status: full && ['CANCELLED', 'RETURNED'].includes(order.status) ? 'REFUNDED' : order.status },
        });
        await db.orderEvent.create({
          data: { orderId: order.id, status: full ? 'REFUNDED' : order.status, actor: 'webhook:razorpay', note: `Refund ${r.id} processed (${r.amount} paise)` },
        });
      }
    }
  } catch (e) {
    console.error('[webhook:razorpay] failed', e);
    if (eventId) await db.webhookEvent.deleteMany({ where: { source: 'razorpay', eventId } });
    return error('Processing failed', 500);
  }
  return json({ ok: true });
}
