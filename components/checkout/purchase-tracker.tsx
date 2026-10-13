'use client';

import { useEffect } from 'react';
import { trackPurchase } from '@/components/layout/consent';

/** Fires GA4/Meta purchase events once per order (server flag + sessionStorage guard). */
export function PurchaseTracker({
  orderNumber,
  token,
  valueRupees,
  items,
}: {
  orderNumber: string;
  token: string;
  valueRupees: number;
  items: { id: string; name: string; price: number; quantity: number }[];
}) {
  useEffect(() => {
    const key = `tracked:${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    fetch(`/api/orders/${encodeURIComponent(orderNumber)}/tracked`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then((r) => r.json())
      .then((j: { first?: boolean }) => {
        if (j.first) trackPurchase({ orderNumber, valueRupees, items });
      })
      .catch(() => {});
  }, [orderNumber, token, valueRupees, items]);
  return null;
}

export function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  useEffect(() => {
    const t = setTimeout(() => window.location.reload(), seconds * 1000);
    return () => clearTimeout(t);
  }, [seconds]);
  return null;
}
