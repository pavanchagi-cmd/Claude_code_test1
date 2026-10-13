import { AdminPage, Card, Checkbox, Input, Notice, Select, Submit } from '@/components/admin/ui';
import { requireStaff, rupees } from '@/lib/admin';
import { db } from '@/lib/db';
import { saveCoupon } from '../actions';

export const dynamic = 'force-dynamic';

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 16) : '');

export default async function CouponsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff();
  const [coupons, sp] = await Promise.all([db.coupon.findMany({ orderBy: { createdAt: 'desc' } }), searchParams]);
  return (
    <AdminPage title="Coupons">
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <div className="space-y-4">
        {[null, ...coupons].map((c) => (
          <Card key={c?.id ?? 'new'} title={c ? `${c.code} · used ${c.usedCount}${c.usageLimit ? ` of ${c.usageLimit}` : ''}` : 'New coupon'}>
            <form action={saveCoupon} className="grid items-end gap-3 md:grid-cols-4">
              {c && <input type="hidden" name="id" value={c.id} />}
              <Input label="Code" name="code" defaultValue={c?.code} required />
              <Select
                label="Type"
                name="type"
                defaultValue={c?.type ?? 'PERCENT'}
                options={[
                  { value: 'PERCENT', label: 'Percent off' },
                  { value: 'FLAT', label: 'Flat ₹ off' },
                ]}
              />
              <Input label="Value (% or ₹)" name="value" defaultValue={c ? (c.type === 'FLAT' ? rupees(c.value) : c.value) : ''} required />
              <Input label="Min order (₹)" name="minOrder" defaultValue={c ? rupees(c.minOrderPaise) : ''} />
              <Input label="Max discount (₹)" name="maxDiscount" defaultValue={c ? rupees(c.maxDiscountPaise) : ''} />
              <Input label="Starts" name="startsAt" type="datetime-local" defaultValue={d(c?.startsAt ?? null)} />
              <Input label="Ends" name="endsAt" type="datetime-local" defaultValue={d(c?.endsAt ?? null)} />
              <Input label="Usage limit" name="usageLimit" type="number" defaultValue={c?.usageLimit} />
              <Checkbox label="Active" name="isActive" defaultChecked={c?.isActive ?? true} />
              <div className="md:col-span-3">
                <Submit>{c ? 'Save coupon' : 'Create coupon'}</Submit>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
