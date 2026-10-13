import { cookies } from 'next/headers';
import { z } from 'zod';
import { currentUser, sessionCookieName } from '@/lib/auth';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';

const schema = z.object({ confirm: z.literal('DELETE') });

/**
 * DPDP Act: delete the account. Orders and invoices are kept (tax law) but
 * detached from the user; profile, addresses, wishlist and sessions are removed.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const [, err] = await parseBody(req, schema);
  if (err) return error('Type DELETE to confirm.', 422);
  const open = await db.order.count({ where: { userId: user.id, status: { in: ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'RETURN_REQUESTED'] } } });
  if (open) return error('You have orders in progress. Please wait until they are delivered or contact us.', 409);
  await db.$transaction([
    db.order.updateMany({ where: { userId: user.id }, data: { userId: null } }),
    db.review.updateMany({ where: { userId: user.id }, data: { userId: null, authorName: 'Former customer' } }),
    db.user.delete({ where: { id: user.id } }),
  ]);
  (await cookies()).delete(await sessionCookieName());
  return json({ ok: true });
}
