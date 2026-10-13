import Image from 'next/image';
import Link from 'next/link';
import { AdminPage, Card, Input, Notice, Submit } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { CONTENT_DEFAULTS, getContent, type ContentKey } from '@/lib/content';
import { db } from '@/lib/db';
import { saveContent, saveInstagram } from '../actions';

export const dynamic = 'force-dynamic';

const LABELS: Record<ContentKey, string> = {
  'home.story': 'Home · brand story',
  'about.hero': 'About · hero',
  'about.story': 'About · our story',
  'about.values': 'About · values',
  'about.authenticity': 'About · authenticity steps',
  'about.service': 'About · warranty & service',
  'about.visit': 'About · visit us',
  newsletter: 'Newsletter band',
};

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ key?: string; saved?: string; error?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const keys = Object.keys(CONTENT_DEFAULTS) as ContentKey[];
  const key = keys.includes(sp.key as ContentKey) ? (sp.key as ContentKey) : keys[0];
  const [value, instagram] = await Promise.all([getContent(key), db.instagramImage.findMany({ orderBy: { sortOrder: 'asc' } })]);
  return (
    <AdminPage title="Page content">
      <Notice>The home hero, trust strip and announcement bar are edited in Site settings. Edit text below; keep the JSON keys as they are.</Notice>
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <div className="grid gap-5 md:grid-cols-[230px_1fr]">
        <ul className="self-start border border-line bg-surface">
          {keys.map((k) => (
            <li key={k} className="border-b border-line last:border-b-0">
              <Link href={`/admin/content?key=${k}`} className={`block px-4 py-3 text-[15px] ${k === key ? 'bg-ink text-on-dark' : ''}`}>
                {LABELS[k]}
              </Link>
            </li>
          ))}
        </ul>
        <Card title={LABELS[key]}>
          <form action={saveContent} className="space-y-3">
            <input type="hidden" name="key" value={key} />
            <label htmlFor="json" className="label text-[13.5px]">
              Content (JSON)
            </label>
            <textarea id="json" name="json" rows={18} defaultValue={JSON.stringify(value, null, 2)} className="input min-h-0 font-mono text-[13.5px]" spellCheck={false} />
            <Submit>Save content</Submit>
          </form>
        </Card>
      </div>
      <h2 className="mt-8 mb-3 font-sans text-[19px] font-semibold">“On the wrist” Instagram grid</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {instagram.map((img) => (
          <Card key={img.id}>
            <div className="relative mb-3 aspect-square bg-placeholder">{img.url && <Image src={img.url} alt={img.alt} fill sizes="300px" className="object-cover" />}</div>
            <form action={saveInstagram} className="space-y-2">
              <input type="hidden" name="id" value={img.id} />
              <input type="file" name="file" accept="image/*" aria-label="Upload photo" className="text-[13px]" />
              <Input label="Alt text" name="alt" defaultValue={img.alt} />
              <Input label="Link (optional)" name="link" defaultValue={img.link} />
              <input type="hidden" name="url" value={img.url} />
              <Submit variant="outline">Save</Submit>
            </form>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
