'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main id="main" className="container-site py-[88px] text-center">
      <p className="eyebrow">Error 500</p>
      <h1 className="h1-page mt-3">Something went wrong</h1>
      <p className="mx-auto mt-4 max-w-[520px] text-[17px] text-muted">
        We have been notified and are looking into it. Please try again{error.digest ? ` (ref ${error.digest})` : ''}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary btn-lg">
          Try again
        </button>
        <Link href="/" className="btn btn-secondary btn-lg">
          Go home
        </Link>
      </div>
    </main>
  );
}
