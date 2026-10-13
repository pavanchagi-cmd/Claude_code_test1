import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error } from '@/lib/api';
import { renderWarrantyPdf } from '@/lib/pdf/warranty';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: RouteContext<'/api/account/warranty/[id]'>) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const reg = await db.warrantyRegistration.findFirst({ where: { id, userId: user.id } });
  if (!reg) return error('Not found', 404);
  const pdf = await renderWarrantyPdf(reg.id);
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="warranty-${reg.serialNumber}.pdf"`, 'Cache-Control': 'private, no-store' },
  });
}
