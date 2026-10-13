import 'server-only';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { evaluateCoupon } from '@/lib/coupons';
import { financialYear, formatInvoiceNumber } from '@/lib/gst';
import type { OrderStatus, PaymentMethod, Prisma } from '@/lib/generated/prisma/client';
import { shipping } from '@/lib/integrations/shiprocket';
import { enqueueOrderNotification } from '@/lib/notifications';
import { computeTotals, isCodAllowed } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';

export const RESERVATION_MINUTES = 15;

type Tx = Prisma.TransactionClient;

/** Atomically increment a named counter (INSERT … ON CONFLICT DO UPDATE). */
async function nextCounter(tx: Tx, key: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" (key, value, "updatedAt") VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET value = "Counter".value + 1, "updatedAt" = now()
    RETURNING value`;
  return Number(rows[0].value);
}

export async function nextOrderNumber(tx: Tx, date = new Date()) {
  const year = date.getFullYear();
  const n = await nextCounter(tx, `order:${year}`);
  return `WS-${year}-${String(n).padStart(6, '0')}`;
}

// ───────────────────────── Status machine ─────────────────────────

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: ['REFUNDED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return TRANSITIONS[from].includes(to);
}

export async function transitionOrder(orderId: string, to: OrderStatus, actor: string, note?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.status === to) return order;
  if (!canTransition(order.status, to)) throw new Error(`Cannot move order from ${order.status} to ${to}`);
  const updated = await db.$transaction(async (tx) => {
    const o = await tx.order.update({ where: { id: orderId }, data: { status: to } });
    await tx.orderEvent.create({ data: { orderId, status: to, actor, note } });
    if (to === 'CANCELLED') await restockOrder(tx, orderId, order.status);
    return o;
  });
  const notify: Partial<Record<OrderStatus, Parameters<typeof enqueueOrderNotification>[1]>> = {
    SHIPPED: 'shipped',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  };
  if (notify[to]) await enqueueOrderNotification(orderId, notify[to]!);
  return updated;
}

/** Put stock back when a confirmed order is cancelled before shipping. */
async function restockOrder(tx: Tx, orderId: string, from: OrderStatus) {
  if (from === 'PENDING_PAYMENT') {
    await releaseReservations(tx, orderId);
    return;
  }
  if (from === 'CONFIRMED' || from === 'PACKED') {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const i of items) if (i.variantId) await tx.variant.update({ where: { id: i.variantId }, data: { stock: { increment: i.qty } } });
  }
}

// ───────────────────────── Reservations ─────────────────────────

async function reserve(tx: Tx, variantId: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRaw`
    UPDATE "Variant" SET reserved = reserved + ${qty}, "updatedAt" = now()
    WHERE id = ${variantId} AND stock - reserved >= ${qty}`;
  return n === 1;
}

async function releaseReservations(tx: Tx, orderId: string) {
  const open = await tx.stockReservation.findMany({ where: { orderId, releasedAt: null } });
  for (const r of open) {
    await tx.$executeRaw`UPDATE "Variant" SET reserved = GREATEST(reserved - ${r.qty}, 0), "updatedAt" = now() WHERE id = ${r.variantId}`;
    await tx.stockReservation.update({ where: { id: r.id }, data: { releasedAt: new Date() } });
  }
}

/** Convert open reservations into a stock decrement (payment succeeded). */
async function commitReservations(tx: Tx, orderId: string) {
  const open = await tx.stockReservation.findMany({ where: { orderId, releasedAt: null } });
  for (const r of open) {
    await tx.$executeRaw`UPDATE "Variant" SET reserved = GREATEST(reserved - ${r.qty}, 0), stock = stock - ${r.qty}, "updatedAt" = now() WHERE id = ${r.variantId}`;
    await tx.stockReservation.update({ where: { id: r.id }, data: { releasedAt: new Date() } });
  }
  return open.length;
}

// ───────────────────────── Create ─────────────────────────

export type OrderLineInput = { variantId: string; qty: number };

export type CreateOrderInput = {
  userId: string | null;
  lines: OrderLineInput[];
  couponCode: string | null;
  giftWrap: boolean;
  giftNote: string | null;
  contactPhone: string;
  contactEmail: string | null;
  whatsappOptIn: boolean;
  address: { name: string; phone: string; line1: string; line2?: string | null; landmark?: string | null; city: string; state: string; pincode: string };
  gstin: string | null;
  businessName: string | null;
  paymentMethod: PaymentMethod;
};

export class CheckoutError extends Error {}

/**
 * Re-prices everything from the database, validates COD, reserves stock for
 * 15 minutes (prepaid) or commits it (COD), and creates the order.
 */
export async function createOrder(input: CreateOrderInput) {
  const settings = await getSettings();
  if (!input.lines.length) throw new CheckoutError('Your cart is empty.');

  const variants = await db.variant.findMany({
    where: { id: { in: input.lines.map((l) => l.variantId) } },
    include: { product: { include: { brand: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  for (const l of input.lines) {
    const v = byId.get(l.variantId);
    if (!v || !v.product.isActive) throw new CheckoutError('An item in your cart is no longer available.');
    if (v.stock - v.reserved < l.qty) throw new CheckoutError(`Sorry, only ${Math.max(0, v.stock - v.reserved)} of ${v.product.name} left.`);
  }

  const pricingLines = input.lines.map((l) => ({ unitPricePaise: byId.get(l.variantId)!.pricePaise, qty: l.qty }));
  const subtotal = pricingLines.reduce((a, l) => a + l.unitPricePaise * l.qty, 0);
  let discountPaise = 0;
  let couponId: string | null = null;
  if (input.couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: input.couponCode } });
    const res = evaluateCoupon(coupon, subtotal);
    if (res.ok && coupon) {
      discountPaise = res.discountPaise;
      couponId = coupon.id;
    }
  }
  const isCod = input.paymentMethod === 'COD';
  const totals = computeTotals(pricingLines, settings, { discountPaise, giftWrap: input.giftWrap, cod: isCod });

  if (isCod) {
    const svc = await shipping.serviceability(input.address.pincode).catch(() => null);
    if (!isCodAllowed(totals.totalPaise, settings.codLimitPaise, Boolean(svc?.serviceable && svc.cod))) {
      throw new CheckoutError('Cash on delivery is not available for this order. Please choose another payment method.');
    }
  }

  const accessToken = crypto.randomBytes(24).toString('base64url');
  const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

  const order = await db.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx);
    const created = await tx.order.create({
      data: {
        number,
        userId: input.userId,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        whatsappOptIn: input.whatsappOptIn,
        shippingAddress: input.address,
        gstin: input.gstin,
        businessName: input.businessName,
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        shippingPaise: totals.shippingPaise,
        codFeePaise: totals.codFeePaise,
        giftWrapPaise: totals.giftWrapPaise,
        totalPaise: totals.totalPaise,
        giftNote: input.giftWrap ? input.giftNote : null,
        couponId,
        paymentMethod: input.paymentMethod,
        paymentStatus: isCod ? 'COD_PENDING' : 'PENDING',
        status: 'PENDING_PAYMENT',
        accessToken,
        reservedUntil: isCod ? null : reservedUntil,
        items: {
          create: input.lines.map((l) => {
            const v = byId.get(l.variantId)!;
            return {
              variantId: v.id,
              productId: v.productId,
              productName: v.product.name,
              variantLabel: v.label,
              sku: v.sku,
              brandName: v.product.brand.name,
              pricePaise: v.pricePaise,
              gstRate: v.product.gstRate,
              hsnCode: v.product.hsnCode,
              qty: l.qty,
              warrantyMonths: v.product.warrantyMonths,
            };
          }),
        },
        events: { create: { status: 'PENDING_PAYMENT', actor: input.userId ?? 'guest', note: `Order placed (${input.paymentMethod})` } },
      },
    });
    for (const l of input.lines) {
      const ok = await reserve(tx, l.variantId, l.qty);
      if (!ok) throw new CheckoutError('Some items just sold out. Please review your cart.');
      await tx.stockReservation.create({ data: { orderId: created.id, variantId: l.variantId, qty: l.qty, expiresAt: reservedUntil } });
    }
    return created;
  });

  if (isCod) await confirmOrder(order.id, { actor: 'system', note: 'Cash on delivery order confirmed' });
  return order;
}

// ───────────────────────── Confirm / fail ─────────────────────────

/**
 * Idempotent: safe to call from the client verify step and the Razorpay
 * webhook. Returns true if this call moved the order to CONFIRMED.
 */
export async function confirmOrder(orderId: string, opts: { actor: string; razorpayPaymentId?: string; note?: string }): Promise<boolean> {
  const confirmed = await db.$transaction(async (tx) => {
    // Lock the row so concurrent webhook + verify calls serialise.
    const rows = await tx.$queryRaw<{ status: OrderStatus; paymentMethod: PaymentMethod }[]>`SELECT status, "paymentMethod" FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const row = rows[0];
    if (!row) throw new Error('Order not found');
    if (row.status !== 'PENDING_PAYMENT' && row.status !== 'CANCELLED') return false;
    const isCod = row.paymentMethod === 'COD';

    if (row.status === 'CANCELLED') {
      // Payment captured after the reservation expired: re-reserve if we still can.
      if (isCod) return false;
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const i of items) {
        if (!i.variantId || !(await reserve(tx, i.variantId, i.qty))) {
          await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID', razorpayPaymentId: opts.razorpayPaymentId } });
          await tx.orderEvent.create({
            data: { orderId, status: 'CANCELLED', actor: opts.actor, note: 'Payment received after stock was released and item is unavailable: refund required.' },
          });
          return false;
        }
        await tx.stockReservation.create({ data: { orderId, variantId: i.variantId, qty: i.qty, expiresAt: new Date() } });
      }
    }

    await commitReservations(tx, orderId);
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: isCod ? 'COD_PENDING' : 'PAID',
        razorpayPaymentId: opts.razorpayPaymentId ?? undefined,
        reservedUntil: null,
      },
    });
    await tx.orderEvent.create({ data: { orderId, status: 'CONFIRMED', actor: opts.actor, note: opts.note ?? 'Payment captured' } });
    if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });

    const fy = financialYear(order.createdAt);
    const seq = await nextCounter(tx, `invoice:${fy}`);
    await tx.invoice.create({ data: { orderId, financialYear: fy, sequence: seq, number: formatInvoiceNumber(fy, seq) } });

    // Empty the buyer's cart of the purchased items.
    const variantIds = (await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true } })).map((i) => i.variantId).filter((v): v is string => Boolean(v));
    if (order.userId) await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId }, variantId: { in: variantIds } } });
    return true;
  });
  if (confirmed) await enqueueOrderNotification(orderId, 'confirmed');
  return confirmed;
}

export async function failOrder(orderId: string, actor: string, note: string) {
  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ status: OrderStatus }[]>`SELECT status FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    if (rows[0]?.status !== 'PENDING_PAYMENT') return;
    await releaseReservations(tx, orderId);
    await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', paymentStatus: 'FAILED', reservedUntil: null } });
    await tx.orderEvent.create({ data: { orderId, status: 'CANCELLED', actor, note } });
  });
}

/** Cron: release stock held by unpaid orders past their 15-minute window. */
export async function releaseExpiredReservations() {
  const expired = await db.order.findMany({ where: { status: 'PENDING_PAYMENT', reservedUntil: { lt: new Date() } }, select: { id: true }, take: 200 });
  for (const o of expired) await failOrder(o.id, 'cron', 'Payment not completed within 15 minutes; stock released');
  return expired.length;
}

/** The buyer can view an order with its access token, or as the signed-in owner. */
export async function getOrderForViewer(orderNumberOrId: string, opts: { token?: string | null; userId?: string | null; isStaff?: boolean }) {
  const order = await db.order.findFirst({
    where: { OR: [{ id: orderNumberOrId }, { number: orderNumberOrId }] },
    include: { items: { include: { warranty: true } }, invoice: true, shipment: true, events: { orderBy: { createdAt: 'asc' } }, returns: true },
  });
  if (!order) return null;
  const tokenOk = opts.token && order.accessToken.length === opts.token.length && crypto.timingSafeEqual(Buffer.from(order.accessToken), Buffer.from(opts.token));
  if (tokenOk || (opts.userId && order.userId === opts.userId) || opts.isStaff) return order;
  return null;
}

export type ViewerOrder = NonNullable<Awaited<ReturnType<typeof getOrderForViewer>>>;
