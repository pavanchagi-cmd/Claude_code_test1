import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/product-form';
import { AdminPage, Card, Input, Notice, Select, Submit, Table, Td } from '@/components/admin/ui';
import { ProductImage } from '@/components/product/product-image';
import { requireStaff, rupees } from '@/lib/admin';
import { db } from '@/lib/db';
import { deleteImage, deleteVariant, moveImage, saveVariant, updateImage, uploadImage } from '../actions';

export const dynamic = 'force-dynamic';

const STRAPS = ['STEEL', 'LEATHER', 'RUBBER', 'NATO', 'MESH', 'OTHER'].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));
const ANGLES = ['FRONT', 'SIDE', 'CROWN', 'CASEBACK', 'CLASP', 'WRIST', 'OTHER'].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, brands, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { categories: true, variants: { orderBy: { createdAt: 'asc' } }, images: { orderBy: { sortOrder: 'asc' } } } }),
    db.brand.findMany({ orderBy: { name: 'asc' } }),
    db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  if (!product) notFound();
  const art = product.artDial ? { strap: product.artStrap ?? '#A9A59C', case: product.artCase ?? '#CFCBC2', dial: product.artDial } : null;

  return (
    <AdminPage
      title={product.name}
      actions={
        <Link href={`/watch/${product.slug}`} target="_blank" className="btn btn-outline min-h-10 px-4 text-[14.5px]">
          View on store
        </Link>
      }
    >
      {sp.saved && <Notice>Saved. The store page refreshes automatically.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      {product.variants.length === 0 && <Notice tone="warn">Add at least one variant with a price and stock before making the product live.</Notice>}

      <div id="variants" className="mb-5 scroll-mt-6">
        <Card title="Variants (strap / bracelet options)">
          <Table head={['SKU', 'Label', 'Strap', 'Price ₹', 'MRP ₹', 'Stock', 'Reserved', 'Default', '']}>
            {product.variants.map((v) => (
              <tr key={v.id}>
                <Td colSpan={9}>
                  <form action={saveVariant} className="grid items-end gap-2 md:grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.8fr_0.6fr_0.5fr_0.5fr_auto]">
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <input name="sku" defaultValue={v.sku} aria-label="SKU" className="input min-h-10 text-[14px]" />
                    <input name="label" defaultValue={v.label} aria-label="Label" className="input min-h-10 text-[14px]" />
                    <select name="strapType" defaultValue={v.strapType} aria-label="Strap type" className="input min-h-10 text-[14px]">
                      {STRAPS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <input name="price" defaultValue={rupees(v.pricePaise)} aria-label="Price in rupees" className="input min-h-10 text-[14px]" />
                    <input name="mrp" defaultValue={rupees(v.mrpPaise)} aria-label="MRP in rupees" className="input min-h-10 text-[14px]" />
                    <input name="stock" type="number" defaultValue={v.stock} aria-label="Stock" className="input min-h-10 text-[14px]" />
                    <span className="py-2 text-[14px] text-muted">{v.reserved}</span>
                    <input type="checkbox" name="isDefault" defaultChecked={v.isDefault} aria-label="Default variant" className="h-4 w-4 self-center" />
                    <span className="flex gap-1">
                      <Submit variant="outline">Save</Submit>
                    </span>
                  </form>
                  <form action={deleteVariant} className="mt-1 text-right">
                    <input type="hidden" name="id" value={v.id} />
                    <button className="text-[13px] text-warning underline">Delete variant</button>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
          <form action={saveVariant} className="mt-4 grid items-end gap-3 md:grid-cols-4">
            <input type="hidden" name="productId" value={product.id} />
            <Input label="SKU" name="sku" required />
            <Input label="Label" name="label" placeholder="Steel bracelet" required />
            <Select label="Strap type" name="strapType" options={STRAPS} defaultValue="OTHER" />
            <Input label="Strap colour" name="strapColour" />
            <Input label="Price (₹, incl. GST)" name="price" required />
            <Input label="MRP (₹, optional)" name="mrp" />
            <Input label="Stock" name="stock" type="number" defaultValue={0} />
            <label className="flex items-center gap-2 pb-3 text-[15px]">
              <input type="checkbox" name="isDefault" className="h-4 w-4" /> Default
            </label>
            <div className="md:col-span-4">
              <Submit>Add variant</Submit>
            </div>
          </form>
        </Card>
      </div>

      <div id="images" className="mb-5 scroll-mt-6">
        <Card title="Images (6–10 recommended: front, side, crown, caseback, clasp, on wrist)">
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {product.images.map((img, i) => (
              <li key={img.id} className="border border-line p-3">
                <div className="relative mb-3 aspect-square bg-stone">
                  <ProductImage url={img.url} alt={img.alt} art={art} sizes="240px" />
                </div>
                <form action={updateImage} className="space-y-2">
                  <input type="hidden" name="id" value={img.id} />
                  <input name="alt" defaultValue={img.alt} required aria-label="Alt text" className="input min-h-10 text-[14px]" />
                  <select name="angle" defaultValue={img.angle} aria-label="Angle" className="input min-h-10 text-[14px]">
                    {ANGLES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <Submit variant="outline">Save</Submit>
                </form>
                <div className="mt-2 flex gap-2 text-[13px]">
                  {i > 0 && (
                    <form action={moveImage}>
                      <input type="hidden" name="id" value={img.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button className="underline">Move up</button>
                    </form>
                  )}
                  {i < product.images.length - 1 && (
                    <form action={moveImage}>
                      <input type="hidden" name="id" value={img.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button className="underline">Move down</button>
                    </form>
                  )}
                  <form action={deleteImage} className="ml-auto">
                    <input type="hidden" name="id" value={img.id} />
                    <button className="text-warning underline">Delete</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <form action={uploadImage} className="mt-5 grid items-end gap-3 md:grid-cols-4">
            <input type="hidden" name="productId" value={product.id} />
            <div>
              <label htmlFor="img-file" className="label text-[13.5px]">
                Image (JPG, PNG, WebP, AVIF; under 8 MB)
              </label>
              <input id="img-file" type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="text-[14px]" />
            </div>
            <Input label="Alt text" name="alt" required placeholder="Automatic Diver, front view" />
            <Select label="Angle" name="angle" options={ANGLES} defaultValue="FRONT" />
            <Select
              label="Variant (optional)"
              name="variantId"
              options={[{ value: '', label: 'All variants' }, ...product.variants.map((v) => ({ value: v.id, label: v.label }))]}
            />
            <div className="md:col-span-4">
              <Submit>Upload image</Submit>
            </div>
          </form>
        </Card>
      </div>

      <ProductForm product={product} brands={brands} categories={categories} selected={product.categories.map((c) => c.id)} />
    </AdminPage>
  );
}
