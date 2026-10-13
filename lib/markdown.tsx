import Link from 'next/link';
import type { ReactNode } from 'react';

// Minimal, safe Markdown for admin-edited content (policies, journal): ## and
// ### headings, paragraphs, "- " lists, **bold** and [links](/path). No raw HTML.

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2]) out.push(<strong key={`${keyBase}-b${i++}`}>{m[2]}</strong>);
    else if (m[3] && m[4]) {
      const href = m[4];
      const safe = href.startsWith('/') || /^https?:\/\//.test(href) || href.startsWith('mailto:');
      out.push(
        safe ? (
          href.startsWith('/') ? (
            <Link key={`${keyBase}-l${i++}`} href={href} className="link">
              {m[3]}
            </Link>
          ) : (
            <a key={`${keyBase}-l${i++}`} href={href} className="link" rel="noopener noreferrer" target="_blank">
              {m[3]}
            </a>
          )
        ) : (
          m[3]
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, headingClass }: { source: string; headingClass?: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const b = block.trim();
        if (!b) return null;
        if (b.startsWith('### ')) return <h3 key={bi}>{inline(b.slice(4), `h${bi}`)}</h3>;
        if (b.startsWith('## ')) {
          const [first, ...rest] = b.split('\n');
          return (
            <div key={bi}>
              <h2 className={headingClass}>{inline(first.slice(3), `h${bi}`)}</h2>
              {rest.length > 0 && <p>{inline(rest.join(' '), `p${bi}`)}</p>}
            </div>
          );
        }
        const lines = b.split('\n');
        if (lines.every((l) => /^[-*] /.test(l.trim())))
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.trim().slice(2), `li${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        return <p key={bi}>{inline(lines.join(' '), `p${bi}`)}</p>;
      })}
    </>
  );
}

/** Plain-text excerpt for meta descriptions. */
export function plainText(source: string, max = 160) {
  const t = source
    .replace(/[#*[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
