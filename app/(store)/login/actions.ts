'use server';

import { signIn, signOut } from '@/lib/auth';
import { configured } from '@/lib/env';
import { emailSchema } from '@/lib/validation/schemas';

function safeNext(next: string | null | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';
}

export async function googleSignIn(next: string | null) {
  if (!configured.google) return { error: 'Google sign-in is not configured yet.' };
  await signIn('google', { redirectTo: safeNext(next) });
  return {};
}

export async function emailSignIn(_: unknown, form: FormData) {
  const parsed = emailSchema.safeParse(form.get('email'));
  if (!parsed.success) return { error: 'Enter a valid email address.' };
  await signIn('resend', { email: parsed.data, redirectTo: safeNext(String(form.get('next') ?? '')) });
  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
