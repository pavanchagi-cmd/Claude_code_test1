import { WarrantyForm } from '@/components/account/warranty-form';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function WarrantyPage() {
  const user = await requireUser('/account/warranty');
  const [eligible, registrations] = await Promise.all([
    db.orderItem.findMany({
      where: { order: { userId: user.id, status: { in: ['DELIVERED', 'RETURN_REQUESTED'] } }, warranty: null, warrantyMonths: { gt: 0 } },
      include: { order: true },
    }),
    db.warrantyRegistration.findMany({ where: { userId: user.id }, include: { orderItem: { include: { order: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);
  return (
    <section>
      <h2 className="font-sans text-[26px] font-semibold">Warranty</h2>
      <div className="card mt-4 p-6">
        <h3 className="text-[18px] font-semibold">Register a watch</h3>
        <p className="mt-1 text-[15px] text-muted">Enter the serial number from the authenticity certificate to activate your warranty and get a digital warranty card.</p>
        <WarrantyForm items={eligible.map((i) => ({ id: i.id, label: `${i.productName} · #${i.order.number}` }))} />
      </div>
      {registrations.length > 0 && (
        <ul className="mt-4 space-y-3">
          {registrations.map((r) => {
            const active = r.endsAt > new Date();
            return (
              <li key={r.id} className="card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[17px] font-semibold">{r.orderItem.productName}</p>
                  <p className="text-[14.5px] text-muted">
                    Serial {r.serialNumber} · Order #{r.orderItem.order.number}
                  </p>
                  <p className={`mt-1 text-[14.5px] font-semibold ${active ? 'text-success' : 'text-warning'}`}>
                    {active ? `Covered until ${fmt(r.endsAt)}` : `Expired on ${fmt(r.endsAt)}`}
                  </p>
                </div>
                <a href={`/api/account/warranty/${r.id}`} className="btn btn-outline min-h-11">
                  Download warranty card
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
