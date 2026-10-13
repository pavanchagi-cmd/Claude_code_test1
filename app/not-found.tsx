import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="container-site py-[88px] text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="h1-page mt-3">This page has stopped ticking</h1>
        <p className="mx-auto mt-4 max-w-[520px] text-[17px] text-muted">The page you are looking for has moved or no longer exists.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/watches" className="btn btn-primary btn-lg">
            Shop watches
          </Link>
          <Link href="/help" className="btn btn-secondary btn-lg">
            Help centre
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
