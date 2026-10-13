import { AddressManager } from '@/components/account/address-manager';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  const user = await requireUser('/account/addresses');
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  return (
    <section>
      <h2 className="font-sans text-[26px] font-semibold">Addresses</h2>
      <AddressManager addresses={addresses.map((a) => ({ ...a, line2: a.line2 ?? '', landmark: a.landmark ?? '' }))} />
    </section>
  );
}
