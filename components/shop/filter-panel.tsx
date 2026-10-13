'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Facet } from '@/lib/catalog';
import { FILTER_KEYS, serializeFilters, type FilterKey, type ShopFilters } from '@/lib/filters';

type Selected = Record<FilterKey, string[]>;

function pick(f: ShopFilters): Selected {
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, f[k]])) as Selected;
}

function FacetList({ facets, selected, onToggle, idPrefix }: { facets: Facet[]; selected: Selected; onToggle: (k: FilterKey, v: string) => void; idPrefix: string }) {
  return (
    <>
      {facets.map((facet) => (
        <fieldset key={facet.key} className="border-t border-line py-4">
          <legend className="float-left w-full pb-3 text-[13.5px] font-bold tracking-[0.12em] uppercase">{facet.label}</legend>
          <ul className="clear-both space-y-1">
            {facet.options.map((o) => {
              const id = `${idPrefix}-${facet.key}-${o.value}`;
              const checked = selected[facet.key].includes(o.value);
              const disabled = o.count === 0 && !checked;
              return (
                <li key={o.value}>
                  <label htmlFor={id} className={`flex min-h-[34px] cursor-pointer items-center gap-3 text-[15px] ${disabled ? 'text-muted/70' : ''}`}>
                    <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(facet.key, o.value)} className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1">{o.label}</span>
                    <span className="text-[13px] text-muted">{o.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </>
  );
}

export function FilterPanel({ facets, filters }: { facets: Facet[]; filters: ShopFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Selected>(pick(filters));
  // Optimistic: tick boxes immediately while the new URL loads (the panel remounts per URL).
  const [live, setLive] = useState<Selected>(pick(filters));

  const navigate = (sel: Selected) => {
    setLive(sel);
    const url = pathname + serializeFilters({ ...sel, sort: filters.sort, q: filters.q, page: 1 });
    startTransition(() => router.push(url, { scroll: false }));
  };

  const toggle = (sel: Selected, k: FilterKey, v: string): Selected => ({
    ...sel,
    [k]: sel[k].includes(v) ? sel[k].filter((x) => x !== v) : [...sel[k], v],
  });

  const empty = Object.fromEntries(FILTER_KEYS.map((k) => [k, []])) as unknown as Selected;
  const activeCount = FILTER_KEYS.reduce((a, k) => a + filters[k].length, 0);

  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside className="hidden self-start border border-line bg-surface px-5 pt-5 pb-2 md:block" aria-label="Filters" aria-busy={pending}>
        <div className="flex items-center justify-between pb-4">
          <h2 className="font-sans text-[17px] font-semibold">Filters</h2>
          {activeCount > 0 && (
            <button type="button" className="link text-[15px] text-brass" onClick={() => navigate(empty)}>
              Clear all
            </button>
          )}
        </div>
        <FacetList facets={facets} selected={live} onToggle={(k, v) => navigate(toggle(live, k, v))} idPrefix="d" />
      </aside>

      {/* Mobile bottom sheet */}
      <Dialog.Root
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (o) setDraft(pick(filters));
        }}
      >
        <Dialog.Trigger className="btn btn-outline w-full md:hidden">
          <SlidersHorizontal size={18} strokeWidth={1.6} aria-hidden="true" /> Filters{activeCount ? ` (${activeCount})` : ''}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col bg-surface focus:outline-none">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <Dialog.Title className="font-sans text-[18px] font-semibold">Filters</Dialog.Title>
              <Dialog.Close className="-mr-2 inline-flex h-11 w-11 items-center justify-center" aria-label="Close filters">
                <X size={22} strokeWidth={1.6} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Choose filters, then apply them.</Dialog.Description>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              <FacetList facets={facets} selected={draft} onToggle={(k, v) => setDraft((d) => toggle(d, k, v))} idPrefix="m" />
            </div>
            <div className="flex gap-3 border-t border-line p-4">
              <button type="button" className="btn btn-outline flex-1" onClick={() => setDraft(empty)}>
                Clear all
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={() => {
                  setSheetOpen(false);
                  navigate(draft);
                }}
              >
                Apply
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function SortSelect({ filters, options }: { filters: ShopFilters; options: readonly { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className="flex items-center gap-3 text-[15px] font-medium">
      Sort by
      <select
        className="input h-11 min-h-11 w-[170px] pr-8"
        value={filters.sort}
        onChange={(e) => router.push(pathname + serializeFilters({ ...filters, sort: e.target.value as ShopFilters['sort'], page: 1 }), { scroll: false })}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
