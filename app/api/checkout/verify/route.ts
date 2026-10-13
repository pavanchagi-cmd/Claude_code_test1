import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { MOCK_RAZORPAY_SECRET, hmacSha256, payments } from '@/lib/integrations/razorpay';
import { isProd } from '@/lib/env';
import { confirmOrder, getOrderForViewer } from '@/lib/orders';

const schema = z.union([
  z.object({
    orderId: z.string().min(1).max(40),
    token: z.string().min(10).max(100),
    razorpay_order_id: z.string().min(1).max(60),
    razorpay_payment_id: z.string().min(1).max(60),
    razorpay_signature: z.string().min(1).max(200),
  }),
  z.object({ orderId: z.string().min(1).max(40), token: z.string().min(10).max(100), mock: z.literal(true), outcome: z.enum(['success', 'failure']) }),
]);

/** Verify razorpay_signature (HMAC SHA256) server-side before marking the order paid. */
export async function POST(req: Request) {
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  const order = await getOrderForViewer(body.orderId, { token: body.token });
  if (!order || !order.razorpayOrderId) return error('Order not found.', 404);

  let paymentId: string;
  let signature: string;
  if ('mock' in body) {
    if (!payments.mock || isProd) return error('Mock payments are disabled.', 403);
    if (body.outcome !== 'success') return error('Payment failed.', 402);
    paymentId = `pay_mock_${crypto.randomBytes(8).toString('hex')}`;
    signature = hmacSha256(MOCK_RAZORPAY_SECRET, `${order.razorpayOrderId}|${paymentId}`);
  } else {
    if (body.razorpay_order_id !== order.razorpayOrderId) return error('Payment does not match this order.', 400);
    paymentId = body.razorpay_payment_id;
    signature = body.razorpay_signature;
  }

  if (!payments.verifyPaymentSignature({ orderId: order.razorpayOrderId, paymentId, signature })) {
    await db.orderEvent.create({ data: { orderId: order.id, status: order.status, actor: 'verify', note: 'Invalid payment signature' } });
    return error('Payment could not be verified.', 400);
  }

  await confirmOrder(order.id, { actor: 'checkout:verify', razorpayPaymentId: paymentId });
  const fresh = await db.order.findUnique({ where: { id: order.id }, select: { status: true } });
  return json({ ok: fresh?.status === 'CONFIRMED', status: fresh?.status });
}
