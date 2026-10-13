import { AdminPage, Card, Input, Notice, Submit, Textarea } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import { saveFaq } from '../actions';

export const dynamic = 'force-dynamic';

export default async function FaqAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff();
  const [faqs, sp] = await Promise.all([db.faq.findMany({ orderBy: { sortOrder: 'asc' } }), searchParams]);
  return (
    <AdminPage title="FAQ">
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <div className="space-y-3">
        {[...faqs, null].map((f) => (
          <Card key={f?.id ?? 'new'} title={f ? undefined : 'Add a question'}>
            <form action={saveFaq} className="grid gap-3 md:grid-cols-[1fr_100px]">
              {f && <input type="hidden" name="id" value={f.id} />}
              <Input label="Question" name="question" defaultValue={f?.question} required />
              <Input label="Order" name="sortOrder" type="number" defaultValue={f?.sortOrder ?? faqs.length} />
              <Textarea label="Answer" name="answer" defaultValue={f?.answer} rows={3} required className="md:col-span-2" />
              <div className="flex gap-3">
                <Submit>{f ? 'Save' : 'Add'}</Submit>
                {f && (
                  <button name="delete" value="1" className="text-[14px] text-warning underline">
                    Delete
                  </button>
                )}
              </div>
            </form>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
