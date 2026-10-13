import Link from 'next/link';
import type { ReactNode } from 'react';

export function AdminPage({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-sans text-[26px] font-semibold">{title}</h1>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      {title && <h2 className="mb-4 font-sans text-[17px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Input({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  placeholder,
  hint,
  step,
  className = '',
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  step?: string;
  className?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label text-[13.5px]">
        {label}
        {required && <span className="text-warning"> *</span>}
      </label>
      <input id={id} name={name} type={type} step={step} defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} className="input min-h-10 text-[15px]" />
      {hint && <p className="mt-1 text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Textarea({
  label,
  name,
  defaultValue,
  rows = 5,
  hint,
  required,
  className = '',
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label text-[13.5px]">
        {label}
      </label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ''} required={required} className="input min-h-0 text-[15px]" />
      {hint && <p className="mt-1 text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  className = '',
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string | null;
  className?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label text-[13.5px]">
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue ?? ''} className="input min-h-10 text-[15px]">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-[15px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" /> {label}
    </label>
  );
}

export function Submit({ children = 'Save', variant = 'primary' }: { children?: ReactNode; variant?: 'primary' | 'outline' | 'danger' }) {
  const cls = variant === 'primary' ? 'btn btn-primary' : variant === 'danger' ? 'btn btn-outline text-warning' : 'btn btn-outline';
  return (
    <button type="submit" className={`${cls} min-h-10 px-4 text-[14.5px]`}>
      {children}
    </button>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className="w-full text-left text-[14.5px]">
        <thead className="bg-stone text-[13px] tracking-[0.04em] text-body-2 uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '', colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`border-t border-line px-4 py-3 align-top ${className}`}>
      {children}
    </td>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn btn-outline min-h-10 px-4 text-[14.5px]">
      {children}
    </Link>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return <p className={`mb-4 p-3 text-[14.5px] ${tone === 'warn' ? 'bg-sand text-warning' : 'bg-stone text-body-2'}`}>{children}</p>;
}
