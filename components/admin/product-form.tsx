import { Card, Checkbox, Input, Select, Submit, Textarea } from '@/components/admin/ui';
import { saveProduct } from '@/app/admin/products/actions';
import type { Brand, Category, Product } from '@/lib/generated/prisma/client';

const opt = (vals: string[], blank?: string) => [
  ...(blank !== undefined ? [{ value: '', label: blank }] : []),
  ...vals.map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase().replace('_', '-') })),
];

export function ProductForm({
  product,
  brands,
  categories,
  selected,
}: {
  product: (Product & { categories?: Category[] }) | null;
  brands: Brand[];
  categories: Category[];
  selected: string[];
}) {
  const p = product;
  const n = (v: unknown) => (v === null || v === undefined ? '' : String(Number(v)));
  return (
    <form action={saveProduct} className="space-y-5">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Card title="Basics">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Name" name="name" defaultValue={p?.name} required className="md:col-span-2" />
          <Input label="Slug" name="slug" defaultValue={p?.slug} hint="Lowercase, e.g. automatic-diver-40mm-blue. Changing it keeps a 301 redirect." />
          <Select label="Brand" name="brandId" defaultValue={p?.brandId} options={brands.map((b) => ({ value: b.id, label: b.name }))} />
          <Input label="Reference no." name="reference" defaultValue={p?.reference} />
          <Select label="Badge" name="badge" defaultValue={p?.badge ?? ''} options={opt(['NEW', 'BESTSELLER', 'LIMITED', 'SALE'], 'None')} />
          <Select label="Gender" name="gender" defaultValue={p?.gender ?? 'UNISEX'} options={opt(['MEN', 'WOMEN', 'UNISEX'])} />
          <Select label="Condition" name="condition" defaultValue={p?.condition ?? 'NEW'} options={opt(['NEW', 'PRE_OWNED'])} />
          <Input label="Featured rank" name="featuredRank" type="number" defaultValue={p?.featuredRank ?? 0} hint="Higher shows first under “Featured”." />
        </div>
        <fieldset className="mt-4">
          <legend className="label text-[13.5px]">Categories</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-[15px]">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={selected.includes(c.id)} className="h-4 w-4" /> {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-6">
          <Checkbox label="Live on the store" name="isActive" defaultChecked={p?.isActive ?? false} />
          <Checkbox label="Accessory (strap, winder…)" name="isAccessory" defaultChecked={p?.isAccessory ?? false} />
        </div>
      </Card>

      <Card title="Specifications">
        <div className="grid gap-4 md:grid-cols-4">
          <Select label="Movement" name="movement" defaultValue={p?.movement ?? ''} options={opt(['AUTOMATIC', 'QUARTZ', 'MECHANICAL', 'SOLAR', 'SMART'], '—')} />
          <Input label="Calibre" name="calibre" defaultValue={p?.calibre} />
          <Input label="Power reserve (h)" name="powerReserveH" type="number" defaultValue={p?.powerReserveH} />
          <Input label="Weight (g)" name="weightG" type="number" defaultValue={p?.weightG} />
          <Input label="Case size (mm)" name="caseSizeMm" type="number" step="0.1" defaultValue={n(p?.caseSizeMm)} />
          <Input label="Thickness (mm)" name="caseThicknessMm" type="number" step="0.1" defaultValue={n(p?.caseThicknessMm)} />
          <Input label="Lug to lug (mm)" name="lugToLugMm" type="number" step="0.1" defaultValue={n(p?.lugToLugMm)} />
          <Input label="Lug width (mm)" name="lugWidthMm" type="number" defaultValue={p?.lugWidthMm} />
          <Input label="Case material" name="caseMaterial" defaultValue={p?.caseMaterial} placeholder="Stainless steel" />
          <Input label="Crystal" name="crystal" defaultValue={p?.crystal} placeholder="Sapphire" />
          <Input label="Water resistance (m)" name="waterResistanceM" type="number" defaultValue={p?.waterResistanceM} />
          <Input label="Dial colour" name="dialColour" defaultValue={p?.dialColour} placeholder="Blue" />
          <Input label="Dial detail" name="dialDetail" defaultValue={p?.dialDetail} placeholder="Blue, luminous indices" className="md:col-span-2" />
          <Input label="Strap summary" name="strapDetail" defaultValue={p?.strapDetail} placeholder="Steel" className="md:col-span-2" />
        </div>
      </Card>

      <Card title="Description">
        <div className="grid gap-4">
          <Textarea label="About this watch" name="description" defaultValue={p?.description} rows={6} hint="Blank line between paragraphs." />
          <Input label="In the box" name="inTheBox" defaultValue={p?.inTheBox} />
        </div>
      </Card>

      <Card title="Tax, warranty and SEO">
        <div className="grid gap-4 md:grid-cols-4">
          <Input label="GST rate (%)" name="gstRate" type="number" defaultValue={p?.gstRate ?? 18} hint="Confirm with your CA." />
          <Input label="HSN code" name="hsnCode" defaultValue={p?.hsnCode ?? '9102'} />
          <Input label="Warranty (months)" name="warrantyMonths" type="number" defaultValue={p?.warrantyMonths ?? 24} />
          <span />
          <Input label="SEO title" name="seoTitle" defaultValue={p?.seoTitle} className="md:col-span-2" />
          <Input label="SEO description" name="seoDescription" defaultValue={p?.seoDescription} className="md:col-span-2" />
        </div>
      </Card>

      <Card title="Placeholder art (used until photos are uploaded)">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Strap colour" name="artStrap" defaultValue={p?.artStrap} placeholder="#A9A59C" />
          <Input label="Case colour" name="artCase" defaultValue={p?.artCase} placeholder="#CFCBC2" />
          <Input label="Dial colour" name="artDial" defaultValue={p?.artDial} placeholder="#0F2A3A" />
        </div>
      </Card>
      <Submit>{p ? 'Save product' : 'Create product'}</Submit>
    </form>
  );
}
