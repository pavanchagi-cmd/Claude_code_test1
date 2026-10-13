'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function WarrantyForm({ items }: { items: { id: string; label: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!items.length) return <p className="mt-3 text-[15px] text-muted">Watches appear here once they have been delivered.</p>;
  return (
    <form
      className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setBusy(true);
        const res = await fetch('/api/account/warranty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderItemId: fd.get('item'), serialNumber: fd.get('serial') }),
        });
        const json = await res.json();
        setBusy(false);
        setMsg(
          res.ok
            ? { tone: 'ok', text: 'Registered! Your digital warranty card is ready below and on its way by email.' }
            : { tone: 'err', text: json.error ?? 'Could not register.' },
        );
        if (res.ok) {
          form.reset();
          router.refresh();
        }
      }}
    >
      <div>
        <label htmlFor="w-item" className="label">
          Watch
        </label>
        <select id="w-item" name="item" className="input">
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="w-serial" className="label">
          Serial number
        </label>
        <input id="w-serial" name="serial" required className="input uppercase" autoComplete="off" />
      </div>
      <button type="submit" className="btn btn-primary min-h-12" disabled={busy}>
        {busy ? 'Registering…' : 'Register'}
      </button>
      <p aria-live="polite" className={`md:col-span-3 ${msg?.tone === 'err' ? 'text-warning' : 'text-success'}`}>
        {msg?.text}
      </p>
    </form>
  );
}
