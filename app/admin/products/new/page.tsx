import { ProductForm } from '@/components/admin/product-form';
import { AdminPage, Notice } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const [brands, categories, sp] = await Promise.all([db.brand.findMany({ orderBy: { name: 'asc' } }), db.category.findMany({ orderBy: { sortOrder: 'asc' } }), searchParams]);
  return (
    <AdminPage title="Add product">
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <Notice>Create the product first, then add variants (price, stock) and images. Keep it hidden until it is ready.</Notice>
      <ProductForm product={null} brands={brands} categories={categories} selected={[]} />
    </AdminPage>
  );
}
