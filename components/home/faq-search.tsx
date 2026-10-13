'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

type Faq = { id: string; question: string; answer: string };

/** Hero search filters the FAQ list client-side. `children` renders between the hero and the FAQ. */
export function FaqSearch({ faqs, children }: { faqs: Faq[]; children?: React.ReactNode }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string[]>(faqs[0] ? [faqs[0].id] : []);
  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return faqs;
    return faqs.filter((f) => terms.every((t) => `${f.question} ${f.answer}`.toLowerCase().includes(t)));
  }, [q, faqs]);
  return (
    <>
      <section className="bg-ink text-on-dark">
        <div className="container-narrow py-[72px]">
          <h1 className="h1-page">How can we help?</h1>
          <label htmlFor="help-search" className="mt-8 block text-[15px] text-on-dark-muted">
            Search help articles
          </label>
          <input
            id="help-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value) document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            placeholder="e.g. return a watch, EMI, battery replacement"
            className="mt-2 h-[54px] w-full max-w-[620px] bg-surface px-[18px] text-[17px] text-ink placeholder:text-muted"
          />
        </div>
      </section>
      {children}
      <section id="faq" className="container-narrow scroll-mt-24 pt-[72px]" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="h2-section">
          Frequently asked questions
        </h2>
        <p aria-live="polite" className="sr-only">
          {filtered.length} questions shown
        </p>
        {filtered.length === 0 ? (
          <p className="card mt-6 p-6 text-muted">No answers match “{q}”. Try other words or contact us below.</p>
        ) : (
          <Accordion.Root type="multiple" value={q ? filtered.map((f) => f.id) : open} onValueChange={setOpen} className="mt-6 border border-line bg-surface">
            {filtered.map((f) => (
              <Accordion.Item key={f.id} value={f.id} className="border-b border-line last:border-b-0">
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[17px] font-medium">
                    {f.question}
                    <Plus size={18} strokeWidth={1.8} className="shrink-0 text-brass group-data-[state=open]:hidden" aria-hidden="true" />
                    <Minus size={18} strokeWidth={1.8} className="hidden shrink-0 text-brass group-data-[state=open]:block" aria-hidden="true" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="px-6 pb-5 text-[16.5px] leading-[1.6] text-body-2">{f.answer}</Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        )}
      </section>
    </>
  );
}
