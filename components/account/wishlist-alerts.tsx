'use client';

import { useState } from 'react';

export function WishlistAlerts({ productId, priceDrop, restock }: { productId: string; priceDrop: boolean; restock: boolean }) {
  const [state, setState] = useState({ notifyPriceDrop: priceDrop, notifyRestock: restock });
  const update = async (patch: Partial<typeof state>) => {
    const next = { ...state, ...patch };
    setState(next);
    await fetch('/api/wishlist', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, ...patch }) });
  };
  return (
    <fieldset className="mt-3 space-y-1 text-[14px]">
      <legend className="sr-only">Email alerts</legend>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={state.notifyPriceDrop} onChange={(e) => update({ notifyPriceDrop: e.target.checked })} className="h-4 w-4" /> Email me if the price drops
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={state.notifyRestock} onChange={(e) => update({ notifyRestock: e.target.checked })} className="h-4 w-4" /> Email me when back in stock
      </label>
    </fieldset>
  );
}
