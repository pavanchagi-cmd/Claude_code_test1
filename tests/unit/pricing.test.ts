import { describe, expect, it } from 'vitest';
import { computeTotals, isCodAllowed } from '@/lib/pricing';
import { formatPaise, formatPaiseExact, percentOff, rupeesToPaise } from '@/lib/money';

const settings = { freeShippingThresholdPaise: 500000, shippingFeePaise: 15000, codFeePaise: 5000, codLimitPaise: 3000000, giftWrapPaise: 25000 };

describe('computeTotals', () => {
  it('sums lines and adds shipping below the free threshold', () => {
    const t = computeTotals([{ unitPricePaise: 200000, qty: 2 }], settings);
    expect(t.subtotalPaise).toBe(400000);
    expect(t.itemCount).toBe(2);
    expect(t.shippingPaise).toBe(15000);
    expect(t.freeShippingRemainingPaise).toBe(100000);
    expect(t.totalPaise).toBe(415000);
  });

  it('gives free shipping at or above the threshold, measured after discount', () => {
    expect(computeTotals([{ unitPricePaise: 500000, qty: 1 }], settings).shippingPaise).toBe(0);
    const discounted = computeTotals([{ unitPricePaise: 500000, qty: 1 }], settings, { discountPaise: 1 });
    expect(discounted.shippingPaise).toBe(15000);
  });

  it('treats a zero threshold as always-free shipping', () => {
    expect(computeTotals([{ unitPricePaise: 100, qty: 1 }], { ...settings, freeShippingThresholdPaise: 0 }).shippingPaise).toBe(0);
  });

  it('adds gift wrap and COD fee only when chosen', () => {
    const t = computeTotals([{ unitPricePaise: 600000, qty: 1 }], settings, { giftWrap: true, cod: true });
    expect(t.giftWrapPaise).toBe(25000);
    expect(t.codFeePaise).toBe(5000);
    expect(t.totalPaise).toBe(630000);
  });

  it('never discounts below zero', () => {
    const t = computeTotals([{ unitPricePaise: 1000, qty: 1 }], { ...settings, freeShippingThresholdPaise: 0 }, { discountPaise: 99999 });
    expect(t.discountPaise).toBe(1000);
    expect(t.totalPaise).toBe(0);
  });

  it('charges nothing for an empty cart', () => {
    const t = computeTotals([], settings, { giftWrap: true, cod: true });
    expect(t.totalPaise).toBe(0);
  });
});

describe('isCodAllowed', () => {
  it('requires pincode support, a configured limit and a total within it', () => {
    expect(isCodAllowed(100000, 3000000, true)).toBe(true);
    expect(isCodAllowed(100000, 3000000, false)).toBe(false);
    expect(isCodAllowed(100000, 0, true)).toBe(false);
    expect(isCodAllowed(3000001, 3000000, true)).toBe(false);
    expect(isCodAllowed(3000000, 3000000, true)).toBe(true);
  });
});

describe('money helpers', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatPaise(2450000)).toBe('₹24,500');
    expect(formatPaise(1234567890)).toBe('₹1,23,45,679');
    expect(formatPaiseExact(2076271)).toBe('₹20,762.71');
    expect(rupeesToPaise(199.99)).toBe(19999);
    expect(percentOff(650000, 800000)).toBe(19);
    expect(percentOff(800000, 800000)).toBeNull();
  });
});
