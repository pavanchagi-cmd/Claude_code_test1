'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const REASONS = ['Changed my mind', 'Size does not suit my wrist', 'Received a different item', 'Item is defective or damaged', 'Want to exchange for another model', 'Other'];

export function ReturnDialog({ orderId, items }: { orderId: string; items: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="btn btn-outline min-h-11">Return / exchange</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-[500px] -translate-x-1/2 -translate-y-1/2 bg-surface p-7 focus:outline-none">
          <div className="flex items-start justify-between">
            <Dialog.Title className="font-display text-[28px]">Return or exchange</Dialog.Title>
            <Dialog.Close className="-mt-1 -mr-2 inline-flex h-11 w-11 items-center justify-center" aria-label="Close">
              <X size={20} strokeWidth={1.6} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-[15px] text-muted">We will arrange a free pickup once your request is approved.</Dialog.Description>
          <form
            className="mt-5 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const res = await fetch('/api/account/returns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, orderItemId: fd.get('item'), reason: `${fd.get('reason')}${fd.get('details') ? `: ${fd.get('details')}` : ''}` }),
              });
              const json = await res.json();
              setMsg(
                res.ok
                  ? { tone: 'ok', text: 'Request received. We will contact you within 1 business day.' }
                  : { tone: 'err', text: json.error ?? 'Could not submit the request.' },
              );
              if (res.ok) router.refresh();
            }}
          >
            <div>
              <label htmlFor="ret-item" className="label">
                Item
              </label>
              <select id="ret-item" name="item" className="input">
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ret-reason" className="label">
                Reason
              </label>
              <select id="ret-reason" name="reason" className="input">
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ret-details" className="label">
                Details (optional)
              </label>
              <textarea id="ret-details" name="details" maxLength={500} className="input min-h-[90px]" />
            </div>
            <p aria-live="polite" className={msg?.tone === 'err' ? 'text-warning' : 'text-success'}>
              {msg?.text}
            </p>
            <button type="submit" className="btn btn-primary w-full">
              Submit request
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
