import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';

const SESSION_COOKIES = ['__Secure-authjs.session-token', 'authjs.session-token'];

function sessionToken(req: NextRequest) {
  for (const name of SESSION_COOKIES) {
    const v = req.cookies.get(name)?.value;
    if (v) return v;
  }
  return null;
}

function toLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

/**
 * Route guard. /account needs a session; /admin also needs the ADMIN or STAFF
 * role (checked against the database session). Pages re-check on the server.
 */
export async function proxy(req: NextRequest) {
  const token = sessionToken(req);
  if (!token) return toLogin(req);
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const session = await db.session.findUnique({ where: { sessionToken: token }, select: { expires: true, user: { select: { role: true } } } });
    if (!session || session.expires < new Date()) return toLogin(req);
    if (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF') return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/account/:path*', '/admin/:path*'] };
