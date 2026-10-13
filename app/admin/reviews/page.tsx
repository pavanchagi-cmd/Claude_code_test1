import { AdminPage, Card, Checkbox, Notice, Submit } from '@/components/admin/ui';
import { Stars } from '@/components/ui/stars';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import { answerQuestion, moderateReview } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff();
  const [reviews, questions, sp] = await Promise.all([
    db.review.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: { product: true }, take: 100 }),
    db.question.findMany({ orderBy: [{ answeredAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }], include: { product: true }, take: 100 }),
    searchParams,
  ]);
  return (
    <AdminPage title="Reviews & Q&A">
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <h2 className="mb-3 font-sans text-[19px] font-semibold">Reviews</h2>
      <div className="space-y-3">
        {reviews.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px] text-muted">
                {r.product.name} · {r.authorName}
                {r.verifiedBuyer ? ' · verified buyer' : ''} · {r.createdAt.toLocaleDateString('en-IN')}
              </p>
              <span className={`badge ${r.status === 'PENDING' ? 'bg-brass' : r.status === 'REJECTED' ? 'bg-warning' : ''}`}>{r.status}</span>
            </div>
            <Stars rating={r.rating} size={14} className="mt-2" />
            <p className="mt-2 font-semibold">{r.title}</p>
            <p className="text-[15px] text-body-2">{r.body}</p>
            <form action={moderateReview} className="mt-3 flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={r.id} />
              <Checkbox label="Feature on home page" name="featured" defaultChecked={r.featured} />
              <button name="status" value="APPROVED" className="btn btn-primary min-h-10 px-4 text-[14px]">
                Approve
              </button>
              <button name="status" value="REJECTED" className="btn btn-outline min-h-10 px-4 text-[14px]">
                Reject
              </button>
              <button name="status" value="DELETE" className="btn btn-outline min-h-10 px-4 text-[14px] text-warning">
                Delete
              </button>
            </form>
          </Card>
        ))}
      </div>
      <h2 id="questions" className="mt-8 mb-3 font-sans text-[19px] font-semibold">
        Questions
      </h2>
      <div className="space-y-3">
        {questions.map((q) => (
          <Card key={q.id}>
            <p className="text-[14px] text-muted">
              {q.product.name} · {q.askerName ?? 'Anonymous'} · {q.createdAt.toLocaleDateString('en-IN')}
            </p>
            <p className="mt-1 font-semibold">Q: {q.text}</p>
            <form action={answerQuestion} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={q.id} />
              <label htmlFor={`a-${q.id}`} className="sr-only">
                Answer
              </label>
              <textarea id={`a-${q.id}`} name="answer" defaultValue={q.answer ?? ''} rows={2} className="input min-h-0 text-[15px]" placeholder="Your answer" />
              <div className="flex flex-wrap items-center gap-3">
                <Checkbox label="Show on product page" name="isPublic" defaultChecked={q.isPublic} />
                <Submit>Save answer</Submit>
                <button name="delete" value="1" className="text-[14px] text-warning underline">
                  Delete
                </button>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
