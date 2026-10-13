import 'server-only';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';

export const requireStaff = () => requireRole(['ADMIN', 'STAFF']);
export const requireAdmin = () => requireRole(['ADMIN']);

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim();
}
export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v ? v : null;
}
export function optNum(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
export function num(fd: FormData, key: string, fallback = 0): number {
  return optNum(fd, key) ?? fallback;
}
/** Rupee input (e.g. "24,500") → paise. */
export function paise(fd: FormData, key: string): number | null {
  const v = str(fd, key).replace(/[₹,\s]/g, '');
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
export function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on' || fd.get(key) === 'true';
}
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Refresh storefront pages after catalogue changes (on-demand ISR). */
export function revalidateCatalog(slugs: string[] = []) {
  revalidatePath('/', 'layout');
  for (const s of slugs) revalidatePath(`/watch/${s}`);
}

export const rupees = (p: number | null | undefined) => (p === null || p === undefined ? '' : String(p / 100));

/**
 * Run an admin mutation; on a validation error, send the user back with
 * ?error=… instead of an error page (redirects pass through untouched).
 */
export async function guarded(back: string, fn: () => Promise<void>) {
  const { redirect, unstable_rethrow } = await import('next/navigation');
  try {
    await fn();
  } catch (e) {
    unstable_rethrow(e);
    console.error('[admin]', e);
    redirect(`${back}${back.includes('?') ? '&' : '?'}error=${encodeURIComponent((e as Error).message || 'Something went wrong.')}`);
  }
}
