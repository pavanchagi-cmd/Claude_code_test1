import Link from 'next/link';
import { AdminPage, Card, Input, Notice, Submit, Textarea } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import { savePolicy } from '../actions';

export const dynamic = 'force-dynamic';

export default async function PoliciesAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; saved?: string; error?: string }> }) {
  await requireStaff();
  const [policies, sp] = await Promise.all([db.policy.findMany({ orderBy: { sortOrder: 'asc' } }), searchParams]);
  const current = policies.find((p) => p.id === sp.edit) ?? policies[0];
  return (
    <AdminPage title="Policies">
      <Notice tone="warn">Policy text must be reviewed by your lawyer before launch. Grievance officer details are edited in Site settings.</Notice>
      {sp.saved && <Notice>Saved. “Last updated” on the policy page now shows today.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <ul className="self-start border border-line bg-surface">
          {policies.map((p) => (
            <li key={p.id} className="border-b border-line last:border-b-0">
              <Link href={`/admin/policies?edit=${p.id}`} className={`block px-4 py-3 text-[15px] ${p.id === current?.id ? 'bg-ink text-on-dark' : ''}`}>
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
        {current && (
          <Card>
            <form action={savePolicy} className="space-y-3">
              <input type="hidden" name="id" value={current.id} />
              <Input label="Title" name="title" defaultValue={current.title} required />
              <Textarea label="Body" name="body" defaultValue={current.body} rows={22} hint="Markdown: ## Heading, blank line between paragraphs, - lists." />
              <Submit>Save policy</Submit>
            </form>
          </Card>
        )}
      </div>
    </AdminPage>
  );
}
