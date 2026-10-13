import 'server-only';
import { Redis } from '@upstash/redis';
import { configured } from '@/lib/env';

// Small TTL cache: Upstash Redis when configured, otherwise per-instance memory.
const memory = new Map<string, { value: unknown; expires: number }>();
const redis = configured.upstash ? Redis.fromEnv() : null;

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  if (redis) {
    try {
      const hit = await redis.get<T>(key);
      if (hit !== null && hit !== undefined) return hit;
      const value = await load();
      await redis.set(key, value, { ex: ttlSeconds });
      return value;
    } catch (err) {
      console.error('[cache] redis error, using memory', err);
    }
  }
  const now = Date.now();
  const hit = memory.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await load();
  memory.set(key, { value, expires: now + ttlSeconds * 1000 });
  if (memory.size > 5000) memory.delete(memory.keys().next().value as string);
  return value;
}
