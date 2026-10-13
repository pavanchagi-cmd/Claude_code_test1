'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { bool, guarded, num, optNum, optStr, paise, requireAdmin, requireStaff, revalidateCatalog, slugify, str } from '@/lib/admin';
import { CONTENT_DEFAULTS, type ContentKey } from '@/lib/content';
import { db } from '@/lib/db';
import { blob } from '@/lib/integrations/blob';

// ───────── Brands & categories ─────────

export async function saveBrand(fd: FormData) {
  await guarded('/admin/catalog', async () => {
    await requireStaff();
    const id = optStr(fd, 'id');
    const name = str(fd, 'name');
    if (!name) throw new Error('Brand name is required.');
    const data = { name, slug: slugify(str(fd, 'slug') || name), description: optStr(fd, 'description'), logo: optStr(fd, 'logo') };
    if (id) await db.brand.update({ where: { id }, data });
    else await db.brand.create({ data });
    revalidateCatalog();
    redirect('/admin/catalog?saved=1');
  });
}

export async function saveCategory(fd: FormData) {
  await guarded('/admin/catalog', async () => {
    await requireStaff();
    const id = optStr(fd, 'id');
    const name = str(fd, 'name');
    if (!name) throw new Error('Category name is required.');
    const data = {
      name,
      slug: slugify(str(fd, 'slug') || name),
      featured: bool(fd, 'featured'),
      sortOrder: num(fd, 'sortOrder'),
      tileColor: optStr(fd, 'tileColor'),
      description: optStr(fd, 'description'),
    };
    if (id) await db.category.update({ where: { id }, data });
    else await db.category.create({ data });
    revalidateCatalog();
    redirect('/admin/catalog?saved=1');
  });
}

// ───────── Coupons ─────────

export async function saveCoupon(fd: FormData) {
  await guarded('/admin/coupons', async () => {
    await requireStaff();
    const id = optStr(fd, 'id');
    const code = str(fd, 'code').toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new Error('Codes are 3–30 letters, numbers, - or _.');
    const type = str(fd, 'type') === 'FLAT' ? 'FLAT' : 'PERCENT';
    const value = type === 'FLAT' ? (paise(fd, 'value') ?? 0) : num(fd, 'value');
    if (type === 'PERCENT' && (value < 1 || value > 90)) throw new Error('Percent discounts must be 1–90.');
    if (type === 'FLAT' && value <= 0) throw new Error('Enter the flat discount in rupees.');
    const data = {
      code,
      type: type as 'FLAT' | 'PERCENT',
      value,
      minOrderPaise: paise(fd, 'minOrder') ?? 0,
      maxDiscountPaise: paise(fd, 'maxDiscount'),
      startsAt: optStr(fd, 'startsAt') ? new Date(str(fd, 'startsAt')) : null,
      endsAt: optStr(fd, 'endsAt') ? new Date(str(fd, 'endsAt')) : null,
      usageLimit: optNum(fd, 'usageLimit'),
      isActive: bool(fd, 'isActive'),
    };
    if (id) await db.coupon.update({ where: { id }, data });
    else await db.coupon.create({ data });
    redirect('/admin/coupons?saved=1');
  });
}

// ───────── Reviews & questions ─────────

async function refreshRating(productId: string) {
  const agg = await db.review.aggregate({ where: { productId, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
  const p = await db.product.update({ where: { id: productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  revalidateCatalog([p.slug]);
}

export async function moderateReview(fd: FormData) {
  await guarded('/admin/reviews', async () => {
    await requireStaff();
    const id = str(fd, 'id');
    const status = str(fd, 'status');
    if (status === 'DELETE') {
      const r = await db.review.delete({ where: { id } });
      await refreshRating(r.productId);
    } else {
      const r = await db.review.update({ where: { id }, data: { status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED', featured: bool(fd, 'featured') } });
      await refreshRating(r.productId);
    }
    redirect('/admin/reviews?saved=1');
  });
}

export async function answerQuestion(fd: FormData) {
  await guarded('/admin/reviews', async () => {
    await requireStaff();
    const id = str(fd, 'id');
    if (str(fd, 'delete') === '1') {
      await db.question.delete({ where: { id } });
    } else {
      const answer = optStr(fd, 'answer');
      const q = await db.question.update({ where: { id }, data: { answer, answeredAt: answer ? new Date() : null, isPublic: bool(fd, 'isPublic') }, include: { product: true } });
      revalidateCatalog([q.product.slug]);
    }
    redirect('/admin/reviews?saved=1#questions');
  });
}

// ───────── Journal ─────────

export async function savePost(fd: FormData) {
  const id = optStr(fd, 'id');
  await guarded(id ? `/admin/posts/${id}` : '/admin/posts/new', async () => {
    await requireStaff();
    const title = str(fd, 'title');
    const body = str(fd, 'body');
    if (!title || !body) throw new Error('Title and body are required.');
    let coverImage = optStr(fd, 'coverImage');
    const file = fd.get('coverFile');
    if (file instanceof File && file.size > 0) {
      if (!/^image\//.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Cover must be an image under 8 MB.');
      coverImage = (await blob.upload(`journal/${file.name}`, Buffer.from(await file.arrayBuffer()), file.type)).url;
    }
    const words = body.split(/\s+/).length;
    const data = {
      title,
      slug: slugify(str(fd, 'slug') || title),
      category: str(fd, 'category') || 'Guides',
      excerpt: optStr(fd, 'excerpt'),
      coverImage,
      coverColor: optStr(fd, 'coverColor'),
      body,
      readingMin: optNum(fd, 'readingMin') ?? Math.max(1, Math.round(words / 220)),
      featured: bool(fd, 'featured'),
      publishedAt: bool(fd, 'published') ? (optStr(fd, 'publishedAt') ? new Date(str(fd, 'publishedAt')) : new Date()) : null,
      seoTitle: optStr(fd, 'seoTitle'),
      seoDescription: optStr(fd, 'seoDescription'),
      relatedProductSlugs: str(fd, 'related')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const saved = id ? await db.post.update({ where: { id }, data }) : await db.post.create({ data });
    revalidatePath('/journal');
    revalidatePath(`/journal/${saved.slug}`);
    revalidatePath('/');
    redirect(`/admin/posts/${saved.id}?saved=1`);
  });
}

export async function deletePost(fd: FormData) {
  await requireStaff();
  await db.post.delete({ where: { id: str(fd, 'id') } });
  revalidatePath('/journal');
  redirect('/admin/posts');
}

// ───────── FAQ & policies ─────────

export async function saveFaq(fd: FormData) {
  await guarded('/admin/faqs', async () => {
    await requireStaff();
    const id = optStr(fd, 'id');
    if (str(fd, 'delete') === '1' && id) await db.faq.delete({ where: { id } });
    else {
      const data = { question: str(fd, 'question'), answer: str(fd, 'answer'), sortOrder: num(fd, 'sortOrder') };
      if (!data.question || !data.answer) throw new Error('Question and answer are required.');
      if (id) await db.faq.update({ where: { id }, data });
      else await db.faq.create({ data });
    }
    revalidatePath('/help');
    redirect('/admin/faqs?saved=1');
  });
}

export async function savePolicy(fd: FormData) {
  const id = str(fd, 'id');
  await guarded(`/admin/policies?edit=${id}`, async () => {
    await requireStaff();
    const p = await db.policy.update({ where: { id }, data: { title: str(fd, 'title'), body: str(fd, 'body') } });
    revalidatePath(`/policies/${p.slug}`);
    redirect('/admin/policies?saved=1');
  });
}

// ───────── Page content blocks ─────────

export async function saveContent(fd: FormData) {
  const key = str(fd, 'key') as ContentKey;
  await guarded(`/admin/content?key=${key}`, async () => {
    await requireStaff();
    if (!(key in CONTENT_DEFAULTS)) throw new Error('Unknown content block.');
    let data: unknown;
    try {
      data = JSON.parse(str(fd, 'json'));
    } catch {
      throw new Error('That is not valid JSON. Check quotes and commas.');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Content must be a JSON object.');
    await db.contentBlock.upsert({ where: { key }, create: { key, data: data as object }, update: { data: data as object } });
    revalidatePath('/', 'layout');
    redirect(`/admin/content?key=${key}&saved=1`);
  });
}

export async function saveInstagram(fd: FormData) {
  await guarded('/admin/content', async () => {
    await requireStaff();
    const id = str(fd, 'id');
    let url = optStr(fd, 'url') ?? '';
    const file = fd.get('file');
    if (file instanceof File && file.size > 0) {
      if (!/^image\//.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Use an image under 8 MB.');
      url = (await blob.upload(`instagram/${file.name}`, Buffer.from(await file.arrayBuffer()), file.type)).url;
    }
    const alt = str(fd, 'alt');
    if (url && !alt) throw new Error('Alt text is required.');
    await db.instagramImage.update({ where: { id }, data: { url, alt: alt || '[Customer photo]', link: optStr(fd, 'link') } });
    revalidatePath('/');
    redirect('/admin/content?saved=1');
  });
}

// ───────── Tickets ─────────

export async function resolveTicket(fd: FormData) {
  await requireStaff();
  await db.supportTicket.update({ where: { id: str(fd, 'id') }, data: { status: str(fd, 'status') === 'OPEN' ? 'OPEN' : 'RESOLVED' } });
  redirect('/admin/tickets');
}

// ───────── Site settings (ADMIN only) ─────────

export async function saveSettings(fd: FormData) {
  await guarded('/admin/settings', async () => {
    await requireAdmin();
    const trustItems = [0, 1, 2, 3, 4].map((i) => ({ title: str(fd, `trust${i}Title`), subtitle: str(fd, `trust${i}Sub`) })).filter((t) => t.title);
    const data = {
      brandName: str(fd, 'brandName') || '[BRAND]',
      brandDescription: str(fd, 'brandDescription'),
      announcement: str(fd, 'announcement'),
      supportPhone: str(fd, 'supportPhone'),
      whatsappNumber: str(fd, 'whatsappNumber'),
      supportEmail: str(fd, 'supportEmail'),
      supportHours: str(fd, 'supportHours'),
      instagramHandle: str(fd, 'instagramHandle').replace(/^@/, ''),
      freeShippingThresholdPaise: paise(fd, 'freeShippingThreshold') ?? 0,
      shippingFeePaise: paise(fd, 'shippingFee') ?? 0,
      codLimitPaise: paise(fd, 'codLimit') ?? 0,
      codFeePaise: paise(fd, 'codFee') ?? 0,
      giftWrapPaise: paise(fd, 'giftWrap') ?? 0,
      returnWindowDays: num(fd, 'returnWindowDays'),
      warrantyYears: str(fd, 'warrantyYears') || '[X]',
      legalEntityName: str(fd, 'legalEntityName'),
      gstin: str(fd, 'gstin').toUpperCase(),
      registeredAddress: str(fd, 'registeredAddress'),
      sellerState: str(fd, 'sellerState'),
      trustItems,
      grievanceOfficer: {
        name: str(fd, 'goName'),
        designation: str(fd, 'goDesignation'),
        email: str(fd, 'goEmail'),
        phone: str(fd, 'goPhone'),
        address: str(fd, 'goAddress'),
        responseTime: str(fd, 'goResponse'),
      },
      hero: {
        eyebrow: str(fd, 'heroEyebrow'),
        headline: str(fd, 'heroHeadline'),
        body: str(fd, 'heroBody'),
        primaryCta: { label: str(fd, 'heroCta1Label'), href: str(fd, 'heroCta1Href') || '/watches' },
        secondaryCta: { label: str(fd, 'heroCta2Label'), href: str(fd, 'heroCta2Href') || '/about' },
        imageUrl: optStr(fd, 'heroImageUrl'),
        videoUrl: optStr(fd, 'heroVideoUrl'),
      },
    };
    await db.siteSettings.upsert({ where: { id: 'default' }, create: { id: 'default', ...data }, update: data });
    revalidatePath('/', 'layout');
    redirect('/admin/settings?saved=1');
  });
}
