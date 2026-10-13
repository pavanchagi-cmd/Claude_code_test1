import 'server-only';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { configured } from '@/lib/env';

export type RazorpayOrder = { id: string; amount: number; currency: 'INR' };

export interface PaymentsProvider {
  readonly mock: boolean;
  /** Publishable key for the browser checkout widget. */
  readonly keyId: string;
  createOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }): Promise<RazorpayOrder>;
  verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  refund(input: { paymentId: string; amountPaise: number; notes?: Record<string, string> }): Promise<{ id: string; status: string }>;
}

export function hmacSha256(secret: string, payload: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

class RazorpayLive implements PaymentsProvider {
  readonly mock = false;
  readonly keyId = process.env.RAZORPAY_KEY_ID!;
  private secret = process.env.RAZORPAY_KEY_SECRET!;
  private client = new Razorpay({ key_id: this.keyId, key_secret: this.secret });

  async createOrder({ amountPaise, receipt, notes }: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
    const order = await this.client.orders.create({ amount: amountPaise, currency: 'INR', receipt, notes });
    return { id: order.id, amount: Number(order.amount), currency: 'INR' as const };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) {
    return safeEqual(hmacSha256(this.secret, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string | null) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    return safeEqual(hmacSha256(secret, rawBody), signature);
  }

  async refund({ paymentId, amountPaise, notes }: { paymentId: string; amountPaise: number; notes?: Record<string, string> }) {
    const r = await this.client.payments.refund(paymentId, { amount: amountPaise, notes });
    return { id: r.id, status: String(r.status) };
  }
}

/** Mock used when keys are missing: signatures use a fixed local secret. */
export const MOCK_RAZORPAY_SECRET = 'mock_razorpay_secret';

class RazorpayMock implements PaymentsProvider {
  readonly mock = true;
  readonly keyId = 'rzp_test_mock';

  async createOrder({ amountPaise }: { amountPaise: number; receipt: string }) {
    return { id: `order_mock_${crypto.randomBytes(8).toString('hex')}`, amount: amountPaise, currency: 'INR' as const };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) {
    return safeEqual(hmacSha256(MOCK_RAZORPAY_SECRET, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string | null) {
    if (!signature) return false;
    return safeEqual(hmacSha256(process.env.RAZORPAY_WEBHOOK_SECRET || MOCK_RAZORPAY_SECRET, rawBody), signature);
  }

  async refund({ paymentId }: { paymentId: string; amountPaise: number }) {
    console.info('[razorpay:mock] refund', paymentId);
    return { id: `rfnd_mock_${crypto.randomBytes(6).toString('hex')}`, status: 'processed' };
  }
}

export const payments: PaymentsProvider = configured.razorpay ? new RazorpayLive() : new RazorpayMock();
