import { AdminPage, Submit, Table, Td } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import { resolveTicket } from '../actions';

export const dynamic = 'force-dynamic';

export default async function TicketsAdmin() {
  await requireStaff();
  const tickets = await db.supportTicket.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200 });
  return (
    <AdminPage title="Support tickets">
      <Table head={['Received', 'From', 'Topic', 'Message', 'Status']}>
        {tickets.map((t) => (
          <tr key={t.id}>
            <Td>{t.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Td>
            <Td>
              {t.name}
              <span className="block text-[13px] text-muted">{t.contact}</span>
            </Td>
            <Td>
              {t.topic}
              {t.orderNumber && <span className="block text-[13px] text-muted">#{t.orderNumber}</span>}
            </Td>
            <Td className="max-w-[420px] whitespace-pre-line">{t.message}</Td>
            <Td>
              <form action={resolveTicket}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="status" value={t.status === 'OPEN' ? 'RESOLVED' : 'OPEN'} />
                <Submit variant="outline">{t.status === 'OPEN' ? 'Mark resolved' : 'Reopen'}</Submit>
              </form>
            </Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
