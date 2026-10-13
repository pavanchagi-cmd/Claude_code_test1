'use server';

import { redirect } from 'next/navigation';
import { bool, guarded, num, optNum, optStr, paise, requireStaff, revalidateCatalog, slugify, str } from '@/lib/admin';
import { db } from '@/lib/db';
import type { Badge, Condition, Gender, ImageAngle, Movement, StrapType } from '@/lib/generated/prisma/enums';
import { blob } from '@/lib/integrations/blob';
import { parseCsv } from '@/lib/csv';

const GENDERS: Gender[] = ['MEN', 'WOMEN', 'UNISEX'];
const MOVEMENTS: Movement[] = ['AUTOMATIC', 'QUARTZ', 'MECHANICAL', 'SOLAR', 'SMART'];
const BADGES: Badge[] = ['NEW', 'BESTSELLER', 'LIMITED', 'SALE'];
const STRAPS: StrapType[] = ['STEEL', 'LEATHER', 'RUBBER', 'NATO', 'MESH', 'OTHER'];
const ANGLES: ImageAngle[] = ['FRONT', 'SIDE', 'CROWN', 'CASEBACK', 'CLASP', 'WRIST', 'OTHER'];

function pick<T extends string>(v: string, allowed: T[]): T | null {
  return (allowed as string[]).includes(v) ? (v as T) : null;
}

function productData(fd: FormData) {
  const name = str(fd, 'name');
  if (name.length < 2) throw new Error('Name is required.');
  return {
    name,
    reference: optStr(fd, 'reference'),
    gender: pick(str(fd, 'gender'), GENDERS) ?? 'UNISEX',
    movement: pick(str(fd, 'movement'), MOVEMENTS),
    calibre: optStr(fd, 'calibre'),
    caseSizeMm: optNum(fd, 'caseSizeMm'),
    caseThicknessMm: optNum(fd, 'caseThicknessMm'),
    lugToLugMm: optNum(fd, 'lugToLugMm'),
    lugWidthMm: optNum(fd, 'lugWidthMm'),
    caseMaterial: optStr(fd, 'caseMaterial'),
    crystal: optStr(fd, 'crystal'),
    waterResistanceM: optNum(fd, 'waterResistanceM'),
    dialColour: optStr(fd, 'dialColour'),
    dialDetail: optStr(fd, 'dialDetail'),
    strapDetail: optStr(fd, 'strapDetail'),
    powerReserveH: optNum(fd, 'powerReserveH'),
    weightG: optNum(fd, 'weightG'),
    condition: (str(fd, 'condition') === 'PRE_OWNED' ? 'PRE_OWNED' : 'NEW') as Condition,
    description: optStr(fd, 'description'),
    inTheBox: optStr(fd, 'inTheBox'),
    warrantyMonths: num(fd, 'warrantyMonths', 24),
    gstRate: num(fd, 'gstRate', 18),
    hsnCode: str(fd, 'hsnCode') || '9102',
    badge: pick(str(fd, 'badge'), BADGES),
    isActive: bool(fd, 'isActive'),
    isAccessory: bool(fd, 'isAccessory'),
    featuredRank: num(fd, 'featuredRank', 0),
    seoTitle: optStr(fd, 'seoTitle'),
    seoDescription: optStr(fd, 'seoDescription'),
    artStrap: optStr(fd, 'artStrap'),
    artCase: optStr(fd, 'artCase'),
    artDial: optStr(fd, 'artDial'),
  };
}

export async function saveProduct(fd: FormData) {
  await guarded(optStr(fd, 'id') ? `/admin/products/${optStr(fd, 'id')}` : '/admin/products/new', async () => {
    await requireStaff();
    const id = optStr(fd, 'id');
    const data = productData(fd);
    const brandId = str(fd, 'brandId');
    const categoryIds = fd.getAll('categoryIds').map(String);
    let slug = slugify(str(fd, 'slug') || data.name);
    if (!slug) slug = slugify(data.name);

    if (id) {
      const existing = await db.product.findUniqueOrThrow({ where: { id } });
      if (existing.slug !== slug) {
        const clash = await db.product.findUnique({ where: { slug } });
        if (clash) throw new Error('Another product already uses this slug.');
        // Keep old links working: 301 from the previous slug.
        await db.slugRedirect.upsert({ where: { fromSlug: existing.slug }, create: { fromSlug: existing.slug, productId: id }, update: { productId: id } });
        await db.slugRedirect.deleteMany({ where: { fromSlug: slug } });
      }
      await db.product.update({ where: { id }, data: { ...data, slug, brandId, categories: { set: categoryIds.map((c) => ({ id: c })) } } });
      revalidateCatalog([existing.slug, slug]);
      redirect(`/admin/products/${id}?saved=1`);
    } else {
      if (await db.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
      const created = await db.product.create({ data: { ...data, slug, brandId, categories: { connect: categoryIds.map((c) => ({ id: c })) } } });
      revalidateCatalog([slug]);
      redirect(`/admin/products/${created.id}?saved=1`);
    }
  });
}

export async function saveVariant(fd: FormData) {
  await guarded(`/admin/products/${str(fd, 'productId')}`, async () => {
    await requireStaff();
    const productId = str(fd, 'productId');
    const id = optStr(fd, 'id');
    const price = paise(fd, 'price');
    if (!price || price <= 0) throw new Error('Price is required.');
    const data = {
      sku: str(fd, 'sku').toUpperCase(),
      label: str(fd, 'label') || 'Standard',
      strapType: pick(str(fd, 'strapType'), STRAPS) ?? 'OTHER',
      strapColour: optStr(fd, 'strapColour'),
      pricePaise: price,
      mrpPaise: paise(fd, 'mrp'),
      stock: Math.max(0, num(fd, 'stock', 0)),
      isDefault: bool(fd, 'isDefault'),
    };
    if (!data.sku) throw new Error('SKU is required.');
    await db.$transaction(async (tx) => {
      if (data.isDefault) await tx.variant.updateMany({ where: { productId }, data: { isDefault: false } });
      if (id) await tx.variant.update({ where: { id }, data });
      else await tx.variant.create({ data: { ...data, productId } });
    });
    const p = await db.product.findUnique({ where: { id: productId } });
    revalidateCatalog(p ? [p.slug] : []);
    redirect(`/admin/products/${productId}?saved=1#variants`);
  });
}

export async function deleteVariant(fd: FormData) {
  await requireStaff();
  const id = str(fd, 'id');
  const v = await db.variant.delete({ where: { id }, include: { product: true } });
  revalidateCatalog([v.product.slug]);
  redirect(`/admin/products/${v.productId}#variants`);
}

export async function uploadImage(fd: FormData) {
  await guarded(`/admin/products/${str(fd, 'productId')}`, async () => {
    await requireStaff();
    const productId = str(fd, 'productId');
    const file = fd.get('file');
    const alt = str(fd, 'alt');
    if (!alt) throw new Error('Alt text is required for every product image.');
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose an image to upload.');
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error('Use a JPG, PNG, WebP or AVIF image.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Images must be under 8 MB.');
    const { url } = await blob.upload(`products/${productId}/${file.name}`, Buffer.from(await file.arrayBuffer()), file.type);
    const count = await db.productImage.count({ where: { productId } });
    const p = await db.product.findUniqueOrThrow({ where: { id: productId } });
    await db.productImage.create({
      data: { productId, url, alt, angle: pick(str(fd, 'angle'), ANGLES) ?? 'OTHER', sortOrder: count, variantId: optStr(fd, 'variantId') },
    });
    revalidateCatalog([p.slug]);
    redirect(`/admin/products/${productId}?saved=1#images`);
  });
}

export async function updateImage(fd: FormData) {
  await guarded('/admin/products', async () => {
    await requireStaff();
    const id = str(fd, 'id');
    const alt = str(fd, 'alt');
    if (!alt) throw new Error('Alt text is required.');
    const img = await db.productImage.update({ where: { id }, data: { alt, angle: pick(str(fd, 'angle'), ANGLES) ?? undefined }, include: { product: true } });
    revalidateCatalog([img.product.slug]);
    redirect(`/admin/products/${img.productId}#images`);
  });
}

export async function moveImage(fd: FormData) {
  await requireStaff();
  const id = str(fd, 'id');
  const dir = str(fd, 'dir') === 'up' ? -1 : 1;
  const img = await db.productImage.findUniqueOrThrow({ where: { id }, include: { product: true } });
  const all = await db.productImage.findMany({ where: { productId: img.productId }, orderBy: { sortOrder: 'asc' } });
  const idx = all.findIndex((x) => x.id === id);
  const swap = all[idx + dir];
  if (swap) {
    await db.$transaction(
      all.map((x, i) => {
        const order = x.id === id ? idx + dir : x.id === swap.id ? idx : i;
        return db.productImage.update({ where: { id: x.id }, data: { sortOrder: order } });
      }),
    );
  }
  revalidateCatalog([img.product.slug]);
  redirect(`/admin/products/${img.productId}#images`);
}

export async function deleteImage(fd: FormData) {
  await requireStaff();
  const img = await db.productImage.delete({ where: { id: str(fd, 'id') }, include: { product: true } });
  revalidateCatalog([img.product.slug]);
  redirect(`/admin/products/${img.productId}#images`);
}

/**
 * Bulk CSV import. One row per variant; rows sharing a slug become one product.
 * Columns: name,slug,brand,category,gender,movement,caseSizeMm,caseMaterial,dialColour,
 * strapDetail,waterResistanceM,sku,variantLabel,strapType,price,mrp,stock,gstRate,hsnCode,description
 */
export async function importCsv(fd: FormData) {
  await requireStaff();
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) redirect('/admin/products/import?error=' + encodeURIComponent('Choose a CSV file.'));
  if (file.size > 2 * 1024 * 1024) redirect('/admin/products/import?error=' + encodeURIComponent('CSV must be under 2 MB.'));
  const rows = parseCsv(await file.text());
  let created = 0;
  let variants = 0;
  const errors: string[] = [];
  for (const [i, r] of rows.entries()) {
    try {
      const name = r.name?.trim();
      const sku = r.sku?.trim().toUpperCase();
      const price = Number((r.price ?? '').replace(/[₹,\s]/g, ''));
      if (!name || !sku || !Number.isFinite(price) || price <= 0) throw new Error('name, sku and price are required');
      const slug = slugify(r.slug || name);
      const brandName = r.brand?.trim() || '[Brand]';
      const brand = await db.brand.upsert({ where: { slug: slugify(brandName) }, create: { name: brandName, slug: slugify(brandName) }, update: {} });
      let product = await db.product.findUnique({ where: { slug } });
      if (!product) {
        const catSlugs = (r.category ?? '')
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean);
        for (const c of catSlugs) await db.category.upsert({ where: { slug: slugify(c) }, create: { name: c, slug: slugify(c) }, update: {} });
        product = await db.product.create({
          data: {
            name,
            slug,
            brandId: brand.id,
            gender: pick((r.gender ?? '').toUpperCase(), GENDERS) ?? 'UNISEX',
            movement: pick((r.movement ?? '').toUpperCase(), MOVEMENTS),
            caseSizeMm: r.caseSizeMm ? Number(r.caseSizeMm) : null,
            caseMaterial: r.caseMaterial || null,
            dialColour: r.dialColour || null,
            strapDetail: r.strapDetail || null,
            waterResistanceM: r.waterResistanceM ? Number(r.waterResistanceM) : null,
            gstRate: r.gstRate ? Number(r.gstRate) : 18,
            hsnCode: r.hsnCode || '9102',
            description: r.description || null,
            isActive: false, // review and add images before publishing
            categories: { connect: catSlugs.map((c) => ({ slug: slugify(c) })) },
          },
        });
        created++;
      }
      await db.variant.upsert({
        where: { sku },
        create: {
          productId: product.id,
          sku,
          label: r.variantLabel || 'Standard',
          strapType: pick((r.strapType ?? '').toUpperCase(), STRAPS) ?? 'OTHER',
          pricePaise: Math.round(price * 100),
          mrpPaise: r.mrp ? Math.round(Number(r.mrp) * 100) : null,
          stock: Number(r.stock ?? 0) || 0,
        },
        update: { pricePaise: Math.round(price * 100), mrpPaise: r.mrp ? Math.round(Number(r.mrp) * 100) : null, stock: Number(r.stock ?? 0) || 0 },
      });
      variants++;
    } catch (e) {
      errors.push(`Row ${i + 2}: ${(e as Error).message}`);
    }
  }
  revalidateCatalog();
  const q = new URLSearchParams({ created: String(created), variants: String(variants) });
  if (errors.length) q.set('error', errors.slice(0, 10).join('\n'));
  redirect(`/admin/products/import?${q}`);
}
