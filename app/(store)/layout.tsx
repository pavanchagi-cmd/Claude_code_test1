import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { WhatsAppButton } from '@/components/layout/whatsapp-button';
import { getSettings, whatsappDigits } from '@/lib/settings';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <WhatsAppButton number={whatsappDigits(s)} brandName={s.brandName} />
    </>
  );
}
