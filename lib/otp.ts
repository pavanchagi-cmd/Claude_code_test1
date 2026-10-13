import 'server-only';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { isProd } from '@/lib/env';
import { sms } from '@/lib/integrations/msg91';
import { rateLimit } from '@/lib/rate-limit';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_SENDS_PER_WINDOW = 3;
export const OTP_WINDOW_SEC = 10 * 60;
export const OTP_RESEND_AFTER_SEC = 30;

export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

function hashCode(phone: string, code: string) {
  const secret = process.env.AUTH_SECRET ?? 'dev-secret';
  return crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

function generateCode() {
  // E2E tests only: a fixed code, honoured solely with the mock SMS provider outside production.
  const fixed = process.env.E2E_FIXED_OTP;
  if (fixed && /^\d{6}$/.test(fixed) && sms.mock && !isProd) return fixed;
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendOtp(phone: string, ip: string): Promise<SendResult> {
  const [byPhone, byIp] = await Promise.all([
    rateLimit(`otp:phone:${phone}`, OTP_SENDS_PER_WINDOW, OTP_WINDOW_SEC),
    rateLimit(`otp:ip:${ip}`, OTP_SENDS_PER_WINDOW * 3, OTP_WINDOW_SEC),
  ]);
  if (!byPhone || !byIp) return { ok: false, error: 'Too many OTP requests. Please try again in a few minutes.' };

  const last = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } });
  if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_AFTER_SEC * 1000) {
    return { ok: false, error: `Please wait ${OTP_RESEND_AFTER_SEC} seconds before requesting another OTP.` };
  }

  const code = generateCode();
  await db.otpCode.create({
    data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS), ip },
  });
  try {
    await sms.sendOtp(phone, code);
  } catch (err) {
    console.error('[otp] send failed', err);
    return { ok: false, error: 'We could not send the OTP right now. Please try again.' };
  }
  return { ok: true };
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  const otp = await db.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp || otp.expiresAt < new Date()) return { ok: false, error: 'This OTP has expired. Please request a new one.' };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: 'Too many incorrect attempts. Please request a new OTP.' };

  const expected = Buffer.from(otp.codeHash);
  const actual = Buffer.from(hashCode(phone, code));
  const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!match) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return { ok: false, error: left > 0 ? `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Please request a new OTP.' };
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
