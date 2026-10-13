import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../lib/generated/prisma/client';

/** Local/CI only: give the seeded store test values so COD and fees can be exercised. */
export default async function globalSetup() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  await db.siteSettings.update({ where: { id: 'default' }, data: { codLimitPaise: 5000000, codFeePaise: 5000 } });
  // Top up stock so repeated runs never sell out.
  await db.variant.updateMany({ data: { stock: 50, reserved: 0 } });
  // Fresh OTP/rate-limit state so repeated local runs are not throttled.
  await db.otpCode.deleteMany();
  await db.rateLimitHit.deleteMany();
  await db.$disconnect();
}
