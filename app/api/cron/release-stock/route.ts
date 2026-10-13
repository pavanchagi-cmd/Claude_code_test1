import { error, json } from '@/lib/api';
import { isCronAuthorized } from '@/lib/cron';
import { db } from '@/lib/db';
import { releaseExpiredReservations } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return error('Unauthorized', 401);
  const released = await releaseExpiredReservations();
  // Housekeeping: old OTPs and rate-limit hits.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.otpCode.deleteMany({ where: { createdAt: { lt: dayAgo } } });
  await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: dayAgo } } });
  return json({ released });
}
