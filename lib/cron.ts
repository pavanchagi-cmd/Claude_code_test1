import 'server-only';
import crypto from 'node:crypto';

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return header.length === expected.length && crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
