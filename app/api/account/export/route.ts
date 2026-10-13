import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** DPDP Act: give the user a copy of their personal data. */
export async function GET() {
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const data = await db.user.findUnique({
    where: { id: user.id },
    select: {
      phone: true,
      email: true,
      name: true,
      wristSizeCm: true,
      marketingConsent: true,
      marketingConsentAt: true,
      createdAt: true,
      addresses: { select: { name: true, phone: true, line1: true, line2: true, landmark: true, city: true, state: true, pincode: true, isDefault: true } },
      orders: {
        select: {
          number: true,
          createdAt: true,
          status: true,
          totalPaise: true,
          shippingAddress: true,
          items: { select: { productName: true, variantLabel: true, qty: true, pricePaise: true } },
        },
      },
      wishlist: { select: { product: { select: { name: true, slug: true } }, createdAt: true } },
      reviews: { select: { rating: true, title: true, body: true, createdAt: true } },
      warranties: { select: { serialNumber: true, startsAt: true, endsAt: true } },
    },
  });
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), user: data }, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="my-data.json"', 'Cache-Control': 'private, no-store' },
  });
}
