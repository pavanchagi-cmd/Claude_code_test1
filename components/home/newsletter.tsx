'use client';

import { useState } from 'react';

export function NewsletterForm({ source = 'home' }: { source?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  return (
    <form
      className="w-full max-w-[476px]"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setState('sending');
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.get('email'), consent: true, source, website: data.get('website') }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.ok) {
          setState('done');
          setMessage('Thank you. You are on the list.');
          form.reset();
        } else {
          setState('error');
          setMessage(json.error ?? 'Something went wrong. Please try again.');
        }
      }}
    >
      <label htmlFor="newsletter-email" className="label">
        Email address
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="input flex-1"
          aria-describedby="newsletter-status"
        />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button type="submit" className="btn btn-primary min-h-[52px] px-7" disabled={state === 'sending'}>
          {state === 'sending' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      <p id="newsletter-status" aria-live="polite" className={`mt-2 text-[14px] ${state === 'error' ? 'text-warning' : 'text-success'}`}>
        {message}
      </p>
      <p className="mt-1 text-[12.5px] text-muted">By subscribing you agree to receive marketing emails. Unsubscribe any time.</p>
    </form>
  );
}
