'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/components/store-provider';

export function AddButton({
  variantId,
  label = 'Add',
  className = 'btn btn-secondary w-full min-h-10',
  refresh = true,
}: {
  variantId: string;
  label?: string;
  className?: string;
  refresh?: boolean;
}) {
  const { addToCart } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const ok = await addToCart(variantId, 1);
        setBusy(false);
        if (ok && refresh) router.refresh();
      }}
    >
      {busy ? 'Adding…' : label}
    </button>
  );
}
