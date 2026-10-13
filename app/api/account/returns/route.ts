import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { canRequestReturn } from '@/lib/returns';
import { enqueueOrderNotification } from '@/lib/notifications';
import { getSettings } from '@/lib/settings';

const schema = z.object({ orderId: z.string().min(1).max(40), orderItemId: z.string().min(1).max(40), reason: z.string().trim().min(3).max(600) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  const order = await db.order.findFirst({ where: { id: body.orderId, userId: user.id }, include: { items: true, events: true, returns: true } });
  if (!order || !order.items.some((i) => i.id === body.orderItemId)) return error('Order not found.', 404);
  const settings = await getSettings();
  if (!canRequestReturn(order, settings.returnWindowDays)) return error('This order is outside the return window.', 409);
  if (order.returns.some((r) => r.orderItemId === body.orderItemId && r.status !== 'REJECTED')) return error('A return is already open for this item.', 409);
  await db.$transaction([
    db.returnRequest.create({ data: { orderId: order.id, orderItemId: body.orderItemId, reason: body.reason } }),
    db.order.update({ where: { id: order.id }, data: { status: 'RETURN_REQUESTED' } }),
    db.orderEvent.create({ data: { orderId: order.id, status: 'RETURN_REQUESTED', actor: user.id, note: body.reason } }),
  ]);
  await enqueueOrderNotification(order.id, 'return_update', 'We have received your return request and will confirm the pickup shortly.');
  return json({ ok: true });
}
