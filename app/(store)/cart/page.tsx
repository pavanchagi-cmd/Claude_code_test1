import type { Metadata } from 'next';
import Link from 'next/link';
import { AddButton } from '@/components/cart/add-button';
import { CartView, type CartLine } from '@/components/cart/cart-view';
import { ProductImage } from '@/components/product/product-image';
import { accessories } from '@/lib/catalog';
import { available, findCart, priceCart } from '@/lib/cart';
import { formatPaise } from '@/lib/money';
import { amountOr, getSettings } from '@/lib/settings';
import { configured } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your cart', robots: { index: false, follow: false } };

function deliveryDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default async function CartPage() {
  const [cart, settings, extras] = await Promise.all([findCart(), getSettings(), accessories(4)]);
  const priced = await priceCart(cart);
  const t = priced.totals;

  const lines: CartLine[] = (cart?.items ?? []).map((i) => {
    const p = i.variant.product;
    const detail = [p.caseSizeMm ? `${Number(p.caseSizeMm)} mm` : null, p.dialColour ? `${p.dialColour} dial` : null, i.variant.label].filter(Boolean).join(' · ');
    return {
      id: i.id,
      productId: p.id,
      slug: p.slug,
      brand: p.brand.name,
      name: p.name,
      detail,
      qty: i.qty,
      max: Math.min(10, available(i.variant)),
      unitPricePaise: i.variant.pricePaise,
      image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
      art: p.artDial ? { strap: p.artStrap ?? '#A9A59C', case: p.artCase ?? '#CFCBC2', dial: p.artDial } : null,
      deliveryLabel: `Delivery by ${deliveryDate(4)}`,
    };
  });

  const inCart = new Set(lines.map((l) => l.productId));
  const look = extras.filter((e) => !inCart.has(e.id));

  const subtitle =
    t.itemCount === 0
      ? ''
      : `${t.itemCount} item${t.itemCount === 1 ? '' : 's'} · ${
          t.freeShippingRemainingPaise > 0 ? `You’re ${formatPaise(t.freeShippingRemainingPaise)} away from free insured shipping` : 'Free insured shipping on this order'
        }`;

  return (
    <div className="container-site pt-12 pb-[72px]">
      <h1 className="h1-page">Your cart</h1>
      {subtitle && <p className="mt-3 text-[17px] text-muted">{subtitle}</p>}
      <CartView
        key={cart?.updatedAt.toISOString() ?? 'empty'}
        lines={lines}
        totals={t}
        giftWrap={cart?.giftWrap ?? false}
        giftNote={cart?.giftNote ?? ''}
        giftWrapLabel={amountOr(settings.giftWrapPaise)}
        coupon={priced.coupon}
        gatewayLabel={configured.razorpay ? 'Razorpay' : '[PAYMENT GATEWAY]'}
        returnDaysLabel={settings.returnWindowDays > 0 ? String(settings.returnWindowDays) : '[X]'}
      />
      {lines.length > 0 && look.length > 0 && (
        <section className="mt-12 lg:max-w-[calc(100%-422px)]" aria-labelledby="look-heading">
          <h2 id="look-heading" className="h2-section">
            Complete the look
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {look.map((a) => (
              <li key={a.id} className="card flex flex-col">
                <Link href={`/watch/${a.slug}`} className="relative block aspect-[190/140] bg-stone">
                  <ProductImage url={a.images[0]?.url} alt={a.name} art={a.art} sizes="190px" />
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/watch/${a.slug}`} className="text-[16px] font-medium hover:text-brass">
                    {a.name}
                  </Link>
                  <p className="mt-1 text-[15px]">{formatPaise(a.pricePaise)}</p>
                  <div className="mt-auto pt-3">{a.defaultVariantId && <AddButton variantId={a.defaultVariantId} />}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
