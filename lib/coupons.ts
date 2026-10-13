// Pure coupon validation so it can be unit tested and reused server-side.

export type CouponLike = {
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export type CouponResult = { ok: true; discountPaise: number } | { ok: false; reason: string };

export function evaluateCoupon(coupon: CouponLike | null, subtotalPaise: number, now: Date = new Date()): CouponResult {
  if (!coupon || !coupon.isActive) return { ok: false, reason: 'This code is not valid.' };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: 'This code is not active yet.' };
  if (coupon.endsAt && now > coupon.endsAt) return { ok: false, reason: 'This code has expired.' };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return { ok: false, reason: 'This code has reached its usage limit.' };
  if (subtotalPaise < coupon.minOrderPaise)
    return { ok: false, reason: `Add items worth ₹${Math.ceil((coupon.minOrderPaise - subtotalPaise) / 100).toLocaleString('en-IN')} more to use this code.` };

  let discount = coupon.type === 'PERCENT' ? Math.floor((subtotalPaise * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscountPaise !== null) discount = Math.min(discount, coupon.maxDiscountPaise);
  discount = Math.max(0, Math.min(discount, subtotalPaise));
  return { ok: true, discountPaise: discount };
}
