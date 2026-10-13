'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useStore } from '@/components/store-provider';
import { emailSignIn, googleSignIn } from '@/app/(store)/login/actions';

type Step = 'phone' | 'otp' | 'email';

export function LoginForm({ next, googleEnabled, checkEmail }: { next: string; googleEnabled: boolean; checkEmail: boolean }) {
  const router = useRouter();
  const { refresh } = useStore();
  const [step, setStep] = useState<Step>(checkEmail ? 'email' : 'phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(checkEmail ? 'Check your inbox for a sign-in link.' : null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [, startTransition] = useTransition();
  const [emailState, emailAction, emailPending] = useActionState(emailSignIn, {} as { error?: string });
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  const send = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: digits }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? 'Could not send the OTP.');
      return;
    }
    setStep('otp');
    setCode('');
    setInfo(`We sent a 6-digit code to +91 ${digits}.`);
    setCooldown(json.resendAfter ?? 30);
  };

  const verify = async (value = code) => {
    setError(null);
    if (!/^\d{6}$/.test(value)) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.replace(/\D/g, ''), code: value }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(json.error ?? 'Incorrect OTP.');
      return;
    }
    await refresh();
    startTransition(() => {
      router.replace(json.isNew && next === '/account' ? '/account/profile?welcome=1' : next);
      router.refresh();
    });
  };

  // Web OTP API: autofill the code from the SMS on supported Android browsers.
  useEffect(() => {
    if (step !== 'otp' || !('OTPCredential' in window)) return;
    const ac = new AbortController();
    (navigator.credentials as unknown as { get: (o: unknown) => Promise<{ code?: string } | null> })
      .get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((cred) => {
        if (cred?.code) {
          setCode(cred.code);
          void verify(cred.code);
        }
      })
      .catch(() => {});
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per OTP step
  }, [step]);

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,3.6vw,44px)] leading-[1.4]">Sign in or create an account</h1>
      {step === 'email' ? (
        <>
          <p className="mt-4 text-[17px] text-body-2">We’ll email you a secure sign-in link.</p>
          <form action={emailAction} className="mt-6">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="login-email" className="label">
              Email address
            </label>
            <input id="login-email" name="email" type="email" required autoComplete="email" className="input" />
            <button type="submit" className="btn btn-primary btn-lg mt-4 w-full" disabled={emailPending}>
              {emailPending ? 'Sending…' : 'Email me a link'}
            </button>
          </form>
          {(emailState.error || info) && (
            <p className={`mt-3 text-[15px] ${emailState.error ? 'text-warning' : 'text-success'}`} role="status">
              {emailState.error ?? info}
            </p>
          )}
          <button type="button" className="link mt-5 text-[15px]" onClick={() => setStep('phone')}>
            Use mobile number instead
          </button>
        </>
      ) : (
        <>
          <p className="mt-4 text-[17px] text-body-2">We’ll send a one-time password to your phone. No password needed.</p>
          {step === 'phone' ? (
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label htmlFor="login-phone" className="label">
                Mobile number
              </label>
              <div className="flex">
                <span className="flex items-center border border-r-0 border-line-strong bg-ground px-4 text-[17px]">+91</span>
                <input
                  id="login-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="input"
                  aria-invalid={Boolean(error)}
                  aria-describedby="login-msg"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg mt-4 w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void verify();
              }}
            >
              <label htmlFor="login-otp" className="label">
                Enter OTP
              </label>
              <input
                ref={otpRef}
                id="login-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  if (v.length === 6) void verify(v);
                }}
                className="input text-center text-[24px] tracking-[0.6em]"
                aria-invalid={Boolean(error)}
                aria-describedby="login-msg"
              />
              <button type="submit" className="btn btn-primary btn-lg mt-4 w-full" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
              <div className="mt-4 flex justify-between text-[15px]">
                <button type="button" className="link" onClick={() => setStep('phone')}>
                  Change number
                </button>
                <button type="button" className="link disabled:no-underline disabled:opacity-60" disabled={cooldown > 0 || busy} onClick={() => void send()}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
          <p id="login-msg" role="status" aria-live="polite" className={`mt-3 text-[15px] ${error ? 'text-warning' : 'text-success'}`}>
            {error ?? info}
          </p>

          <div className="my-6 flex items-center gap-4 text-[14px] text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <form
            action={async () => {
              const r = await googleSignIn(next);
              if (r?.error) setError(r.error);
            }}
          >
            <button type="submit" className="btn btn-outline btn-lg w-full font-semibold" aria-disabled={!googleEnabled}>
              Continue with Google
            </button>
          </form>
          <button type="button" className="btn btn-outline btn-lg mt-4 w-full font-semibold" onClick={() => setStep('email')}>
            Use email instead
          </button>
        </>
      )}
      <p className="mt-6 text-[13.5px] text-muted">
        By continuing you agree to our{' '}
        <Link href="/policies/terms" className="link text-ink">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/policies/privacy" className="link text-ink">
          Privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
