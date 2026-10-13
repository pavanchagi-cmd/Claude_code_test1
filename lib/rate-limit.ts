import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { configured } from '@/lib/env';

const redis = configured.upstash ? Redis.fromEnv() : null;
const limiters = new Map<string, Ratelimit>();

function upstashLimiter(limit: number, windowSec: number) {
  const key = `${limit}/${windowSec}`;
  let l = limiters.get(key);
  if (!l && redis) {
    l = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`), prefix: 'rl' });
    limiters.set(key, l);
  }
  return l;
}

/**
 * Returns true when the action is allowed. Upstash Redis when configured,
 * otherwise a DB-backed sliding window (RateLimitHit table).
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const l = upstashLimiter(limit, windowSec);
  if (l) {
    const { success } = await l.limit(key);
    return success;
  }
  const since = new Date(Date.now() - windowSec * 1000);
  const count = await db.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= limit) return false;
  await db.rateLimitHit.create({ data: { key } });
  return true;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '0.0.0.0').trim();
}
