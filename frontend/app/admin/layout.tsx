import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getMe } from '@/lib/api-server';

const NAV = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/parcerias', label: 'Parcerias' },
  { href: '/admin/conteudo', label: 'Conteúdo' },
  { href: '/admin/jogos', label: 'Jogos' },
  { href: '/admin/fraude', label: 'Fraude' },
  { href: '/admin/conduta', label: 'Conduta' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (!me?.isAdmin) redirect('/');

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4  border border-accent2/30 bg-accent2/5 px-4 py-3">
        <span className="font-display text-lg uppercase text-accent2">Admin</span>
        <nav className="flex flex-wrap gap-4 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-muted transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
