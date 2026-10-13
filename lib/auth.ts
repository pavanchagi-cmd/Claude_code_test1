import 'server-only';
import crypto from 'node:crypto';
import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createElement } from 'react';
import { db } from '@/lib/db';
import { configured } from '@/lib/env';
import { email } from '@/lib/integrations/resend';
import type { Role } from '@/lib/generated/prisma/enums';
import MagicLinkEmail from '@/emails/magic-link';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: Role; phone: string | null } & DefaultSession['user'];
  }
}

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

const providers = [
  // Email magic link. Delivery goes through our Resend wrapper so the mock
  // logs links locally when RESEND_API_KEY is missing.
  Resend({
    apiKey: process.env.RESEND_API_KEY ?? 'mock',
    from: process.env.EMAIL_FROM ?? 'login@example.com',
    async sendVerificationRequest({ identifier, url }) {
      if (email.mock) console.info(`[auth:mock] magic link for ${identifier}: ${url}`);
      await email.send({ to: identifier, subject: 'Your sign-in link', react: createElement(MagicLinkEmail, { url }) });
    },
  }),
  ...(configured.google ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db as never),
  session: { strategy: 'database', maxAge: SESSION_MAX_AGE },
  trustHost: true,
  providers,
  pages: { signIn: '/login', verifyRequest: '/login?check-email=1', error: '/login' },
  callbacks: {
    session({ session, user }) {
      const u = user as unknown as { id: string; role: Role; phone: string | null };
      session.user.id = u.id;
      session.user.role = u.role;
      session.user.phone = u.phone;
      return session;
    },
  },
});

// ───────── Phone OTP sessions ─────────
// Auth.js only allows credentials sign-in with JWT sessions, so OTP verify
// creates a database session through the same Session table and cookie that
// Auth.js reads. Sessions stay revocable and httpOnly.

async function isHttps() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? (process.env.AUTH_URL?.startsWith('https') ? 'https' : 'http');
  return proto === 'https';
}

export async function sessionCookieName() {
  return `${(await isHttps()) ? '__Secure-' : ''}authjs.session-token`;
}

export async function createSessionFor(userId: string) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await db.session.create({ data: { sessionToken, userId, expires } });
  const jar = await cookies();
  jar.set(await sessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: await isHttps(),
    path: '/',
    expires,
  });
}

export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser(next = '/account') {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await currentUser();
  if (!user) redirect('/login?next=/admin');
  if (!roles.includes(user.role)) redirect('/');
  return user;
}
