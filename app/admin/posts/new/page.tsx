import { PostForm } from '@/components/admin/post-form';
import { AdminPage, Notice } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin';

export default async function NewPost({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  return (
    <AdminPage title="New post">
      {sp.error && <Notice tone="warn">{sp.error}</Notice>}
      <PostForm post={null} />
    </AdminPage>
  );
}
