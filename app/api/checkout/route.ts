import { currentUser } from '@/lib/auth';
import { findCart } from '@/lib/cart';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { isProd } from '@/lib/env';
import { payments } from '@/lib/integrations/razorpay';
import { CheckoutError, createOrder } from '@/lib/orders';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';
import { checkoutSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

const RZP_METHOD: Record<string, string> = { UPI: 'upi', CARD: 'card', EMI: 'emi', NETBANKING: 'netbanking' };

export async function POST(req: Request) {
  if (!(await rateLimit(`checkout:${await clientIp()}`, 20, 600))) return error('Too many attempts. Please wait a few minutes.', 429);
  const [body, err] = await parseBody(req, checkoutSchema);
  if (err) return err;
  if (isProd && payments.mock && body.paymentMethod !== 'COD') return error('Online payments are not available right now. Please choose cash on delivery or try again later.', 503);
  const user = await currentUser();

  // Lines come from the server-side cart (or the single "Buy now" variant), never the client.
  let lines: { variantId: string; qty: number }[] = [];
  let couponCode: string | null = null;
  let giftWrap = false;
  let giftNote: string | null = null;
  if (body.buyNowVariantId) {
    lines = [{ variantId: body.buyNowVariantId, qty: 1 }];
  } else {
    const cart = await findCart();
    lines = (cart?.items ?? []).map((i) => ({ variantId: i.variantId, qty: i.qty }));
    couponCode = cart?.couponCode ?? null;
    giftWrap = cart?.giftWrap ?? false;
    giftNote = cart?.giftNote ?? null;
  }

  let address = { ...body.address, landmark: body.address.landmark || null, phone: body.phone };
  if (user && body.savedAddressId) {
    const saved = await db.address.findFirst({ where: { id: body.savedAddressId, userId: user.id } });
    if (saved)
      address = {
        name: saved.name,
        phone: saved.phone,
        line1: saved.line1,
        line2: saved.line2 ?? '',
        landmark: saved.landmark,
        city: saved.city,
        state: saved.state,
        pincode: saved.pincode,
      };
  }

  try {
    const order = await createOrder({
      userId: user?.id ?? null,
      lines,
      couponCode,
      giftWrap,
      giftNote,
      contactPhone: body.phone,
      contactEmail: body.email || null,
      whatsappOptIn: body.whatsappOptIn,
      address,
      gstin: body.gstInvoice ? body.gstin || null : null,
      businessName: body.gstInvoice ? body.businessName || null : null,
      paymentMethod: body.paymentMethod,
    });

    if (user && body.saveAddress && !body.savedAddressId) {
      const count = await db.address.count({ where: { userId: user.id } });
      await db.address.create({ data: { userId: user.id, ...address, line2: address.line2 || null, isDefault: count === 0 } });
    }
    if (user && body.email) {
      await db.user.updateMany({ where: { id: user.id, email: null }, data: { email: body.email } }).catch(() => {});
    }

    if (body.paymentMethod === 'COD') {
      return json({ orderId: order.id, orderNumber: order.number, token: order.accessToken });
    }

    const settings = await getSettings();
    const rzp = await payments.createOrder({ amountPaise: order.totalPaise, receipt: order.number, notes: { orderId: order.id, orderNumber: order.number } });
    await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id } });
    return json({
      orderId: order.id,
      orderNumber: order.number,
      token: order.accessToken,
      razorpay: {
        keyId: payments.keyId,
        orderId: rzp.id,
        amount: rzp.amount,
        mock: payments.mock,
        name: settings.brandName,
        prefill: { contact: `+91${body.phone}`, email: body.email || undefined, name: address.name, method: RZP_METHOD[body.paymentMethod] },
      },
    });
  } catch (e) {
    if (e instanceof CheckoutError) return error(e.message, 409);
    console.error('[checkout] failed', e);
    return error('We could not place your order. Please try again.', 500);
  }
}
