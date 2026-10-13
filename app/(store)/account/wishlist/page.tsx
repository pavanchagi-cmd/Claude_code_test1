import Link from 'next/link';
import { WishlistAlerts } from '@/components/account/wishlist-alerts';
import { AddButton } from '@/components/cart/add-button';
import { ProductCard } from '@/components/product/product-card';
import { requireUser } from '@/lib/auth';
import { cardInclude, toCard } from '@/lib/catalog';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  const user = await requireUser('/account/wishlist');
  const items = await db.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: { product: { include: cardInclude } } });
  return (
    <section aria-labelledby="wishlist-heading">
      <h2 id="wishlist-heading" className="font-sans text-[26px] font-semibold">
        Wishlist
      </h2>
      {items.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="text-muted">Tap the heart on any watch to save it here.</p>
          <Link href="/watches" className="btn btn-primary mt-5">
            Browse watches
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {items.map((w) => {
            const card = toCard(w.product);
            return (
              <li key={w.id} className="flex flex-col">
                <ProductCard product={card} compact />
                <div className="border-x border-b border-line bg-surface p-4">
                  {card.defaultVariantId && card.stockLeft > 0 ? (
                    <AddButton variantId={card.defaultVariantId} label="Move to cart" className="btn btn-primary min-h-11 w-full" />
                  ) : (
                    <p className="text-[14px] font-semibold text-warning">Out of stock</p>
                  )}
                  <WishlistAlerts productId={w.productId} priceDrop={w.notifyPriceDrop} restock={w.notifyRestock} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
