'use client';

import { Heart } from 'lucide-react';
import { useStore } from '@/components/store-provider';

export function WishlistButton({ productId, productName, className = '', size = 20 }: { productId: string; productName: string; className?: string; size?: number }) {
  const { wishlist, toggleWishlist } = useStore();
  const active = wishlist.has(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleWishlist(productId);
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      className={`inline-flex h-11 w-11 items-center justify-center text-ink ${className}`}
    >
      <Heart size={size} strokeWidth={1.6} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}
