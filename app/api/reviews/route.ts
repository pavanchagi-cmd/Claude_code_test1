import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { reviewSchema } from '@/lib/validation/schemas';

/** Verified buyers only: the user must have a delivered order containing this product. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return error('Please sign in to write a review.', 401);
  if (!(await rateLimit(`review:${user.id}`, 5, 3600))) return error('Too many reviews. Please try later.', 429);
  const [body, err] = await parseBody(req, reviewSchema);
  if (err) return err;
  const purchased = await db.orderItem.findFirst({
    where: { productId: body.productId, order: { userId: user.id, status: { in: ['DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'] } } },
  });
  if (!purchased) return error('Only customers who have received this watch can review it.', 403);
  const existing = await db.review.findFirst({ where: { productId: body.productId, userId: user.id } });
  if (existing) return error('You have already reviewed this watch.', 409);
  await db.review.create({
    data: {
      productId: body.productId,
      userId: user.id,
      authorName: user.name ?? 'Verified buyer',
      city: body.city || null,
      rating: body.rating,
      title: body.title,
      body: body.body,
      verifiedBuyer: true,
      status: 'PENDING',
    },
  });
  return json({ ok: true, message: 'Thank you. Your review will appear once it has been approved.' });
}
