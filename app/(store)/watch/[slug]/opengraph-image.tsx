import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { formatPaise } from '@/lib/money';
import { getSettings } from '@/lib/settings';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Watch';

/** Open Graph / Twitter card per product: photo (or placeholder art), name, price. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, s] = await Promise.all([
    db.product.findUnique({ where: { slug }, include: { brand: true, variants: { orderBy: { pricePaise: 'asc' }, take: 1 }, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } }),
    getSettings(),
  ]);
  const photo = p?.images[0]?.url.startsWith('https://') ? p.images[0].url : null;
  const strap = p?.artStrap ?? '#A9A59C';
  const kase = p?.artCase ?? '#CFCBC2';
  const dial = p?.artDial ?? '#0F2A3A';
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#15171A', color: '#F2EFE8', fontFamily: 'Georgia, serif' }}>
      <div style={{ width: 630, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFEDE8' }}>
        {photo ? (
          <img src={photo} width={630} height={630} style={{ objectFit: 'cover' }} alt="" />
        ) : (
          <svg width="320" height="384" viewBox="0 0 200 240">
            <rect x="78" y="0" width="44" height="70" rx="8" fill={strap} />
            <rect x="78" y="170" width="44" height="70" rx="8" fill={strap} />
            <circle cx="100" cy="120" r="62" fill={kase} />
            <circle cx="100" cy="120" r="54" fill={dial} />
            <line x1="100" y1="120" x2="100" y2="82" stroke="#F2EFE8" strokeWidth="4" strokeLinecap="round" />
            <line x1="100" y1="120" x2="128" y2="132" stroke="#F2EFE8" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="120" r="4" fill="#C9A86A" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 56 }}>
        <div style={{ fontSize: 22, letterSpacing: 4, color: '#C9A86A', textTransform: 'uppercase' }}>{p?.brand.name ?? s.brandName}</div>
        <div style={{ fontSize: 64, marginTop: 18, lineHeight: 1.05 }}>{p?.name ?? 'Watch'}</div>
        {p?.variants[0] && (
          <div style={{ fontSize: 38, marginTop: 28, fontFamily: 'Helvetica, Arial, sans-serif' }}>{formatPaise(p.variants[0].pricePaise).replace('₹', 'Rs. ')}</div>
        )}
        <div style={{ fontSize: 24, marginTop: 'auto', color: '#C9C4B9' }}>{s.brandName} · Genuine · Insured delivery across India</div>
      </div>
    </div>,
    size,
  );
}
