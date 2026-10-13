import { addToCart, cartCount, findCart, priceCart, setQty } from '@/lib/cart';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { addToCartSchema, cartOptionsSchema, updateCartSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cart = await findCart();
  const priced = await priceCart(cart);
  return json({ totals: priced.totals, coupon: priced.coupon, itemCount: priced.totals.itemCount });
}

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, addToCartSchema);
  if (err) return err;
  const res = await addToCart(body.variantId, body.qty);
  if (!res.ok) return error(res.error, 409);
  return json({ ok: true, capped: res.capped, cartCount: await cartCount() });
}

export async function PATCH(req: Request) {
  const [body, err] = await parseBody(req, updateCartSchema);
  if (err) return err;
  const res = await setQty(body.itemId, body.qty);
  if (!res.ok) return error(res.error, 404);
  return json({ ok: true, capped: 'capped' in res ? res.capped : false, cartCount: await cartCount() });
}

/** Gift wrap, gift note and coupon. Coupon is validated server-side. */
export async function PUT(req: Request) {
  const [body, err] = await parseBody(req, cartOptionsSchema);
  if (err) return err;
  const cart = await findCart();
  if (!cart) return error('Your cart is empty.', 404);
  if (body.couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: body.couponCode } });
    const priced = await priceCart({ ...cart, couponCode: body.couponCode });
    if (!coupon || !priced.coupon?.ok) return error(priced.coupon?.message ?? 'This code is not valid.', 422);
  }
  await db.cart.update({
    where: { id: cart.id },
    data: {
      giftWrap: body.giftWrap ?? undefined,
      giftNote: body.giftNote === undefined ? undefined : body.giftNote,
      couponCode: body.couponCode === undefined ? undefined : body.couponCode || null,
    },
  });
  return json({ ok: true });
}
