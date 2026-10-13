import { describe, expect, it } from 'vitest';
import { evaluateCoupon, type CouponLike } from '@/lib/coupons';

const base: CouponLike = {
  code: 'WELCOME10',
  type: 'PERCENT',
  value: 10,
  minOrderPaise: 0,
  maxDiscountPaise: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usedCount: 0,
  isActive: true,
};
const now = new Date('2026-10-13T12:00:00Z');

describe('evaluateCoupon', () => {
  it('applies a percentage discount', () => {
    expect(evaluateCoupon(base, 2450000, now)).toEqual({ ok: true, discountPaise: 245000 });
  });

  it('caps percentage discounts at maxDiscount', () => {
    expect(evaluateCoupon({ ...base, maxDiscountPaise: 100000 }, 2450000, now)).toEqual({ ok: true, discountPaise: 100000 });
  });

  it('applies flat discounts but never more than the subtotal', () => {
    expect(evaluateCoupon({ ...base, type: 'FLAT', value: 50000 }, 2450000, now)).toEqual({ ok: true, discountPaise: 50000 });
    expect(evaluateCoupon({ ...base, type: 'FLAT', value: 50000 }, 30000, now)).toEqual({ ok: true, discountPaise: 30000 });
  });

  it('enforces the minimum order', () => {
    const r = evaluateCoupon({ ...base, minOrderPaise: 1000000 }, 900000, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('₹1,000');
  });

  it('enforces dates, usage limit and active flag', () => {
    expect(evaluateCoupon({ ...base, startsAt: new Date('2026-11-01') }, 100000, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, endsAt: new Date('2026-10-01') }, 100000, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, usageLimit: 5, usedCount: 5 }, 100000, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, isActive: false }, 100000, now).ok).toBe(false);
    expect(evaluateCoupon(null, 100000, now).ok).toBe(false);
  });
});
