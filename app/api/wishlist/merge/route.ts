import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { wishlistMergeSchema } from '@/lib/validation/schemas';

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return error('Sign in required.', 401);
  const [body, err] = await parseBody(req, wishlistMergeSchema);
  if (err) return err;
  const existing = await db.product.findMany({ where: { id: { in: body.productIds } }, select: { id: true } });
  for (const p of existing) {
    await db.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId: p.id } },
      create: { userId: user.id, productId: p.id },
      update: {},
    });
  }
  return json({ ok: true, merged: existing.length });
}
