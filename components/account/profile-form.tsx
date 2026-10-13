'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/components/store-provider';

type Props = { name: string; email: string; wristSizeCm: string; marketingConsent: boolean; welcome: boolean };

export function ProfileForm(p: Props) {
  const router = useRouter();
  const { refresh } = useStore();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(p.welcome ? { tone: 'ok', text: 'Welcome! Add your name to finish setting up your account.' } : null);
  const [confirmText, setConfirmText] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  return (
    <>
      <form
        className="card mt-4 grid gap-4 p-6 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const wrist = String(fd.get('wrist') ?? '').trim();
          const res = await fetch('/api/account/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: fd.get('name'), email: fd.get('email'), wristSizeCm: wrist ? Number(wrist) : null, marketingConsent: fd.get('marketing') === 'on' }),
          });
          const json = await res.json();
          setMsg(res.ok ? { tone: 'ok', text: 'Profile saved.' } : { tone: 'err', text: json.error ?? 'Could not save.' });
          if (res.ok) {
            await refresh();
            router.refresh();
          }
        }}
      >
        <div>
          <label htmlFor="pf-name" className="label">
            Full name
          </label>
          <input id="pf-name" name="name" required minLength={2} defaultValue={p.name} autoComplete="name" className="input" />
        </div>
        <div>
          <label htmlFor="pf-email" className="label">
            Email
          </label>
          <input id="pf-email" name="email" type="email" defaultValue={p.email} autoComplete="email" className="input" />
        </div>
        <div>
          <label htmlFor="pf-wrist" className="label">
            Wrist size in cm (optional)
          </label>
          <input id="pf-wrist" name="wrist" type="number" step="0.5" min="10" max="30" defaultValue={p.wristSizeCm} className="input" aria-describedby="pf-wrist-hint" />
          <p id="pf-wrist-hint" className="mt-1 text-[13px] text-muted">
            Helps us suggest case sizes and pre-size bracelets.
          </p>
        </div>
        <label className="flex items-start gap-3 self-center text-[15px]">
          <input name="marketing" type="checkbox" defaultChecked={p.marketingConsent} className="mt-1 h-5 w-5" />
          Send me new arrivals, limited drops and offers by email, SMS or WhatsApp.
        </label>
        <p aria-live="polite" className={`md:col-span-2 ${msg?.tone === 'err' ? 'text-warning' : 'text-success'}`}>
          {msg?.text}
        </p>
        <div className="md:col-span-2">
          <button type="submit" className="btn btn-primary">
            Save profile
          </button>
        </div>
      </form>

      <section className="card mt-6 p-6" aria-labelledby="privacy-heading">
        <h3 id="privacy-heading" className="text-[18px] font-semibold">
          Your data
        </h3>
        <p className="mt-1 text-[15px] text-muted">
          Under India’s DPDP Act you can download a copy of your data or delete your account. Order and invoice records are kept as required by tax law.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <a href="/api/account/export" className="btn btn-outline">
            Download my data
          </a>
          <div className="flex items-end gap-2">
            <div>
              <label htmlFor="del-confirm" className="label">
                Type DELETE to delete your account
              </label>
              <input id="del-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="input w-[220px]" />
            </div>
            <button
              type="button"
              className="btn btn-outline min-h-12 text-warning"
              disabled={confirmText !== 'DELETE'}
              onClick={async () => {
                const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
                const json = await res.json();
                if (res.ok) {
                  await refresh();
                  router.push('/');
                  router.refresh();
                } else setDeleteMsg(json.error ?? 'Could not delete the account.');
              }}
            >
              Delete account
            </button>
          </div>
        </div>
        {deleteMsg && (
          <p role="alert" className="mt-3 text-warning">
            {deleteMsg}
          </p>
        )}
      </section>
    </>
  );
}
