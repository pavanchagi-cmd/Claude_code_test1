import { Card, Checkbox, Input, Select, Submit, Textarea } from '@/components/admin/ui';
import { savePost } from '@/app/admin/actions';
import { JOURNAL_CATEGORIES } from '@/lib/journal';
import type { Post } from '@/lib/generated/prisma/client';

export function PostForm({ post }: { post: Post | null }) {
  return (
    <form action={savePost} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Title" name="title" defaultValue={post?.title} required className="md:col-span-2" />
          <Input label="Slug" name="slug" defaultValue={post?.slug} />
          <Select label="Category" name="category" defaultValue={post?.category ?? 'Guides'} options={JOURNAL_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Input label="Reading time (min)" name="readingMin" type="number" defaultValue={post?.readingMin} hint="Leave blank to estimate." />
          <Input label="Publish date" name="publishedAt" type="datetime-local" defaultValue={post?.publishedAt?.toISOString().slice(0, 16)} />
          <Textarea label="Summary (shown on cards)" name="excerpt" defaultValue={post?.excerpt} rows={2} className="md:col-span-3" />
          <Textarea
            label="Body"
            name="body"
            defaultValue={post?.body}
            rows={16}
            required
            className="md:col-span-3"
            hint="Markdown: ## Heading, blank line between paragraphs, - lists, **bold**, [link](/watches)."
          />
          <div>
            <label htmlFor="coverFile" className="label text-[13.5px]">
              Cover image
            </label>
            <input id="coverFile" type="file" name="coverFile" accept="image/*" className="text-[14px]" />
          </div>
          <Input label="…or cover image URL" name="coverImage" defaultValue={post?.coverImage} />
          <Input label="Placeholder colour" name="coverColor" defaultValue={post?.coverColor} placeholder="#E5E1DA" />
          <Input label="Related product slugs (comma separated)" name="related" defaultValue={post?.relatedProductSlugs.join(', ')} className="md:col-span-3" />
          <Input label="SEO title" name="seoTitle" defaultValue={post?.seoTitle} />
          <Input label="SEO description" name="seoDescription" defaultValue={post?.seoDescription} className="md:col-span-2" />
        </div>
        <div className="mt-4 flex gap-6">
          <Checkbox label="Published" name="published" defaultChecked={post ? Boolean(post.publishedAt) : false} />
          <Checkbox label="Featured" name="featured" defaultChecked={post?.featured} />
        </div>
      </Card>
      <Submit>{post ? 'Save post' : 'Create post'}</Submit>
    </form>
  );
}
