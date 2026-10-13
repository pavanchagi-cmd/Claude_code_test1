'use client';

import { Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { WatchArt } from '@/components/product/watch-art';

type Hit = { slug: string; name: string; brand: string; price: string; image: string | null; art: { strap: string; case: string; dial: string } | null };

export function SearchBox({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  // Debounced autocomplete (300 ms).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          setHits(((await res.json()) as { results: Hit[] }).results);
          setOpen(true);
          setActive(-1);
        }
      } catch {
        /* aborted */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && hits[active]) go(`/watch/${hits[active].slug}`);
          else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <label className="flex h-[46px] items-center gap-2.5 border border-line-strong bg-surface px-3.5 focus-within:border-ink">
          <Search size={17} strokeWidth={1.8} className="shrink-0 text-muted" aria-hidden="true" />
          <span className="sr-only">Search watches and brands</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => hits.length && setOpen(true)}
            onKeyDown={(e) => {
              if (!open || !hits.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, hits.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, -1));
              } else if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="Search watches, brands…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          />
        </label>
      </form>
      {open && q.trim().length >= 2 && (
        <div id={listId} role="listbox" className="absolute top-full right-0 left-0 z-50 mt-1 min-w-[320px] border border-line bg-surface shadow-xl">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-[14px] text-muted">No watches match “{q.trim()}”.</p>
          ) : (
            hits.map((h, i) => (
              <Link
                key={h.slug}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={active === i}
                href={`/watch/${h.slug}`}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className={`flex items-center gap-3 px-3 py-2 ${active === i ? 'bg-ground' : 'hover:bg-ground'}`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-stone">
                  {h.image ? (
                    <Image src={h.image} alt="" width={48} height={48} className="h-12 w-12 object-cover" />
                  ) : h.art ? (
                    <WatchArt strap={h.art.strap} caseColor={h.art.case} dial={h.art.dial} className="h-10" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{h.name}</span>
                  <span className="block text-[13px] text-muted">
                    {h.brand} · {h.price}
                  </span>
                </span>
              </Link>
            ))
          )}
          <Link
            href={`/search?q=${encodeURIComponent(q.trim())}`}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={`block border-t border-line px-4 py-3 text-[14px] font-semibold ${active === hits.length ? 'bg-ground' : ''}`}
          >
            See all results
          </Link>
        </div>
      )}
    </div>
  );
}
