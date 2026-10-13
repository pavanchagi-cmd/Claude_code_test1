export function JsonLd({ data }: { data: unknown }) {
  // Escape "<" so content can never close the script tag.
  const html = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />;
}
