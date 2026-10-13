import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === 'number' ? { status: init } : init);
}

export function error(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Parse a JSON body with a Zod schema. Returns [data, null] or [null, errorResponse]. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<[z.infer<S>, null] | [null, NextResponse]> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return [null, error('Invalid JSON body.')];
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return [null, error(first?.message ?? 'Invalid input.', 422, { issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) })];
  }
  return [parsed.data, null];
}
