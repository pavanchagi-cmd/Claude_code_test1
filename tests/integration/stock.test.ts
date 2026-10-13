import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { confirmOrder, createOrder, failOrder, releaseExpiredReservations, CheckoutError } from '@/lib/orders';

// Runs against the database in DATABASE_URL (CI uses a throwaway Postgres).
const run = process.env.DATABASE_URL ? describe : describe.skip;

const SKU = `TEST-STOCK-${Date.now()}`;
let variantId = '';
let productId = '';

const baseInput = {
  userId: null,
  couponCode: null,
  giftWrap: false,
  giftNote: null,
  contactPhone: '9000000001',
  contactEmail: null,
  whatsappOptIn: false,
  address: { name: 'Test Buyer', phone: '9000000001', line1: '1 Test Street', line2: 'Area', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  gstin: null,
  businessName: null,
};

run('stock reservation', () => {
  beforeAll(async () => {
    const brand = await db.brand.upsert({ where: { slug: 'test-brand' }, create: { name: 'Test brand', slug: 'test-brand' }, update: {} });
    const p = await db.product.create({
      data: { name: 'Stock test watch', slug: `stock-test-${Date.now()}`, brandId: brand.id, variants: { create: { sku: SKU, label: 'Std', pricePaise: 100000, stock: 2 } } },
      include: { variants: true },
    });
    productId = p.id;
    variantId = p.variants[0].id;
  });

  afterAll(async () => {
    await db.order.deleteMany({ where: { items: { some: { sku: SKU } } } });
    await db.product.delete({ where: { id: productId } });
  });

  const variant = () => db.variant.findUniqueOrThrow({ where: { id: variantId } });

  it('reserves stock for prepaid orders and blocks overselling', async () => {
    const order = await createOrder({ ...baseInput, lines: [{ variantId, qty: 2 }], paymentMethod: 'UPI' });
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.totalPaise).toBe(100000 * 2);
    expect(await variant()).toMatchObject({ stock: 2, reserved: 2 });
    await expect(createOrder({ ...baseInput, lines: [{ variantId, qty: 1 }], paymentMethod: 'UPI' })).rejects.toBeInstanceOf(CheckoutError);

    // Payment failed: reservation released.
    await failOrder(order.id, 'test', 'failed');
    expect(await variant()).toMatchObject({ stock: 2, reserved: 0 });
  });

  it('commits stock exactly once when payment is confirmed twice (verify + webhook)', async () => {
    const order = await createOrder({ ...baseInput, lines: [{ variantId, qty: 1 }], paymentMethod: 'CARD' });
    const [a, b] = await Promise.all([confirmOrder(order.id, { actor: 'verify' }), confirmOrder(order.id, { actor: 'webhook' })]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await variant()).toMatchObject({ stock: 1, reserved: 0 });
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { invoice: true } });
    expect(fresh.status).toBe('CONFIRMED');
    expect(fresh.paymentStatus).toBe('PAID');
    expect(fresh.invoice?.number).toMatch(/^INV\/\d{4}-\d{2}\/\d{5}$/);
  });

  it('releases reservations after 15 minutes', async () => {
    const order = await createOrder({ ...baseInput, lines: [{ variantId, qty: 1 }], paymentMethod: 'UPI' });
    expect(await variant()).toMatchObject({ stock: 1, reserved: 1 });
    await db.order.update({ where: { id: order.id }, data: { reservedUntil: new Date(Date.now() - 1000) } });
    expect(await releaseExpiredReservations()).toBeGreaterThanOrEqual(1);
    expect(await variant()).toMatchObject({ stock: 1, reserved: 0 });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CANCELLED');
  });

  it('re-reserves if payment arrives after expiry and stock is still available', async () => {
    const order = await createOrder({ ...baseInput, lines: [{ variantId, qty: 1 }], paymentMethod: 'UPI' });
    await failOrder(order.id, 'test', 'expired');
    expect(await confirmOrder(order.id, { actor: 'webhook', razorpayPaymentId: 'pay_late' })).toBe(true);
    expect(await variant()).toMatchObject({ stock: 0, reserved: 0 });
  });
});
