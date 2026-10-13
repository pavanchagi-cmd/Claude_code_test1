'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Address = { id: string; name: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string; isDefault: boolean };
const EMPTY = { name: '', phone: '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: '' };

async function send(method: string, body: unknown) {
  const res = await fetch('/api/account/addresses', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | 'new' | null>(addresses.length ? null : 'new');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (a: Address | 'new') => {
    setEditing(a);
    setError(null);
    setForm(a === 'new' ? EMPTY : { name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode });
  };

  const field = (k: keyof typeof EMPTY, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`addr-${k}`} className="label">
        {label}
      </label>
      <input
        id={`addr-${k}`}
        value={form[k]}
        onChange={async (e) => {
          const v = e.target.value;
          setForm((f) => ({ ...f, [k]: v }));
          if (k === 'pincode' && /^[1-9]\d{5}$/.test(v)) {
            const j = await fetch(`/api/pincode?pin=${v}`).then((r) => r.json());
            setForm((f) => ({ ...f, city: j.city ?? f.city, state: j.state ?? f.state }));
          }
        }}
        className="input"
        {...extra}
      />
    </div>
  );

  return (
    <div className="mt-4 space-y-3">
      {addresses.map((a) => (
        <div key={a.id} className="card flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between">
          <address className="text-[15.5px] text-body-2 not-italic">
            <strong className="text-ink">{a.name}</strong> {a.isDefault && <span className="badge ml-2 align-middle">Default</span>}
            <br />
            {a.line1}, {a.line2}
            {a.landmark ? `, ${a.landmark}` : ''}
            <br />
            {a.city}, {a.state} – {a.pincode} · +91 {a.phone}
          </address>
          <div className="flex flex-wrap gap-2">
            {!a.isDefault && (
              <button type="button" className="btn btn-outline min-h-10" onClick={async () => (await send('PATCH', { id: a.id, isDefault: true }), router.refresh())}>
                Set default
              </button>
            )}
            <button type="button" className="btn btn-outline min-h-10" onClick={() => startEdit(a)}>
              Edit
            </button>
            <button
              type="button"
              className="btn btn-outline min-h-10 text-warning"
              onClick={async () => {
                if (!confirm('Delete this address?')) return;
                await send('DELETE', { id: a.id });
                router.refresh();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {editing ? (
        <form
          className="card grid gap-4 p-6 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const { ok, json } = editing === 'new' ? await send('POST', form) : await send('PATCH', { id: editing.id, ...form });
            if (!ok) return setError(json.error ?? 'Could not save the address.');
            setEditing(null);
            router.refresh();
          }}
        >
          <h3 className="text-[18px] font-semibold md:col-span-2">{editing === 'new' ? 'Add an address' : 'Edit address'}</h3>
          {field('name', 'Full name', { required: true, autoComplete: 'name' })}
          {field('phone', 'Mobile number', { required: true, inputMode: 'numeric', autoComplete: 'tel-national' })}
          {field('pincode', 'Pincode', { required: true, inputMode: 'numeric', maxLength: 6 })}
          {field('line1', 'Flat, house no., building', { required: true })}
          {field('line2', 'Area, street, locality', { required: true })}
          {field('landmark', 'Landmark (optional)')}
          {field('city', 'City', { required: true })}
          {field('state', 'State', { required: true })}
          <p role="alert" className="text-warning md:col-span-2">
            {error}
          </p>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn btn-primary">
              Save address
            </button>
            {addresses.length > 0 && (
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => startEdit('new')}>
          Add a new address
        </button>
      )}
    </div>
  );
}
