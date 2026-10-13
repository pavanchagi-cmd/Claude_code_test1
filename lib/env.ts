// Central place to check which integrations are configured. When a key is
// missing the integration falls back to its mock so previews work.

/** Live production: Vercel production deployments, or APP_ENV=production on other hosts. */
export const isProd = process.env.VERCEL_ENV === 'production' || process.env.APP_ENV === 'production';

export const configured = {
  razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  shiprocket: Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD),
  msg91: Boolean(process.env.MSG91_AUTH_KEY),
  resend: Boolean(process.env.RESEND_API_KEY),
  whatsapp: Boolean(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_SENDER),
  blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  upstash: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
};

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function mockedIntegrations(): string[] {
  return Object.entries(configured)
    .filter(([, on]) => !on)
    .map(([name]) => name);
}
