import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { addressSchema } from '@/lib/validation/schemas';

const createSchema = addressSchema.extend({ isDefault: z.boolean().optional() });
const updateSchema = addressSchema.partial().extend({ id: z.string().min(1).max(40), isDefault: z.boolean().optional() });
const deleteSchema = z.object({ id: z.string().min(1).max(40) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const [body, err] = await parseBody(req, createSchema);
  if (err) return err;
  const count = await db.address.count({ where: { userId: user.id } });
  const isDefault = body.isDefault || count === 0;
  await db.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.create({ data: { ...body, landmark: body.landmark || null, userId: user.id, isDefault } });
  });
  return json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const [body, err] = await parseBody(req, updateSchema);
  if (err) return err;
  const { id, isDefault, ...data } = body;
  const owned = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!owned) return error('Address not found.', 404);
  await db.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.update({ where: { id }, data: { ...data, landmark: data.landmark === '' ? null : data.landmark, isDefault: isDefault ?? undefined } });
  });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const [body, err] = await parseBody(req, deleteSchema);
  if (err) return err;
  const owned = await db.address.findFirst({ where: { id: body.id, userId: user.id } });
  if (!owned) return error('Address not found.', 404);
  await db.address.delete({ where: { id: body.id } });
  if (owned.isDefault) {
    const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return json({ ok: true });
}
