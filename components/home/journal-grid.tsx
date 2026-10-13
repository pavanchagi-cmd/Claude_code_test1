'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export type JournalCard = {
  id: string;
  slug: string;
  title: string;
  category: string;
  coverImage: string | null;
  coverColor: string | null;
  readingMin: number;
  publishedAt: string | null;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '[DATE]');

export function JournalGrid({ initial, hasMore: initialMore, category }: { initial: JournalCard[]; hasMore: boolean; category: string | null }) {
  const [posts, setPosts] = useState(initial);
  const [hasMore, setHasMore] = useState(initialMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  return (
    <>
      <ul className="grid gap-x-6 gap-y-10 md:grid-cols-3" aria-live="polite">
        {posts.map((p) => (
          <li key={p.id}>
            <Link href={`/journal/${p.slug}`} className="group block">
              <div className="relative aspect-[395/296]" style={{ backgroundColor: p.coverColor ?? 'var(--color-placeholder)' }}>
                {p.coverImage && <Image src={p.coverImage} alt="" fill sizes="(min-width:768px) 395px, 100vw" className="object-cover" />}
              </div>
              <p className="eyebrow mt-4">{p.category}</p>
              <h2 className="mt-3 font-display text-[25px] leading-[1.2] group-hover:text-brass">{p.title}</h2>
              <p className="mt-3 text-[14.5px] text-muted">
                {fmt(p.publishedAt)} · {p.readingMin} min read
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="mt-12 text-center">
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              const next = page + 1;
              const res = await fetch(`/api/journal?page=${next}${category ? `&category=${encodeURIComponent(category)}` : ''}`);
              const json = (await res.json()) as { posts: JournalCard[]; hasMore: boolean };
              setPosts((p) => [...p, ...json.posts]);
              setHasMore(json.hasMore);
              setPage(next);
              setLoading(false);
            }}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
