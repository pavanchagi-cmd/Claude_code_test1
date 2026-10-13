import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { error } from '@/lib/api';
import { blob, LOCAL_UPLOAD_DIR } from '@/lib/integrations/blob';

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.pdf': 'application/pdf' };

/** Serves files saved by the local Blob mock. Disabled once Vercel Blob is configured. */
export async function GET(_req: Request, ctx: RouteContext<'/api/uploads/[name]'>) {
  if (!blob.mock) return error('Not found', 404);
  const { name } = await ctx.params;
  if (!/^[\w.-]+$/.test(name)) return error('Not found', 404);
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type) return error('Not found', 404);
  try {
    const buf = await readFile(path.join(LOCAL_UPLOAD_DIR, name));
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return error('Not found', 404);
  }
}
