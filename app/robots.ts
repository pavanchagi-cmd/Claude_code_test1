import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : true;
  return {
    // Preview deployments are never indexed.
    rules: isProduction ? [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/checkout', '/cart', '/api'] }] : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
