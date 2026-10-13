import { currentUser } from '@/lib/auth';
import { error } from '@/lib/api';
import { getOrderForViewer } from '@/lib/orders';
import { renderInvoicePdf } from '@/lib/pdf/invoice';

export const dynamic = 'force-dynamic';

/** GST invoice PDF for the order owner, a guest with the order token, or staff. */
export async function GET(req: Request, ctx: RouteContext<'/api/orders/[id]/invoice'>) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get('t');
  const user = await currentUser();
  const order = await getOrderForViewer(decodeURIComponent(id), { token, userId: user?.id, isStaff: user?.role === 'ADMIN' || user?.role === 'STAFF' });
  if (!order) return error('Not found', 404);
  if (!order.invoice) return error('The invoice is issued once payment is confirmed.', 409);
  const pdf = await renderInvoicePdf(order.id);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${order.invoice.number.replace(/\//g, '-')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
