'use client';

import { useState } from 'react';

export function VerifySerial() {
  const [result, setResult] = useState<{ tone: 'ok' | 'err' | 'muted'; text: string } | null>(null);
  return (
    <form
      className="w-full max-w-[400px]"
      onSubmit={async (e) => {
        e.preventDefault();
        const serial = String(new FormData(e.currentTarget).get('serial') ?? '');
        const res = await fetch('/api/verify-serial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serial }) });
        const json = await res.json();
        if (!res.ok) setResult({ tone: 'err', text: json.error ?? 'Could not check this serial.' });
        else if (json.genuine)
          setResult({
            tone: 'ok',
            text: `Genuine. This watch was supplied by us${json.warrantyActive === true ? ' and its warranty is active' : json.warrantyActive === false ? '; its warranty has expired' : ''}.`,
          });
        else setResult({ tone: 'muted', text: 'We could not find this serial number. Check it against your certificate or contact us.' });
      }}
    >
      <label htmlFor="verify-serial" className="label">
        Serial number
      </label>
      <div className="flex gap-2">
        <input id="verify-serial" name="serial" required minLength={4} maxLength={40} className="input flex-1 uppercase" autoComplete="off" aria-describedby="verify-result" />
        <button type="submit" className="btn btn-primary min-h-12 px-6">
          Verify
        </button>
      </div>
      <p id="verify-result" aria-live="polite" className={`mt-2 text-[14.5px] ${result?.tone === 'ok' ? 'text-success' : result?.tone === 'err' ? 'text-warning' : 'text-body-2'}`}>
        {result?.text}
      </p>
    </form>
  );
}
