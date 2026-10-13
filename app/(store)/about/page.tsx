import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { VerifySerial } from '@/components/home/verify-serial';
import { getContent } from '@/lib/content';
import { getSettings } from '@/lib/settings';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: 'About us & our authenticity promise', description: `Who we are and how ${s.brandName} guarantees every watch is genuine.`, alternates: { canonical: '/about' } };
}

export default async function AboutPage() {
  const [hero, story, values, auth, service, visit] = await Promise.all([
    getContent('about.hero'),
    getContent('about.story'),
    getContent('about.values'),
    getContent('about.authenticity'),
    getContent('about.service'),
    getContent('about.visit'),
  ]);
  return (
    <>
      <section className="bg-ink text-on-dark">
        <div className="container-narrow py-[88px] md:py-[112px]">
          <p className="eyebrow text-brass-light">{hero.eyebrow}</p>
          <h1 className="mt-5 max-w-[760px] font-display text-[clamp(42px,5.4vw,70px)] leading-[1.06]">{hero.title}</h1>
          <p className="mt-7 max-w-[720px] text-[19px] leading-[1.65] text-on-dark-muted">{hero.body}</p>
        </div>
      </section>

      <section className="container-site grid items-center gap-10 py-[88px] lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-[588/440] bg-placeholder">
          {story.imageUrl ? (
            <Image src={story.imageUrl} alt="Our team" fill sizes="(min-width:1024px) 588px, 100vw" className="object-cover" />
          ) : (
            <div className="placeholder-box h-full">[Founder / team photo]</div>
          )}
        </div>
        <div>
          <h2 className="h2-section">{story.title}</h2>
          <div className="mt-6 space-y-5 text-[17.5px] leading-[1.65] text-body-2">
            {story.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container-site py-[88px]">
          <h2 className="h2-section">{values.title}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {values.items.map((v, i) => (
              <div key={v.title} className="border-t-2 border-ink pt-7">
                <p className="font-display text-[44px] leading-none text-brass">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-6 text-[20px] font-semibold">{v.title}</h3>
                <p className="mt-3 text-[16.5px] leading-[1.6] text-body-2">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="authenticity" className="container-site scroll-mt-24 py-[88px]">
        <p className="eyebrow">{auth.eyebrow}</p>
        <h2 className="mt-4 max-w-[700px] font-display text-[clamp(32px,3.6vw,48px)] leading-[1.35]">{auth.title}</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {auth.steps.map((s, i) => (
            <li key={s.title} className="card p-7">
              <span className="flex h-10 w-10 items-center justify-center bg-ink text-[16px] font-semibold text-on-dark" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-6 text-[19px] font-semibold">{s.title}</h3>
              <p className="mt-3 text-[15.5px] leading-[1.55] text-body-2">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-col gap-6 bg-sand p-7 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-[19px] font-semibold">Verify your watch</h3>
            <p className="mt-1 text-[16px] text-body-2">Enter the serial number from your certificate.</p>
          </div>
          <VerifySerial />
        </div>
      </section>

      <section className="bg-ink text-on-dark">
        <div className="container-site grid gap-12 py-[88px] md:grid-cols-2">
          <div>
            <h2 className="h2-section">{service.title}</h2>
            <p className="mt-6 max-w-[590px] text-[17px] leading-[1.65] text-on-dark-muted">{service.body}</p>
            <Link href={service.linkHref} className="mt-5 inline-block font-semibold text-brass-light underline underline-offset-[3px]">
              {service.linkLabel}
            </Link>
          </div>
          <div>
            <h2 className="h2-section">{visit.title}</h2>
            <p className="mt-6 text-[17px] leading-[1.65] text-on-dark-muted">
              {visit.lines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
