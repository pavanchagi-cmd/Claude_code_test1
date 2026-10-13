import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { evaluateCoupon } from '@/lib/coupons';
import { computeTotals, type Totals } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';
import { currentUser } from '@/lib/auth';

export const CART_COOKIE = 'cart_token';
const CART_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: true,
              images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
            },
          },
        },
      },
    },
  },
} as const;

async function readToken() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

async function writeToken(token: string) {
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_MAX_AGE,
  });
}

/** Find the visitor's cart: the signed-in user's cart, else the cookie cart. */
export async function findCart() {
  const user = await currentUser();
  if (user) {
    const owned = await db.cart.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, include: cartInclude });
    if (owned) return owned;
  }
  const token = await readToken();
  if (!token) return null;
  const cart = await db.cart.findUnique({ where: { cartToken: token }, include: cartInclude });
  if (cart && user && !cart.userId) {
    return db.cart.update({ where: { id: cart.id }, data: { userId: user.id }, include: cartInclude });
  }
  return cart;
}

export async function getOrCreateCart() {
  const existing = await findCart();
  if (existing) return existing;
  const user = await currentUser();
  const token = crypto.randomBytes(24).toString('hex');
  const cart = await db.cart.create({ data: { cartToken: token, userId: user?.id ?? null }, include: cartInclude });
  await writeToken(token);
  return cart;
}

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof findCart>>>;

export function available(variant: { stock: number; reserved: number }) {
  return Math.max(0, variant.stock - variant.reserved);
}

export async function addToCart(variantId: string, qty: number) {
  const variant = await db.variant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || !variant.product.isActive) return { ok: false as const, error: 'This item is no longer available.' };
  const cart = await getOrCreateCart();
  const existing = cart.items.find((i) => i.variantId === variantId);
  const want = (existing?.qty ?? 0) + qty;
  const cap = available(variant);
  if (cap <= 0) return { ok: false as const, error: 'Sorry, this item is out of stock.' };
  const finalQty = Math.min(want, cap, 10);
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, qty: finalQty },
    update: { qty: finalQty },
  });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date(), reminderSentAt: null } });
  return { ok: true as const, capped: finalQty < want };
}

export async function setQty(itemId: string, qty: number) {
  const cart = await findCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) return { ok: false as const, error: 'Item not found.' };
  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return { ok: true as const };
  }
  const cap = Math.min(available(item.variant), 10);
  await db.cartItem.update({ where: { id: itemId }, data: { qty: Math.min(qty, cap) } });
  return { ok: true as const, capped: qty > cap };
}

/** Merge the guest cookie cart into the user's cart after sign-in. */
export async function mergeGuestCart(userId: string) {
  const token = await readToken();
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { cartToken: token }, include: { items: true } });
  if (!guest || guest.userId === userId) {
    if (guest && !guest.userId) await db.cart.update({ where: { id: guest.id }, data: { userId } });
    return;
  }
  const userCart = await db.cart.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' }, include: { items: true } });
  if (!userCart) {
    await db.cart.update({ where: { id: guest.id }, data: { userId } });
    return;
  }
  for (const item of guest.items) {
    const existing = userCart.items.find((i) => i.variantId === item.variantId);
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
      create: { cartId: userCart.id, variantId: item.variantId, qty: item.qty },
      update: { qty: Math.min(10, Math.max(existing?.qty ?? 0, item.qty)) },
    });
  }
  await db.cart.update({
    where: { id: userCart.id },
    data: { giftWrap: userCart.giftWrap || guest.giftWrap, giftNote: userCart.giftNote ?? guest.giftNote, couponCode: userCart.couponCode ?? guest.couponCode },
  });
  await db.cart.delete({ where: { id: guest.id } });
  await writeToken(userCart.cartToken);
}

export type PricedCart = {
  cart: CartWithItems | null;
  totals: Totals;
  coupon: { code: string; ok: boolean; message?: string } | null;
};

/** Re-price the cart from the database (never trust client totals). */
export async function priceCart(cart: CartWithItems | null, opts: { cod?: boolean } = {}): Promise<PricedCart> {
  const settings = await getSettings();
  const lines = (cart?.items ?? []).map((i) => ({ unitPricePaise: i.variant.pricePaise, qty: i.qty }));
  const subtotal = lines.reduce((a, l) => a + l.unitPricePaise * l.qty, 0);
  let discountPaise = 0;
  let coupon: PricedCart['coupon'] = null;
  if (cart?.couponCode) {
    const row = await db.coupon.findUnique({ where: { code: cart.couponCode } });
    const res = evaluateCoupon(row, subtotal);
    if (res.ok) discountPaise = res.discountPaise;
    coupon = { code: cart.couponCode, ok: res.ok, message: res.ok ? undefined : res.reason };
  }
  const totals = computeTotals(lines, settings, { discountPaise, giftWrap: cart?.giftWrap, cod: opts.cod });
  return { cart, totals, coupon };
}

export async function cartCount(): Promise<number> {
  const cart = await findCart();
  return cart?.items.reduce((a, i) => a + i.qty, 0) ?? 0;
}
