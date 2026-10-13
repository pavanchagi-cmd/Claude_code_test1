'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useStore } from '@/components/store-provider';

function Modal({ trigger, title, children, open, onOpenChange }: { trigger: ReactNode; title: string; children: ReactNode; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[92vw] max-w-[540px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-surface p-7 focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-[28px]">{title}</Dialog.Title>
            <Dialog.Close className="-mt-1 -mr-2 inline-flex h-11 w-11 items-center justify-center" aria-label="Close">
              <X size={20} strokeWidth={1.6} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function WriteReviewButton({ productId, slug }: { productId: string; slug: string }) {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <Link href={`/login?next=/watch/${slug}%23reviews`} className="btn btn-secondary mt-6 w-full">
        Write a review
      </Link>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Write a review"
      trigger={
        <button type="button" className="btn btn-secondary mt-6 w-full">
          Write a review
        </button>
      }
    >
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setSending(true);
          const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, rating, title: fd.get('title'), body: fd.get('body'), city: fd.get('city') }),
          });
          const json = await res.json();
          setSending(false);
          setStatus(res.ok ? { tone: 'ok', text: json.message } : { tone: 'err', text: json.error ?? 'Could not submit your review.' });
        }}
      >
        <fieldset>
          <legend className="label">Your rating</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={rating >= r}
                aria-label={`${r} star${r > 1 ? 's' : ''}`}
                onClick={() => setRating(r)}
                className="h-11 w-11 text-[26px] text-brass"
              >
                {rating >= r ? '★' : '☆'}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="rv-title" className="label">
            Headline
          </label>
          <input id="rv-title" name="title" required minLength={3} maxLength={120} className="input" />
        </div>
        <div>
          <label htmlFor="rv-body" className="label">
            Review
          </label>
          <textarea id="rv-body" name="body" required minLength={10} maxLength={2000} className="input" />
        </div>
        <div>
          <label htmlFor="rv-city" className="label">
            City (optional)
          </label>
          <input id="rv-city" name="city" maxLength={60} className="input" />
        </div>
        <p aria-live="polite" className={status?.tone === 'err' ? 'text-warning' : 'text-success'}>
          {status?.text}
        </p>
        <button type="submit" className="btn btn-primary w-full" disabled={sending}>
          {sending ? 'Submitting…' : 'Submit review'}
        </button>
        <p className="text-[13px] text-muted">Only customers who have received this watch can review it. Reviews are checked before they appear.</p>
      </form>
    </Modal>
  );
}

export function AskQuestionButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Ask a question"
      trigger={
        <button type="button" className="link mt-4 text-[15.5px] font-semibold">
          Ask a question
        </button>
      }
    >
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const res = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, text: fd.get('text'), name: fd.get('name') }),
          });
          const json = await res.json();
          setStatus(res.ok ? { tone: 'ok', text: json.message } : { tone: 'err', text: json.error ?? 'Could not send your question.' });
          if (res.ok) form.reset();
        }}
      >
        <div>
          <label htmlFor="q-text" className="label">
            Your question
          </label>
          <textarea id="q-text" name="text" required minLength={5} maxLength={500} className="input" />
        </div>
        <div>
          <label htmlFor="q-name" className="label">
            Name (optional)
          </label>
          <input id="q-name" name="name" maxLength={80} className="input" />
        </div>
        <p aria-live="polite" className={status?.tone === 'err' ? 'text-warning' : 'text-success'}>
          {status?.text}
        </p>
        <button type="submit" className="btn btn-primary w-full">
          Send question
        </button>
      </form>
    </Modal>
  );
}
