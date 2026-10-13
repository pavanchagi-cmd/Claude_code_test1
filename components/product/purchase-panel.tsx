'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/components/store-provider';
import { formatPaise } from '@/lib/money';
import { WishlistButton } from './wishlist-button';

export type PanelVariant = {
  id: string;
  label: string;
  pricePaise: number;
  mrpPaise: number | null;
  available: number;
};

type Props = {
  productId: string;
  productName: string;
  caseSizeMm: number | null;
  variants: PanelVariant[];
  emiMonths: number;
  whatsappHref: string | null;
  assurance: { title: string; subtitle: string }[];
  inTheBox: string | null;
  isAccessory: boolean;
};

type PinResult = {
  serviceable: boolean;
  cod: boolean;
  deliveryDate: string | null;
  city: string | null;
};

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function PurchasePanel({ productId, productName, caseSizeMm, variants, emiMonths, whatsappHref, assurance, inTheBox, isAccessory }: Props) {
  const router = useRouter();
  const { addToCart } = useStore();
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [pin, setPin] = useState('');
  const [pinState, setPinState] = useState<{
    loading: boolean;
    result?: PinResult;
    error?: string;
  }>({ loading: false });
  const [adding, setAdding] = useState(false);
  const v = variants.find((x) => x.id === variantId) ?? variants[0];
  if (!v) return null;

  const stockText = v.available <= 0 ? 'Out of stock' : v.available <= 3 ? `Only ${v.available} left · ships in 24 hours` : 'In stock · ships in 24 hours';
  const emi = Math.ceil(v.pricePaise / emiMonths);

  const checkPin = async () => {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setPinState({ loading: false, error: 'Enter a valid 6-digit pincode.' });
      return;
    }
    setPinState({ loading: true });
    const res = await fetch(`/api/pincode?pin=${pin}`);
    const json = await res.json();
    if (!res.ok)
      setPinState({
        loading: false,
        error: json.error ?? 'Could not check this pincode.',
      });
    else setPinState({ loading: false, result: json });
  };

  return (
    <div>
      <div className="border-b border-line pt-6 pb-6">
        <p className="flex flex-wrap items-baseline gap-3">
          <span className="text-[36px] leading-none font-semibold">{formatPaise(v.pricePaise)}</span>
          {v.mrpPaise && v.mrpPaise > v.pricePaise && (
            <>
              <s className="text-[17px] text-muted">{formatPaise(v.mrpPaise)}</s>
              <span className="text-[15px] font-semibold text-success">{Math.round(((v.mrpPaise - v.pricePaise) / v.mrpPaise) * 100)}% off</span>
            </>
          )}
        </p>
        <p className="mt-3 text-[14.5px] text-muted">Inclusive of all taxes · No-cost EMI from {formatPaise(emi)}/month</p>
        <p className={`mt-3 text-[15px] font-semibold ${v.available <= 0 ? 'text-warning' : v.available <= 3 ? 'text-warning' : 'text-success'}`}>{stockText}</p>
      </div>

      {variants.length > 1 || !isAccessory ? (
        <div className="pt-6">
          <fieldset>
            <legend className="text-[16px] font-semibold">
              {isAccessory ? 'Option' : 'Strap'}: <span className="font-semibold">{v.label}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {variants.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={x.id === v.id}
                  data-active={x.id === v.id}
                  onClick={() => setVariantId(x.id)}
                  className={`chip min-h-11 ${x.available <= 0 ? 'line-through opacity-60' : ''}`}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </fieldset>
          {!isAccessory && (
            <Link href="/help#size-guide" className="link mt-4 inline-block text-[14.5px]">
              Size guide
              {caseSizeMm ? `: will ${caseSizeMm} mm suit my wrist?` : ''}
            </Link>
          )}
        </div>
      ) : null}

      <div className="pt-7">
        <label htmlFor="pdp-pincode" className="text-[16px] font-semibold">
          Check delivery
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="pdp-pincode"
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && void checkPin()}
            placeholder="Enter pincode"
            className="input max-w-[230px]"
            aria-describedby="pdp-pincode-result"
          />
          <button type="button" onClick={checkPin} className="btn btn-secondary min-h-12" disabled={pinState.loading}>
            {pinState.loading ? 'Checking…' : 'Check'}
          </button>
        </div>
        <p id="pdp-pincode-result" aria-live="polite" className="mt-3 text-[14.5px] text-muted">
          {pinState.error ? (
            <span className="text-warning">{pinState.error}</span>
          ) : pinState.result ? (
            pinState.result.serviceable ? (
              <>
                Delivery by {pinState.result.deliveryDate ? formatDate(pinState.result.deliveryDate) : '[DATE]'}
                {pinState.result.city ? ` to ${pinState.result.city}` : ''} · {pinState.result.cod ? 'COD available' : 'Prepaid only'}
              </>
            ) : (
              <span className="text-warning">Sorry, we do not deliver to this pincode yet.</span>
            )
          ) : (
            'Enter your pincode for the delivery date and COD availability.'
          )}
        </p>
      </div>

      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          className="btn btn-primary btn-lg flex-1"
          disabled={v.available <= 0 || adding}
          onClick={async () => {
            setAdding(true);
            await addToCart(v.id, 1);
            setAdding(false);
          }}
        >
          {adding ? 'Adding…' : 'Add to cart'}
        </button>
        <button type="button" className="btn btn-accent btn-lg flex-1" disabled={v.available <= 0} onClick={() => router.push(`/checkout?buy=${v.id}`)}>
          Buy now
        </button>
        <WishlistButton productId={productId} productName={productName} className="h-[56px] w-[56px] shrink-0 border border-line-strong bg-surface" />
      </div>

      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="link mt-6 inline-block text-[15.5px] font-semibold">
          Questions? Chat with us on WhatsApp
        </a>
      )}

      <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 border border-line bg-surface p-6 sm:grid-cols-2">
        {assurance.map((a) => (
          <li key={a.title} className="flex gap-3">
            <ShieldCheck size={22} strokeWidth={1.6} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />
            <span>
              <span className="block text-[15px] font-semibold">{a.title}</span>
              <span className="block text-[13.5px] text-muted">{a.subtitle}</span>
            </span>
          </li>
        ))}
      </ul>

      {inTheBox && (
        <p className="mt-6 text-[15px] text-body-2">
          <strong className="font-semibold text-ink">In the box:</strong> {inTheBox}
        </p>
      )}
    </div>
  );
}
