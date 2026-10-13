import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { questionSchema } from '@/lib/validation/schemas';

export async function POST(req: Request) {
  if (!(await rateLimit(`question:${await clientIp()}`, 5, 3600))) return error('Too many questions. Please try later.', 429);
  const [body, err] = await parseBody(req, questionSchema);
  if (err) return err;
  const product = await db.product.findUnique({ where: { id: body.productId }, select: { id: true } });
  if (!product) return error('Product not found.', 404);
  await db.question.create({ data: { productId: body.productId, text: body.text, askerName: body.name || null, isPublic: false } });
  return json({ ok: true, message: 'Thanks! We will answer your question shortly.' });
}
