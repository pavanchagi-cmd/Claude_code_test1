import { currentUser } from '@/lib/auth';
import { cartCount, mergeGuestCart } from '@/lib/cart';
import { db } from '@/lib/db';
import { json } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (user) await mergeGuestCart(user.id);
  const [count, wishlist] = await Promise.all([cartCount(), user ? db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } }) : Promise.resolve([])]);
  return json(
    {
      user: user ? { name: user.name ?? null, role: user.role, phone: user.phone, email: user.email ?? null } : null,
      cartCount: count,
      wishlist: wishlist.map((w) => w.productId),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
