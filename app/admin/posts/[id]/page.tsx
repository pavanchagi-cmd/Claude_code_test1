import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PostForm } from '@/components/admin/post-form';
import { AdminPage, Notice, Submit } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';
import { db } from '@/lib/db';
import { deletePost } from '../../actions';

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const post = await db.post.findUnique({ where: { id } });
  if (!post) notFound();
  return (
    <AdminPage
      title={post.title}
      actions={
        <>
          <Link href={`/journal/${post.slug}`} target="_blank" className="btn btn-outline min-h-10 px-4 text-[14.5px]">
            View
          </Link>
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <Submit variant="danger">Delete</Submit>
          </form>
        </>
      }
    >
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <PostForm post={post} />
    </AdminPage>
  );
}
