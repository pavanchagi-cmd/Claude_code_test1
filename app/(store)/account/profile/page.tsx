import { ProfileForm } from '@/components/account/profile-form';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const session = await requireUser('/account/profile');
  const [user, sp] = await Promise.all([db.user.findUnique({ where: { id: session.id } }), searchParams]);
  return (
    <section>
      <h2 className="font-sans text-[26px] font-semibold">Profile</h2>
      <ProfileForm
        name={user?.name ?? ''}
        email={user?.email ?? ''}
        wristSizeCm={user?.wristSizeCm ? String(user.wristSizeCm) : ''}
        marketingConsent={user?.marketingConsent ?? false}
        welcome={Boolean(sp.welcome)}
      />
    </section>
  );
}
