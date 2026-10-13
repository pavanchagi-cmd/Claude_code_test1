import { db } from '@/lib/db';
import { json } from '@/lib/api';
import { getOrderForViewer } from '@/lib/orders';

export async function POST(req: Request, ctx: RouteContext<'/api/orders/[id]/tracked'>) {
  const { id } = await ctx.params;
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const order = await getOrderForViewer(decodeURIComponent(id), { token });
  if (!order || order.status === 'PENDING_PAYMENT') return json({ first: false });
  const res = await db.order.updateMany({ where: { id: order.id, purchaseTracked: false }, data: { purchaseTracked: true } });
  return json({ first: res.count === 1 });
}
