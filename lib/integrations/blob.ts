import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { configured, isProd } from '@/lib/env';

export interface BlobStore {
  readonly mock: boolean;
  upload(pathname: string, body: Buffer | Blob, contentType: string): Promise<{ url: string }>;
}

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), '.uploads');

class VercelBlob implements BlobStore {
  readonly mock = false;
  async upload(pathname: string, body: Buffer | Blob, contentType: string) {
    const res = await put(pathname, body, { access: 'public', contentType, addRandomSuffix: true });
    return { url: res.url };
  }
}

/** Mock for local dev and CI: writes into .uploads/, served by /api/uploads/[name]. */
class LocalBlob implements BlobStore {
  readonly mock = true;
  async upload(pathname: string, body: Buffer | Blob) {
    // Vercel's filesystem is read-only, so uploads there need a real Blob store.
    if (isProd || process.env.VERCEL) throw new Error('BLOB_READ_WRITE_TOKEN is not set; connect a Vercel Blob store to this project.');
    const safe = pathname.replace(/[^a-zA-Z0-9._/-]/g, '-').replace(/\.\.+/g, '.');
    const name = `${Date.now()}-${safe.split('/').pop()}`;
    const dir = LOCAL_UPLOAD_DIR;
    await mkdir(dir, { recursive: true });
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(await body.arrayBuffer());
    await writeFile(path.join(dir, name), buf);
    return { url: `/api/uploads/${name}` };
  }
}

export const blob: BlobStore = configured.blob ? new VercelBlob() : new LocalBlob();
