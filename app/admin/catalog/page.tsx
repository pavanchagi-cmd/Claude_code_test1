import { AdminPage, Card, Checkbox, Input, Notice, Submit } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import { saveBrand, saveCategory } from '../actions';

export const dynamic = 'force-dynamic';

export default async function CatalogAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff();
  const [brands, categories, sp] = await Promise.all([db.brand.findMany({ orderBy: { name: 'asc' } }), db.category.findMany({ orderBy: { sortOrder: 'asc' } }), searchParams]);
  return (
    <AdminPage title="Brands & categories">
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Brands">
          <div className="space-y-3">
            {[...brands, null].map((b) => (
              <form key={b?.id ?? 'new'} action={saveBrand} className="grid items-end gap-2 border-b border-line pb-3 md:grid-cols-[1fr_1fr_auto]">
                {b && <input type="hidden" name="id" value={b.id} />}
                <Input label={b ? 'Name' : 'New brand'} name="name" defaultValue={b?.name} required />
                <Input label="Slug" name="slug" defaultValue={b?.slug} />
                <Submit variant={b ? 'outline' : 'primary'}>{b ? 'Save' : 'Add'}</Submit>
                <Input label="Description" name="description" defaultValue={b?.description} className="md:col-span-3" />
              </form>
            ))}
          </div>
        </Card>
        <Card title="Categories (featured ones appear in “Shop by style”)">
          <div className="space-y-3">
            {[...categories, null].map((c) => (
              <form key={c?.id ?? 'new'} action={saveCategory} className="grid items-end gap-2 border-b border-line pb-3 md:grid-cols-[1fr_1fr_90px_110px_auto]">
                {c && <input type="hidden" name="id" value={c.id} />}
                <Input label={c ? 'Name' : 'New category'} name="name" defaultValue={c?.name} required />
                <Input label="Slug" name="slug" defaultValue={c?.slug} />
                <Input label="Order" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} />
                <Input label="Tile colour" name="tileColor" defaultValue={c?.tileColor} placeholder="#15171A" />
                <Submit variant={c ? 'outline' : 'primary'}>{c ? 'Save' : 'Add'}</Submit>
                <div className="md:col-span-5">
                  <Checkbox label="Featured on home page" name="featured" defaultChecked={c?.featured} />
                </div>
              </form>
            ))}
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
