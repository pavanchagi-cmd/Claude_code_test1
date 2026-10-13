import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { productIdSchema } from '@/lib/validation/schemas';

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return error('Sign in to sync your wishlist.', 401);
  const [body, err] = await parseBody(req, productIdSchema);
  if (err) return err;
  const product = await db.product.findUnique({ where: { id: body.productId }, include: { variants: { take: 1, orderBy: { pricePaise: 'asc' } } } });
  if (!product) return error('Product not found.', 404);
  await db.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId: body.productId } },
    create: { userId: user.id, productId: body.productId, lastPricePaise: product.variants[0]?.pricePaise },
    update: {},
  });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return error('Sign in required.', 401);
  const [body, err] = await parseBody(req, productIdSchema);
  if (err) return err;
  await db.wishlistItem.deleteMany({ where: { userId: user.id, productId: body.productId } });
  return json({ ok: true });
}

/** Toggle price-drop / back-in-stock alerts. */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return error('Sign in required.', 401);
  let body: { productId?: string; notifyPriceDrop?: boolean; notifyRestock?: boolean };
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body.');
  }
  if (!body.productId) return error('productId is required.');
  await db.wishlistItem.updateMany({
    where: { userId: user.id, productId: body.productId },
    data: { notifyPriceDrop: body.notifyPriceDrop, notifyRestock: body.notifyRestock },
  });
  return json({ ok: true });
}
