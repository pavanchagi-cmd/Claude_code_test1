'use client';

import { Check, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ProductImage, type Art } from '@/components/product/product-image';
import { useStore } from '@/components/store-provider';
import { formatPaise } from '@/lib/money';
import type { Totals } from '@/lib/pricing';

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  brand: string;
  name: string;
  detail: string;
  qty: number;
  max: number;
  unitPricePaise: number;
  image: { url: string; alt: string } | null;
  art: Art;
  deliveryLabel: string;
};

type Props = {
  lines: CartLine[];
  totals: Totals;
  giftWrap: boolean;
  giftNote: string;
  giftWrapLabel: string;
  coupon: { code: string; ok: boolean; message?: string } | null;
  gatewayLabel: string;
  returnDaysLabel: string;
};

async function call(method: string, body: unknown) {
  const res = await fetch('/api/cart', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json: json as { error?: string; cartCount?: number; capped?: boolean } };
}

export function CartView({ lines, totals, giftWrap, giftNote, giftWrapLabel, coupon, gatewayLabel, returnDaysLabel }: Props) {
  const router = useRouter();
  const { setCartCount, toggleWishlist, wishlist, toast } = useStore();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState(coupon?.code ?? '');
  const [couponMsg, setCouponMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(
    coupon ? (coupon.ok ? { tone: 'ok', text: `${coupon.code} applied` } : { tone: 'err', text: coupon.message ?? 'Code not valid' }) : null,
  );
  const [note, setNote] = useState(giftNote);

  const refresh = () => startTransition(() => router.refresh());

  const updateQty = async (line: CartLine, qty: number) => {
    const { ok, json } = await call('PATCH', { itemId: line.id, qty });
    if (!ok) return toast(json.error ?? 'Could not update the cart.', 'error');
    if (json.capped) toast(`Only ${line.max} available.`);
    if (typeof json.cartCount === 'number') setCartCount(json.cartCount);
    refresh();
  };

  const moveToWishlist = async (line: CartLine) => {
    if (!wishlist.has(line.productId)) await toggleWishlist(line.productId);
    await updateQty(line, 0);
  };

  const applyCoupon = async (value: string | null) => {
    const { ok, json } = await call('PUT', { couponCode: value });
    if (!ok) setCouponMsg({ tone: 'err', text: json.error ?? 'This code is not valid.' });
    else setCouponMsg(value ? { tone: 'ok', text: `${value.toUpperCase()} applied` } : null);
    refresh();
  };

  if (lines.length === 0) {
    return (
      <div className="card mt-8 p-12 text-center">
        <h2 className="font-display text-[30px]">Your cart is empty</h2>
        <p className="mt-2 text-muted">Find something worth wearing.</p>
        <Link href="/watches" className="btn btn-primary btn-lg mt-6">
          Shop watches
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_390px]" aria-busy={pending}>
      <div>
        <ul className="space-y-4" aria-live="polite">
          {lines.map((line) => (
            <li key={line.id} className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <Link href={`/watch/${line.slug}`} className="relative h-[128px] w-[128px] shrink-0 bg-stone">
                <ProductImage url={line.image?.url} alt={line.image?.alt ?? line.name} art={line.art} sizes="128px" artClassName="w-[60%]" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] tracking-[0.08em] text-muted uppercase">{line.brand}</p>
                <Link href={`/watch/${line.slug}`} className="mt-1 block font-display text-[24px] leading-tight hover:text-brass">
                  {line.name}
                </Link>
                <p className="mt-2 text-[14.5px] text-muted">{line.detail}</p>
                <p className="mt-1 text-[14.5px] font-semibold text-success">{line.deliveryLabel}</p>
              </div>
              <div className="flex items-center gap-6 sm:flex-col sm:items-end lg:flex-row lg:items-center">
                <div className="flex h-12 items-center border border-line-strong" role="group" aria-label={`Quantity for ${line.name}`}>
                  <button type="button" className="h-full w-11" aria-label="Decrease quantity" onClick={() => updateQty(line, line.qty - 1)} disabled={pending}>
                    <Minus size={16} strokeWidth={1.6} className="mx-auto" aria-hidden="true" />
                  </button>
                  <span className="w-10 text-center text-[16px]" aria-live="polite">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    className="h-full w-11 disabled:opacity-40"
                    aria-label="Increase quantity"
                    onClick={() => updateQty(line, line.qty + 1)}
                    disabled={pending || line.qty >= line.max}
                  >
                    <Plus size={16} strokeWidth={1.6} className="mx-auto" aria-hidden="true" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-[19px] font-semibold">{formatPaise(line.unitPricePaise * line.qty)}</p>
                  <div className="mt-2 flex gap-4 text-[14px]">
                    <button type="button" className="link" onClick={() => moveToWishlist(line)}>
                      Move to wishlist
                    </button>
                    <button type="button" className="link text-warning" onClick={() => updateQty(line, 0)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="card mt-4 p-5">
          <label className="flex cursor-pointer items-start gap-4">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5"
              checked={giftWrap}
              onChange={async (e) => {
                await call('PUT', { giftWrap: e.target.checked });
                refresh();
              }}
            />
            <span>
              <span className="block text-[16px] font-semibold">Add gift wrapping &amp; a personal note</span>
              <span className="block text-[14px] text-muted">Premium box, ribbon and handwritten card · {giftWrapLabel}</span>
            </span>
          </label>
          {giftWrap && (
            <div className="mt-4 pl-9">
              <label htmlFor="gift-note" className="label">
                Gift note (optional)
              </label>
              <textarea
                id="gift-note"
                maxLength={250}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => void call('PUT', { giftNote: note })}
                className="input min-h-[90px]"
                placeholder="Happy anniversary…"
              />
            </div>
          )}
        </div>
      </div>

      <aside className="card self-start p-6" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="font-sans text-[21px] font-semibold">
          Order summary
        </h2>
        <dl className="mt-4 space-y-2 text-[16px]">
          <div className="flex justify-between">
            <dt>
              Subtotal ({totals.itemCount} item{totals.itemCount === 1 ? '' : 's'})
            </dt>
            <dd>{formatPaise(totals.subtotalPaise)}</dd>
          </div>
          {totals.discountPaise > 0 && (
            <div className="flex justify-between text-success">
              <dt>Discount</dt>
              <dd>− {formatPaise(totals.discountPaise)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Shipping (insured)</dt>
            <dd>{totals.shippingPaise ? formatPaise(totals.shippingPaise) : 'Free'}</dd>
          </div>
          {totals.giftWrapPaise > 0 && (
            <div className="flex justify-between">
              <dt>Gift wrapping</dt>
              <dd>{formatPaise(totals.giftWrapPaise)}</dd>
            </div>
          )}
        </dl>

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) void applyCoupon(code.trim());
          }}
        >
          <label htmlFor="coupon" className="label">
            Coupon code
          </label>
          <div className="flex gap-2">
            <input
              id="coupon"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME10"
              className="input flex-1 uppercase placeholder:normal-case"
              aria-describedby="coupon-msg"
            />
            {coupon?.ok ? (
              <button
                type="button"
                className="btn btn-secondary min-h-12"
                onClick={() => {
                  setCode('');
                  void applyCoupon(null);
                }}
              >
                Remove
              </button>
            ) : (
              <button type="submit" className="btn btn-secondary min-h-12">
                Apply
              </button>
            )}
          </div>
          <p id="coupon-msg" aria-live="polite" className={`mt-2 text-[14px] ${couponMsg?.tone === 'err' ? 'text-warning' : 'text-success'}`}>
            {couponMsg?.text}
          </p>
        </form>

        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-[18px] font-semibold">Total</span>
          <span className="text-[30px] font-semibold">{formatPaise(totals.totalPaise)}</span>
        </div>
        <p className="mt-1 text-[14px] text-muted">Inclusive of GST · No-cost EMI available</p>
        <Link href="/checkout" className="btn btn-primary btn-lg mt-5 w-full">
          Proceed to checkout
        </Link>
        <Link href="/watches" className="link mt-5 block text-center text-[15.5px]">
          Continue shopping
        </Link>
        <ul className="mt-5 space-y-2 border-t border-line pt-5 text-[14px] text-body-2">
          {[`Secure payments via ${gatewayLabel}`, 'Authenticity certificate with every watch', `${returnDaysLabel}-day easy returns`].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check size={15} strokeWidth={1.6} aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
