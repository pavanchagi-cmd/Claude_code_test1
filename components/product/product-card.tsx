import Link from 'next/link';
import type { ProductCardData } from '@/lib/catalog';
import { formatPaise } from '@/lib/money';
import { ProductImage } from './product-image';
import { WishlistButton } from './wishlist-button';

const BADGE_LABEL: Record<string, string> = { NEW: 'New', BESTSELLER: 'Bestseller', LIMITED: 'Limited', SALE: 'Sale' };

export function ProductCard({ product, priority = false, compact = false }: { product: ProductCardData; priority?: boolean; compact?: boolean }) {
  const [first, second] = product.images;
  const hasHover = Boolean(second && !second.url.startsWith('placeholder:'));
  return (
    <article className="group relative flex flex-col border border-line bg-surface">
      <Link href={`/watch/${product.slug}`} className="flex flex-1 flex-col focus-visible:outline-offset-[-2px]" aria-label={`${product.name} by ${product.brandName}`}>
        <div className="relative aspect-square overflow-hidden bg-stone">
          <div className={`absolute inset-0 transition-opacity duration-300 ${hasHover ? 'group-hover:opacity-0' : ''}`}>
            <ProductImage url={first?.url} alt={first?.alt ?? product.name} art={product.art} priority={priority} sizes="(min-width:1024px) 300px, (min-width:768px) 33vw, 50vw" />
          </div>
          {hasHover && (
            <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <ProductImage url={second.url} alt={second.alt} art={product.art} sizes="(min-width:1024px) 300px, 50vw" />
            </div>
          )}
          {product.badge && !compact && <span className="badge absolute top-3 left-3">{BADGE_LABEL[product.badge] ?? product.badge}</span>}
          {product.stockLeft > 0 && product.stockLeft <= 3 && (
            <span className="absolute bottom-3 left-3 bg-surface px-2 py-1 text-[13px] font-semibold text-warning">Only {product.stockLeft} left</span>
          )}
          {product.stockLeft === 0 && <span className="absolute bottom-3 left-3 bg-surface px-2 py-1 text-[13px] font-semibold text-muted">Sold out</span>}
        </div>
        <div className={`flex flex-1 flex-col ${compact ? 'p-4' : 'px-[18px] pt-5 pb-5'}`}>
          {!compact && <p className="text-[13px] tracking-[0.08em] text-muted">{product.brandName.toUpperCase()}</p>}
          <h3 className={`font-display ${compact ? 'text-[19px]' : 'mt-2 text-[21px]'} leading-tight`}>{product.name}</h3>
          {!compact && product.spec && <p className="mt-2 text-[13px] text-muted">{product.spec}</p>}
          <div className={`mt-auto flex items-center justify-between ${compact ? 'pt-2' : 'pt-4'}`}>
            <span className="text-[17px] font-semibold">
              {formatPaise(product.pricePaise)}
              {product.mrpPaise && product.mrpPaise > product.pricePaise && <s className="ml-2 text-[13px] font-normal text-muted">{formatPaise(product.mrpPaise)}</s>}
            </span>
            {!compact && product.ratingCount > 0 && (
              <span className="text-[14px] text-muted">
                <span aria-hidden="true">★</span> {product.ratingAvg.toFixed(1)} ({product.ratingCount})
                <span className="sr-only"> average rating from {product.ratingCount} reviews</span>
              </span>
            )}
          </div>
        </div>
      </Link>
      <WishlistButton productId={product.id} productName={product.name} className="absolute top-1.5 right-1.5" />
    </article>
  );
}
