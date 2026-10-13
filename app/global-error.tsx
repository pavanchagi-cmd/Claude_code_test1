'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: 'Helvetica, Arial, sans-serif', background: '#F7F6F3', color: '#15171A', textAlign: 'center', padding: '88px 24px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 44 }}>Something went wrong</h1>
        <p>Please refresh the page or try again in a moment.</p>
        <button type="button" onClick={reset} style={{ marginTop: 24, minHeight: 48, padding: '0 24px', background: '#15171A', color: '#F7F6F3', border: 0, fontWeight: 700 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
