'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { ProductImage, type Art } from '@/components/product/product-image';
import { useStore } from '@/components/store-provider';
import { formatPaise } from '@/lib/money';
import type { Totals } from '@/lib/pricing';
import { checkoutSchema } from '@/lib/validation/schemas';
import { MockPaymentDialog } from './mock-payment';

export type CheckoutItem = { name: string; detail: string; qty: number; pricePaise: number; image: string | null; art: Art };
type SavedAddress = { id: string; name: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string; isDefault: boolean };

type Props = {
  items: CheckoutItem[];
  totals: Totals;
  couponCode: string | null;
  giftWrap: boolean;
  buyNowVariantId: string | null;
  signedIn: boolean;
  defaults: { phone: string; email: string; name: string };
  addresses: SavedAddress[];
  cod: { limitPaise: number; feePaise: number };
  razorpayMock: boolean;
};

type FormIn = z.input<typeof checkoutSchema>;
type FormOut = z.output<typeof checkoutSchema>;

type CheckoutResponse = {
  orderId: string;
  orderNumber: string;
  token: string;
  redirect?: string;
  razorpay?: { keyId: string; orderId: string; amount: number; mock: boolean; name: string; prefill: { contact: string; email?: string; name?: string; method?: string } };
  error?: string;
};

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

const PAYMENT_OPTIONS = [
  { value: 'UPI', label: 'UPI', hint: 'GPay, PhonePe, Paytm, BHIM or any UPI app', rzp: 'upi' },
  { value: 'CARD', label: 'Credit / debit card', hint: 'Visa, Mastercard, RuPay, Amex', rzp: 'card' },
  { value: 'EMI', label: 'EMI', hint: 'No-cost EMI on select cards · 3, 6, 9 months', rzp: 'emi' },
  { value: 'NETBANKING', label: 'Net banking', hint: 'All major Indian banks', rzp: 'netbanking' },
  { value: 'COD', label: 'Cash on delivery', hint: '', rzp: '' },
] as const;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function errorAt(errors: FieldErrors<FormIn>, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = errors;
  for (const p of parts) cur = (cur as Record<string, unknown> | undefined)?.[p];
  return (cur as { message?: string } | undefined)?.message;
}

export function CheckoutForm({ items, totals, couponCode, giftWrap, buyNowVariantId, signedIn, defaults, addresses, cod, razorpayMock }: Props) {
  const router = useRouter();
  const { setCartCount } = useStore();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [savedId, setSavedId] = useState<string | null>(defaultAddress?.id ?? null);
  const [pinResult, setPinResult] = useState<{ pin: string; serviceable: boolean; cod: boolean; deliveryDate: string | null } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mockPay, setMockPay] = useState<CheckoutResponse | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phone: defaults.phone,
      email: defaults.email,
      whatsappOptIn: true,
      address: defaultAddress
        ? {
            name: defaultAddress.name,
            line1: defaultAddress.line1,
            line2: defaultAddress.line2,
            landmark: defaultAddress.landmark,
            city: defaultAddress.city,
            state: defaultAddress.state,
            pincode: defaultAddress.pincode,
          }
        : { name: defaults.name, line1: '', line2: '', landmark: '', city: '', state: '', pincode: '' },
      gstInvoice: false,
      gstin: '',
      businessName: '',
      paymentMethod: 'UPI',
      saveAddress: signedIn && !addresses.length,
      buyNowVariantId,
    },
  });

  const pincode = useWatch({ control, name: 'address.pincode' });
  const method = useWatch({ control, name: 'paymentMethod' });
  const gstInvoice = useWatch({ control, name: 'gstInvoice' });

  // Pincode → city/state auto-fill and COD serviceability.
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pincode ?? '')) return;
    const ctrl = new AbortController();
    fetch(`/api/pincode?pin=${pincode}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        setPinResult({ pin: j.pincode, serviceable: j.serviceable, cod: j.cod, deliveryDate: j.deliveryDate });
        if (j.city) setValue('address.city', j.city, { shouldValidate: true });
        if (j.state) setValue('address.state', j.state, { shouldValidate: true });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [pincode, setValue]);

  // Only trust the serviceability result for the pincode currently entered.
  const pinInfo = pinResult && pinResult.pin === pincode ? pinResult : null;

  const codTotal = totals.totalPaise + cod.feePaise;
  const codAllowed = Boolean(pinInfo?.serviceable && pinInfo.cod && cod.limitPaise > 0 && codTotal <= cod.limitPaise);
  const codReason = !pinInfo
    ? 'Enter your pincode to check COD availability'
    : !pinInfo.cod
      ? 'Not available for this pincode'
      : cod.limitPaise <= 0
        ? 'Available on orders up to ₹[LIMIT]'
        : codTotal > cod.limitPaise
          ? `Available on orders up to ${formatPaise(cod.limitPaise)}`
          : `Available on orders up to ${formatPaise(cod.limitPaise)}${cod.feePaise ? ` · ${formatPaise(cod.feePaise)} fee` : ''}`;

  useEffect(() => {
    if (method === 'COD' && !codAllowed) setValue('paymentMethod', 'UPI');
  }, [method, codAllowed, setValue]);

  const isCod = method === 'COD';
  const shownTotal = isCod ? codTotal : totals.totalPaise;

  const chooseSaved = (a: SavedAddress | null) => {
    setSavedId(a?.id ?? null);
    const v = a ?? { name: defaults.name, line1: '', line2: '', landmark: '', city: '', state: '', pincode: '' };
    setValue('address', { name: v.name, line1: v.line1, line2: v.line2, landmark: v.landmark, city: v.city, state: v.state, pincode: v.pincode });
    setValue('saveAddress', !a);
  };

  const goToConfirmation = (r: CheckoutResponse) => {
    setCartCount(0);
    router.push(r.redirect ?? `/order/${encodeURIComponent(r.orderNumber)}/confirmed?t=${r.token}`);
  };

  const verify = async (r: CheckoutResponse, body: Record<string, unknown>) => {
    const res = await fetch('/api/checkout/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: r.orderId, token: r.token, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) goToConfirmation(r);
    else {
      setSubmitting(false);
      setSubmitError(json.error ?? 'Payment could not be verified. If money was deducted it will be refunded automatically.');
    }
  };

  const cancel = (r: CheckoutResponse) => {
    void fetch('/api/checkout/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: r.orderId, token: r.token }) });
    setSubmitting(false);
    setSubmitError('Payment was not completed. Your items are still in your cart.');
  };

  const onSubmit = async (data: FormOut) => {
    setSubmitError(null);
    setSubmitting(true);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, savedAddressId: savedId }),
    });
    const json = (await res.json().catch(() => ({}))) as CheckoutResponse;
    if (!res.ok) {
      setSubmitting(false);
      setSubmitError(json.error ?? 'Could not place your order. Please try again.');
      return;
    }
    if (!json.razorpay) return goToConfirmation(json);
    if (json.razorpay.mock) {
      setMockPay(json);
      return;
    }
    if (!window.Razorpay) {
      setSubmitting(false);
      setSubmitError('The payment window could not load. Check your connection and try again.');
      return;
    }
    const rzp = new window.Razorpay({
      key: json.razorpay.keyId,
      order_id: json.razorpay.orderId,
      amount: json.razorpay.amount,
      currency: 'INR',
      name: json.razorpay.name,
      description: `Order ${json.orderNumber}`,
      prefill: json.razorpay.prefill,
      theme: { color: '#15171A' },
      handler: (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => verify(json, resp),
      modal: { ondismiss: () => cancel(json), confirm_close: true },
    });
    rzp.open();
  };

  const onInvalid = () => {
    setSubmitError('Please fix the highlighted fields.');
    setTimeout(() => document.getElementById('checkout-error')?.focus(), 0);
  };

  const invalid = (path: string) => (errorAt(errors, path) ? { 'aria-invalid': true as const, 'aria-describedby': `${path.replace('.', '-')}-error` } : {});

  return (
    <>
      {!razorpayMock && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />}
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1fr_390px]">
        <div className="space-y-5">
          <section className="card p-6" aria-labelledby="contact-heading">
            <div className="flex items-start justify-between gap-4">
              <h2 id="contact-heading" className="font-sans text-[21px] font-semibold">
                Contact
              </h2>
              {!signedIn && (
                <Link href="/login?next=/checkout" className="link text-[15px]">
                  Have an account? Sign in
                </Link>
              )}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field id="phone" label="Mobile number" error={errorAt(errors, 'phone')}>
                <div className="flex">
                  <span className="flex items-center border border-r-0 border-line-strong bg-ground px-3 text-[16px]">+91</span>
                  <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" className="input" {...register('phone')} {...invalid('phone')} />
                </div>
              </Field>
              <Field id="email" label="Email (for invoice)" error={errorAt(errors, 'email')}>
                <input id="email" type="email" autoComplete="email" className="input" {...register('email')} {...invalid('email')} />
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-3 text-[15.5px]">
              <input type="checkbox" className="h-5 w-5" {...register('whatsappOptIn')} /> Send order updates on WhatsApp
            </label>
          </section>

          <section className="card p-6" aria-labelledby="address-heading">
            <h2 id="address-heading" className="font-sans text-[21px] font-semibold">
              Shipping address
            </h2>
            {addresses.length > 0 && (
              <fieldset className="mt-4 space-y-2">
                <legend className="sr-only">Saved addresses</legend>
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer gap-3 border p-4 ${savedId === a.id ? 'border-ink' : 'border-line'}`}>
                    <input type="radio" name="saved-address" checked={savedId === a.id} onChange={() => chooseSaved(a)} className="mt-1 h-[18px] w-[18px]" />
                    <span className="text-[15px]">
                      <span className="font-semibold">{a.name}</span> · {a.line1}, {a.line2}, {a.city}, {a.state} {a.pincode}
                    </span>
                  </label>
                ))}
                <label className={`flex cursor-pointer gap-3 border p-4 ${savedId === null ? 'border-ink' : 'border-line'}`}>
                  <input type="radio" name="saved-address" checked={savedId === null} onChange={() => chooseSaved(null)} className="mt-1 h-[18px] w-[18px]" />
                  <span className="text-[15px] font-semibold">Use a new address</span>
                </label>
              </fieldset>
            )}
            <div className={`mt-4 grid gap-4 md:grid-cols-2 ${savedId ? 'hidden' : ''}`}>
              <Field id="address-name" label="Full name" error={errorAt(errors, 'address.name')}>
                <input id="address-name" autoComplete="name" className="input" {...register('address.name')} {...invalid('address.name')} />
              </Field>
              <Field id="address-pincode" label="Pincode" error={errorAt(errors, 'address.pincode')}>
                <input
                  id="address-pincode"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="postal-code"
                  placeholder="6 digits"
                  className="input"
                  {...register('address.pincode')}
                  {...invalid('address.pincode')}
                />
              </Field>
              <Field id="address-line1" label="Flat, house no., building" error={errorAt(errors, 'address.line1')}>
                <input id="address-line1" autoComplete="address-line1" className="input" {...register('address.line1')} {...invalid('address.line1')} />
              </Field>
              <Field id="address-line2" label="Area, street, locality" error={errorAt(errors, 'address.line2')}>
                <input id="address-line2" autoComplete="address-line2" className="input" {...register('address.line2')} {...invalid('address.line2')} />
              </Field>
              <Field id="address-landmark" label="Landmark (optional)">
                <input id="address-landmark" className="input" {...register('address.landmark')} />
              </Field>
              <Field id="address-city" label="City" error={errorAt(errors, 'address.city')}>
                <input
                  id="address-city"
                  autoComplete="address-level2"
                  placeholder="Auto-filled from pincode"
                  className="input"
                  {...register('address.city')}
                  {...invalid('address.city')}
                />
              </Field>
              <Field id="address-state" label="State" error={errorAt(errors, 'address.state')}>
                <input
                  id="address-state"
                  autoComplete="address-level1"
                  placeholder="Auto-filled from pincode"
                  className="input"
                  {...register('address.state')}
                  {...invalid('address.state')}
                />
              </Field>
            </div>
            {pinInfo && (
              <p className={`mt-3 text-[14.5px] ${pinInfo.serviceable ? 'text-success' : 'text-warning'}`} aria-live="polite">
                {pinInfo.serviceable
                  ? `Delivers by ${pinInfo.deliveryDate ? new Date(pinInfo.deliveryDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '[DATE]'}`
                  : 'Sorry, we do not deliver to this pincode yet.'}
              </p>
            )}
            {signedIn && !savedId && (
              <label className="mt-4 flex items-center gap-3 text-[15.5px]">
                <input type="checkbox" className="h-5 w-5" {...register('saveAddress')} /> Save this address to my account
              </label>
            )}
            <label className="mt-4 flex items-center gap-3 text-[15.5px]">
              <input type="checkbox" className="h-5 w-5" {...register('gstInvoice')} /> I need a GST invoice (business purchase)
            </label>
            {gstInvoice && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field id="gstin" label="GSTIN" error={errorAt(errors, 'gstin')}>
                  <input id="gstin" maxLength={15} className="input uppercase" placeholder="22AAAAA0000A1Z5" {...register('gstin')} {...invalid('gstin')} />
                </Field>
                <Field id="businessName" label="Registered business name" error={errorAt(errors, 'businessName')}>
                  <input id="businessName" className="input" {...register('businessName')} {...invalid('businessName')} />
                </Field>
              </div>
            )}
          </section>

          <section className="card p-6" aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="font-sans text-[21px] font-semibold">
              Payment method
            </h2>
            <fieldset className="mt-4 space-y-3">
              <legend className="sr-only">Choose a payment method</legend>
              {PAYMENT_OPTIONS.map((o) => {
                const disabled = o.value === 'COD' && !codAllowed;
                const selected = method === o.value;
                return (
                  <label
                    key={o.value}
                    className={`flex min-h-[72px] items-center gap-4 border px-5 py-3 ${selected ? 'border-2 border-ink px-[19px]' : 'border-line'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <input type="radio" value={o.value} disabled={disabled} className="h-5 w-5" {...register('paymentMethod')} />
                    <span>
                      <span className="block text-[16.5px] font-semibold">{o.label}</span>
                      <span className="block text-[14px] text-muted">{o.value === 'COD' ? codReason : o.hint}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </section>
        </div>

        <aside className="card self-start p-6 lg:sticky lg:top-6" aria-labelledby="checkout-summary">
          <h2 id="checkout-summary" className="font-sans text-[21px] font-semibold">
            Order summary
          </h2>
          <ul className="mt-4 space-y-4">
            {items.map((i, idx) => (
              <li key={idx} className="flex items-center gap-4">
                <span className="relative h-16 w-16 shrink-0 bg-stone">
                  <ProductImage url={i.image ?? undefined} alt="" art={i.art} sizes="64px" artClassName="w-[70%]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{i.name}</span>
                  <span className="block text-[13.5px] text-muted">
                    {i.detail} · Qty {i.qty}
                  </span>
                </span>
                <span className="text-[16px]">{formatPaise(i.pricePaise * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[15.5px]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatPaise(totals.subtotalPaise)}</dd>
            </div>
            {totals.discountPaise > 0 && (
              <div className="flex justify-between text-success">
                <dt>Discount{couponCode ? ` (${couponCode})` : ''}</dt>
                <dd>− {formatPaise(totals.discountPaise)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{totals.shippingPaise ? formatPaise(totals.shippingPaise) : 'Free'}</dd>
            </div>
            {giftWrap && totals.giftWrapPaise > 0 && (
              <div className="flex justify-between">
                <dt>Gift wrapping</dt>
                <dd>{formatPaise(totals.giftWrapPaise)}</dd>
              </div>
            )}
            {isCod && cod.feePaise > 0 && (
              <div className="flex justify-between">
                <dt>COD fee</dt>
                <dd>{formatPaise(cod.feePaise)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-[18px] font-semibold">Total</span>
            <span className="text-[30px] font-semibold">{formatPaise(shownTotal)}</span>
          </div>
          <div id="checkout-error" tabIndex={-1} aria-live="assertive" className="outline-none">
            {submitError && <p className="mt-3 bg-sand p-3 text-[14.5px] text-warning">{submitError}</p>}
          </div>
          <button type="submit" className="btn btn-primary btn-lg mt-4 w-full" disabled={submitting || (pinInfo !== null && !pinInfo.serviceable)}>
            {submitting ? 'Processing…' : isCod ? 'Place order (pay on delivery)' : `Pay ${formatPaise(shownTotal)} securely`}
          </button>
          <p className="mt-3 text-[13px] text-muted">
            By placing this order you agree to our{' '}
            <Link href="/policies/terms" className="link text-ink">
              Terms
            </Link>
            ,{' '}
            <Link href="/policies/returns" className="link text-ink">
              Returns policy
            </Link>{' '}
            and{' '}
            <Link href="/policies/privacy" className="link text-ink">
              Privacy policy
            </Link>
            .
          </p>
        </aside>
      </form>
      {mockPay && (
        <MockPaymentDialog
          amountLabel={formatPaise(mockPay.razorpay?.amount ?? shownTotal)}
          method={method}
          onSuccess={() => {
            const r = mockPay;
            setMockPay(null);
            void verify(r, { mock: true, outcome: 'success' });
          }}
          onFailure={() => {
            const r = mockPay;
            setMockPay(null);
            cancel(r);
          }}
        />
      )}
    </>
  );
}
