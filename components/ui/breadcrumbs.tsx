import Link from 'next/link';
import { siteUrl } from '@/lib/env';
import { JsonLd } from './json-ld';

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      item: it.href ? `${siteUrl()}${it.href}` : undefined,
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-[14px] text-muted">
      <JsonLd data={ld} />
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.href ? (
              <Link href={it.href} className="link text-ink">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
