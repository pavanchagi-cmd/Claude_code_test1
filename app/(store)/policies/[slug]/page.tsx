import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Markdown, plainText } from '@/lib/markdown';
import { getSettings } from '@/lib/settings';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    return (await db.policy.findMany({ select: { slug: true } })).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = await db.policy.findUnique({ where: { slug: (await params).slug } });
  if (!policy) return {};
  return { title: policy.title, description: plainText(policy.body), alternates: { canonical: `/policies/${policy.slug}` } };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const [policy, all, s] = await Promise.all([
    db.policy.findUnique({ where: { slug } }),
    db.policy.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, title: true } }),
    getSettings(),
  ]);
  if (!policy) notFound();
  const g = s.grievanceOfficer;
  return (
    <div className="container-narrow pt-12 pb-[88px]">
      <h1 className="h1-page">Policies</h1>
      <p className="mt-3 text-[17px] text-muted">Last updated {policy.updatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <div className="mt-6 grid gap-8 md:grid-cols-[242px_1fr]">
        <nav aria-label="Policies" className="min-w-0 self-start border border-line bg-surface">
          <ul className="flex overflow-x-auto md:block">
            {all.map((p) => (
              <li key={p.slug} className="shrink-0 md:border-b md:border-line md:last:border-b-0">
                <Link
                  href={`/policies/${p.slug}`}
                  aria-current={p.slug === slug ? 'page' : undefined}
                  className={`block px-5 py-3.5 text-[16.5px] ${p.slug === slug ? 'bg-ink text-on-dark' : 'hover:bg-ground'}`}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="card min-w-0 p-7 md:p-10">
          <h2 className="h2-section">{policy.title}</h2>
          <div className="prose-policy mt-2">
            <Markdown source={policy.body} />
          </div>
          {slug === 'grievance-officer' && (
            <dl className="prose-policy mt-6 grid gap-x-6 gap-y-2 text-[16.5px] md:grid-cols-[180px_1fr]">
              <dt className="font-semibold">Name</dt>
              <dd>{g.name}</dd>
              <dt className="font-semibold">Designation</dt>
              <dd>{g.designation}</dd>
              <dt className="font-semibold">Email</dt>
              <dd>{g.email}</dd>
              <dt className="font-semibold">Phone</dt>
              <dd>{g.phone}</dd>
              <dt className="font-semibold">Address</dt>
              <dd>{g.address}</dd>
              <dt className="font-semibold">Response time</dt>
              <dd>{g.responseTime}</dd>
            </dl>
          )}
          <p className="mt-8 bg-sand px-5 py-4 text-[15px] text-body-2">
            <strong className="text-ink">Seller details:</strong> {s.legalEntityName} · GSTIN {s.gstin} · {s.registeredAddress} · {s.supportEmail}
          </p>
        </article>
      </div>
    </div>
  );
}
