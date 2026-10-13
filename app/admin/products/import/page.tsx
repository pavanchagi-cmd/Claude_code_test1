import { AdminPage, Card, Notice, Submit } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { importCsv } from '../actions';

const COLUMNS =
  'name,slug,brand,category,gender,movement,caseSizeMm,caseMaterial,dialColour,strapDetail,waterResistanceM,sku,variantLabel,strapType,price,mrp,stock,gstRate,hsnCode,description';

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ created?: string; variants?: string; error?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  return (
    <AdminPage title="Import products from CSV">
      {sp.created !== undefined && (
        <Notice>
          Imported {sp.created} new products and {sp.variants} variants. New products are hidden until you add images and publish them.
        </Notice>
      )}
      {sp.error && (
        <Notice tone="warn">
          <span className="whitespace-pre-line">{sp.error}</span>
        </Notice>
      )}
      <Card>
        <p className="text-[15px] text-body-2">
          One row per variant. Rows with the same slug become one product. Prices in rupees, GST-inclusive. Separate multiple categories with “|”.
        </p>
        <pre className="mt-3 overflow-x-auto bg-stone p-3 text-[13px]">{COLUMNS}</pre>
        <form action={importCsv} className="mt-5 flex flex-wrap items-center gap-3">
          <label htmlFor="csv" className="sr-only">
            CSV file
          </label>
          <input id="csv" type="file" name="file" accept=".csv,text/csv" required className="text-[15px]" />
          <Submit>Import</Submit>
        </form>
      </Card>
    </AdminPage>
  );
}
