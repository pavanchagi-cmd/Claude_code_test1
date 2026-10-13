import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckoutForm, type CheckoutItem } from '@/components/checkout/checkout-form';
import { currentUser } from '@/lib/auth';
import { findCart, priceCart } from '@/lib/cart';
import { db } from '@/lib/db';
import { computeTotals } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';
import { payments } from '@/lib/integrations/razorpay';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ buy?: string }> };

export default async function CheckoutPage({ searchParams }: Props) {
  const { buy } = await searchParams;
  const [user, settings] = await Promise.all([currentUser(), getSettings()]);

  let items: CheckoutItem[] = [];
  let totals;
  let couponCode: string | null = null;
  let giftWrap = false;

  if (buy) {
    // "Buy now": checkout with only this item.
    const v = await db.variant.findUnique({ where: { id: buy }, include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } } } });
    if (v && v.product.isActive && v.stock - v.reserved > 0) {
      items = [
        {
          name: v.product.name,
          detail: v.label,
          qty: 1,
          pricePaise: v.pricePaise,
          image: v.product.images[0]?.url ?? null,
          art: v.product.artDial ? { strap: v.product.artStrap ?? '#A9A59C', case: v.product.artCase ?? '#CFCBC2', dial: v.product.artDial } : null,
        },
      ];
      totals = computeTotals([{ unitPricePaise: v.pricePaise, qty: 1 }], settings);
    }
  } else {
    const cart = await findCart();
    const priced = await priceCart(cart);
    totals = priced.totals;
    couponCode = priced.coupon?.ok ? priced.coupon.code : null;
    giftWrap = cart?.giftWrap ?? false;
    items = (cart?.items ?? []).map((i) => ({
      name: i.variant.product.name,
      detail: i.variant.label,
      qty: i.qty,
      pricePaise: i.variant.pricePaise,
      image: i.variant.product.images[0]?.url ?? null,
      art: i.variant.product.artDial ? { strap: i.variant.product.artStrap ?? '#A9A59C', case: i.variant.product.artCase ?? '#CFCBC2', dial: i.variant.product.artDial } : null,
    }));
  }

  if (!items.length || !totals) {
    return (
      <div className="container-narrow py-[88px] text-center">
        <h1 className="h1-page">Nothing to check out</h1>
        <p className="mt-3 text-muted">Your cart is empty or the item is no longer available.</p>
        <Link href="/watches" className="btn btn-primary btn-lg mt-8">
          Shop watches
        </Link>
      </div>
    );
  }

  const addresses = user ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }) : [];
  const profile = user ? await db.user.findUnique({ where: { id: user.id }, select: { phone: true, email: true, name: true } }) : null;

  return (
    <div className="container-narrow pt-8 pb-[88px]">
      <ol className="flex gap-6 text-[15.5px] text-muted" aria-label="Checkout progress">
        <li>
          <Link href="/cart" className="hover:text-ink">
            1 · Cart
          </Link>
        </li>
        <li aria-current="step" className="border-b-2 border-brass pb-1 font-semibold text-ink">
          2 · Details &amp; payment
        </li>
        <li>3 · Confirmation</li>
      </ol>
      <CheckoutForm
        items={items}
        totals={totals}
        couponCode={couponCode}
        giftWrap={giftWrap}
        buyNowVariantId={buy ?? null}
        signedIn={Boolean(user)}
        defaults={{ phone: profile?.phone ?? '', email: profile?.email ?? '', name: profile?.name ?? '' }}
        addresses={addresses.map((a) => ({
          id: a.id,
          name: a.name,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2 ?? '',
          landmark: a.landmark ?? '',
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          isDefault: a.isDefault,
        }))}
        cod={{ limitPaise: settings.codLimitPaise, feePaise: settings.codFeePaise }}
        razorpayMock={payments.mock}
      />
    </div>
  );
}
