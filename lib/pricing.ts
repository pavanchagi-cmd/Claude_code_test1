// Cart and order totals. The server always recomputes these from the
// database; client-side totals are display-only.

export type PricingSettings = {
  freeShippingThresholdPaise: number;
  shippingFeePaise: number;
  codFeePaise: number;
  codLimitPaise: number;
  giftWrapPaise: number;
};

export type PricingLine = { unitPricePaise: number; qty: number };

export type Totals = {
  itemCount: number;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  giftWrapPaise: number;
  codFeePaise: number;
  totalPaise: number;
  freeShippingRemainingPaise: number;
};

export function computeTotals(lines: PricingLine[], settings: PricingSettings, opts: { discountPaise?: number; giftWrap?: boolean; cod?: boolean } = {}): Totals {
  const subtotalPaise = lines.reduce((acc, l) => acc + l.unitPricePaise * l.qty, 0);
  const itemCount = lines.reduce((acc, l) => acc + l.qty, 0);
  const discountPaise = Math.min(opts.discountPaise ?? 0, subtotalPaise);
  const afterDiscount = subtotalPaise - discountPaise;

  const qualifiesFree = settings.freeShippingThresholdPaise <= 0 || afterDiscount >= settings.freeShippingThresholdPaise;
  const shippingPaise = itemCount === 0 || qualifiesFree ? 0 : settings.shippingFeePaise;
  const freeShippingRemainingPaise = qualifiesFree ? 0 : settings.freeShippingThresholdPaise - afterDiscount;
  const giftWrapPaise = opts.giftWrap && itemCount > 0 ? settings.giftWrapPaise : 0;
  const codFeePaise = opts.cod && itemCount > 0 ? settings.codFeePaise : 0;

  return {
    itemCount,
    subtotalPaise,
    discountPaise,
    shippingPaise,
    giftWrapPaise,
    codFeePaise,
    totalPaise: afterDiscount + shippingPaise + giftWrapPaise + codFeePaise,
    freeShippingRemainingPaise,
  };
}

/** COD is offered only when the courier supports it and the total is within the limit. */
export function isCodAllowed(totalPaise: number, codLimitPaise: number, pincodeSupportsCod: boolean): boolean {
  if (!pincodeSupportsCod) return false;
  if (codLimitPaise <= 0) return false; // owner has not set a COD limit yet
  return totalPaise <= codLimitPaise;
}
