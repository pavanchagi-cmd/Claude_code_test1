'use client';

import { useState } from 'react';

const TOPICS = ['Order status', 'Returns & refunds', 'Warranty claim', 'Product question', 'Payments & EMI', 'Other'];

export function ContactForm() {
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const err = (k: string) => (errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `c-${k}-err` } : {});
  return (
    <form
      className="card grid gap-4 p-7 md:grid-cols-2"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = Object.fromEntries(new FormData(form).entries());
        setBusy(true);
        const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fd) });
        const json = await res.json().catch(() => ({}));
        setBusy(false);
        if (res.ok) {
          setErrors({});
          setStatus({ tone: 'ok', text: `Thanks, we have your message (ticket ${json.ticket}). We will reply soon.` });
          form.reset();
        } else {
          setErrors(Object.fromEntries(((json.issues ?? []) as { path: string; message: string }[]).map((i) => [i.path, i.message])));
          setStatus({ tone: 'err', text: json.error ?? 'Could not send your message.' });
        }
      }}
    >
      <div>
        <label htmlFor="c-name" className="label">
          Name
        </label>
        <input id="c-name" name="name" required autoComplete="name" className="input" {...err('name')} />
        {errors.name && (
          <p id="c-name-err" className="field-error">
            {errors.name}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="c-contact" className="label">
          Email or mobile
        </label>
        <input id="c-contact" name="contact" required className="input" {...err('contact')} />
        {errors.contact && (
          <p id="c-contact-err" className="field-error">
            {errors.contact}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="c-topic" className="label">
          Topic
        </label>
        <select id="c-topic" name="topic" className="input">
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="c-order" className="label">
          Order number (optional)
        </label>
        <input id="c-order" name="orderNumber" className="input" />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="c-message" className="label">
          Message
        </label>
        <textarea id="c-message" name="message" required className="input min-h-[136px]" {...err('message')} />
        {errors.message && (
          <p id="c-message-err" className="field-error">
            {errors.message}
          </p>
        )}
      </div>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="md:col-span-2">
        <button type="submit" className="btn btn-primary min-h-12 px-7" disabled={busy}>
          {busy ? 'Sending…' : 'Send message'}
        </button>
        <p role="status" aria-live="polite" className={`mt-3 text-[15px] ${status?.tone === 'err' ? 'text-warning' : 'text-success'}`}>
          {status?.text}
        </p>
      </div>
    </form>
  );
}
