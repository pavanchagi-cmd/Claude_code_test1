import { AdminPage, Card, Input, Notice, Submit, Textarea } from '@/components/admin/ui';
import { requireAdmin, rupees } from '@/lib/admin';
import { getSettings } from '@/lib/settings';
import { saveSettings } from '../actions';

export const dynamic = 'force-dynamic';

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const [s, sp] = await Promise.all([getSettings(), searchParams]);
  const money = (p: number) => (p > 0 ? rupees(p) : '');
  return (
    <AdminPage title="Site settings">
      {sp.saved && <Notice>Saved. The storefront updates within a minute.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <Notice>Anything left as a [PLACEHOLDER] stays visible on the store until you replace it. Leave amounts blank to keep the placeholder.</Notice>
      <form action={saveSettings} className="space-y-5">
        <Card title="Brand">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Brand name" name="brandName" defaultValue={s.brandName} required />
            <Input label="One-line description" name="brandDescription" defaultValue={s.brandDescription} />
            <Input label="Announcement bar" name="announcement" defaultValue={s.announcement} className="md:col-span-2" />
            <Input label="Instagram handle" name="instagramHandle" defaultValue={s.instagramHandle} />
            <Input label="Warranty (years)" name="warrantyYears" defaultValue={s.warrantyYears} />
          </div>
        </Card>
        <Card title="Home hero">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Eyebrow" name="heroEyebrow" defaultValue={s.hero.eyebrow} />
            <Input label="Headline" name="heroHeadline" defaultValue={s.hero.headline} />
            <Textarea label="Body" name="heroBody" defaultValue={s.hero.body} rows={2} className="md:col-span-2" />
            <Input label="Primary button label" name="heroCta1Label" defaultValue={s.hero.primaryCta.label} />
            <Input label="Primary button link" name="heroCta1Href" defaultValue={s.hero.primaryCta.href} />
            <Input label="Secondary button label" name="heroCta2Label" defaultValue={s.hero.secondaryCta.label} />
            <Input label="Secondary button link" name="heroCta2Href" defaultValue={s.hero.secondaryCta.href} />
            <Input label="Hero image URL" name="heroImageUrl" defaultValue={s.hero.imageUrl} hint="Upload in Blob and paste the URL, or leave blank for the illustration." />
            <Input label="Hero video URL (MP4)" name="heroVideoUrl" defaultValue={s.hero.videoUrl} />
          </div>
        </Card>
        <Card title="Trust strip (5 items)">
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Input label={`Item ${i + 1} title`} name={`trust${i}Title`} defaultValue={s.trustItems[i]?.title} />
                <Input label="Subtitle" name={`trust${i}Sub`} defaultValue={s.trustItems[i]?.subtitle} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Shipping, COD and gift wrap">
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Free shipping above (₹)" name="freeShippingThreshold" defaultValue={money(s.freeShippingThresholdPaise)} hint="Blank = always free." />
            <Input label="Shipping fee below threshold (₹)" name="shippingFee" defaultValue={money(s.shippingFeePaise)} />
            <Input label="Return window (days)" name="returnWindowDays" type="number" defaultValue={s.returnWindowDays || ''} />
            <Input label="COD limit (₹)" name="codLimit" defaultValue={money(s.codLimitPaise)} hint="Blank = COD off." />
            <Input label="COD fee (₹)" name="codFee" defaultValue={money(s.codFeePaise)} />
            <Input label="Gift wrap price (₹)" name="giftWrap" defaultValue={money(s.giftWrapPaise)} />
          </div>
        </Card>
        <Card title="Contact">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Support phone" name="supportPhone" defaultValue={s.supportPhone} />
            <Input label="WhatsApp number (with 91)" name="whatsappNumber" defaultValue={s.whatsappNumber} hint="e.g. 919876543210. The floating chat button appears once set." />
            <Input label="Support email" name="supportEmail" defaultValue={s.supportEmail} />
            <Input label="Support hours" name="supportHours" defaultValue={s.supportHours} />
          </div>
        </Card>
        <Card title="Legal entity (invoices, footer, policies)">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Legal entity name" name="legalEntityName" defaultValue={s.legalEntityName} />
            <Input label="GSTIN" name="gstin" defaultValue={s.gstin} />
            <Input label="Registered address" name="registeredAddress" defaultValue={s.registeredAddress} className="md:col-span-2" />
            <Input label="Seller state (for CGST/SGST vs IGST)" name="sellerState" defaultValue={s.sellerState} hint="Exactly as on the GST certificate, e.g. Karnataka." />
          </div>
        </Card>
        <Card title="Grievance officer (Consumer Protection (E-Commerce) Rules, 2020)">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Name" name="goName" defaultValue={s.grievanceOfficer.name} />
            <Input label="Designation" name="goDesignation" defaultValue={s.grievanceOfficer.designation} />
            <Input label="Email" name="goEmail" defaultValue={s.grievanceOfficer.email} />
            <Input label="Phone" name="goPhone" defaultValue={s.grievanceOfficer.phone} />
            <Input label="Address" name="goAddress" defaultValue={s.grievanceOfficer.address} className="md:col-span-2" />
            <Input label="Response time" name="goResponse" defaultValue={s.grievanceOfficer.responseTime} className="md:col-span-2" />
          </div>
        </Card>
        <Submit>Save settings</Submit>
      </form>
    </AdminPage>
  );
}
