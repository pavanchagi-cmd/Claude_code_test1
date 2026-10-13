import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';

// Editable content blocks (About page, home story, etc.). Defaults keep the
// mockup's placeholders visible until the owner edits them in admin.
export const CONTENT_DEFAULTS = {
  'home.story': {
    eyebrow: 'Our story',
    title: '[Why you started selling watches]',
    body: '[Two or three sentences about who you are, where you source from, and what you promise every customer.]',
    imageUrl: '',
    linkLabel: 'Read our story',
  },
  'about.hero': {
    eyebrow: 'About [Brand]',
    title: '[Your mission in one sentence]',
    body: '[Where you started, when, and why. Personal stories build trust with watch buyers, so make it yours.]',
  },
  'about.story': {
    title: 'Our story',
    imageUrl: '',
    paragraphs: ['[Paragraph 1: the moment that got you into watches.]', '[Paragraph 2: how you choose what you sell and who you sell it for.]'],
  },
  'about.values': {
    title: 'What we stand for',
    items: [
      { title: 'Only genuine pieces', body: '[How you source: authorised distributors, direct from brands, or verified pre-owned.]' },
      { title: 'Honest advice', body: '[How you help customers choose the right watch, not just the most expensive one.]' },
      { title: 'Care after purchase', body: '[Warranty, servicing and support you offer long after delivery.]' },
    ],
  },
  'about.authenticity': {
    eyebrow: 'Authenticity promise',
    title: 'How we guarantee every watch is genuine',
    steps: [
      { title: 'Trusted sourcing', body: '[Authorised dealer status / direct brand partnerships.]' },
      { title: 'Inspection', body: '[What you check: serial, movement, finishing, papers.]' },
      { title: 'Certificate', body: 'Every watch ships with a signed authenticity certificate.' },
      { title: 'Guarantee', body: '[What happens if a watch is ever found not genuine, e.g. full refund.]' },
    ],
  },
  'about.service': {
    title: 'Warranty & service',
    body: '[X]-year warranty on every watch. We also handle battery replacement, bracelet sizing, strap changes and full servicing through [service partner / in-house workshop].',
    linkLabel: 'Book a service',
    linkHref: '/help#contact',
  },
  'about.visit': {
    title: 'Visit us',
    lines: ['[Store / studio address, if you have one]', '[Opening hours]', 'By appointment: [+91 NUMBER]'],
  },
  newsletter: {
    title: 'First look at new drops',
    body: 'Join the list for early access to limited pieces and [YOUR SIGNUP OFFER].',
  },
} as const;

export type ContentKey = keyof typeof CONTENT_DEFAULTS;
type Widen<T> = T extends string ? string : T extends readonly (infer U)[] ? Widen<U>[] : T extends object ? { -readonly [K in keyof T]: Widen<T[K]> } : T;
export type ContentOf<K extends ContentKey> = Widen<(typeof CONTENT_DEFAULTS)[K]>;

export const getContent = cache(async <K extends ContentKey>(key: K): Promise<ContentOf<K>> => {
  const fallback = CONTENT_DEFAULTS[key] as unknown as ContentOf<K>;
  try {
    const row = await db.contentBlock.findUnique({ where: { key } });
    if (!row) return fallback;
    return { ...fallback, ...(row.data as object) } as ContentOf<K>;
  } catch {
    return fallback;
  }
});
