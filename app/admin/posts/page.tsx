import Link from 'next/link';
import { AdminPage, Table, Td } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PostsAdmin() {
  await requireStaff();
  const posts = await db.post.findMany({ orderBy: { updatedAt: 'desc' } });
  return (
    <AdminPage
      title="Journal"
      actions={
        <Link href="/admin/posts/new" className="btn btn-primary min-h-10 px-4 text-[14.5px]">
          New post
        </Link>
      }
    >
      <Table head={['Title', 'Category', 'Status', 'Updated']}>
        {posts.map((p) => (
          <tr key={p.id}>
            <Td>
              <Link href={`/admin/posts/${p.id}`} className="link font-medium">
                {p.title}
              </Link>
            </Td>
            <Td>{p.category}</Td>
            <Td>{p.publishedAt ? (p.publishedAt > new Date() ? 'Scheduled' : 'Published') : 'Draft'}</Td>
            <Td>{p.updatedAt.toLocaleDateString('en-IN')}</Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
