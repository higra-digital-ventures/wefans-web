'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MobileNav from './MobileNav';
import SearchOverlay from './SearchOverlay';
import NotificationsBell from './NotificationsBell';
import { brl } from '@/lib/format';
import type { TemplateDTO } from '@/lib/types';

// Top bar no padrão do Top Shot: nav central com ícone+texto e sublinhado no ativo,
// busca/sino/carteira/avatar à direita (seção 11.12a).

const I = {
  explore: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.2 5.8-2.4 6-6 2.4 2.4-6 6-2.4Z" />,
  drops: <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3L18.6 8 12 11.7 5.4 8 12 4.3ZM5 9.7l6 3.4v6.6l-6-3.4V9.7Zm8 10v-6.6l6-3.4v6.6l-6 3.4Z" />,
  market: <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Zm0 2h12l1.5 2h-15L6 4Zm-1 4h14v12H5V8Zm4 2v2a3 3 0 0 0 6 0v-2h-2v2a1 1 0 0 1-2 0v-2H9Z" />,
  play: <path d="M7 6a5 5 0 0 0-5 5v4a3 3 0 0 0 5.4 1.8L9 15h6l1.6 1.8A3 3 0 0 0 22 15v-4a5 5 0 0 0-5-5H7Zm1 3h2v2h2v2h-2v2H8v-2H6v-2h2V9Zm8 .5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm2.5 3a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />,
  checkin: <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />,
  collection: <path d="M4 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v14h10V5H4Zm14 1h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-2v-2h2V8h-2V6Z" />,
  search: <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />,
  bell: <path d="M12 2a6 6 0 0 0-6 6v3.6L4 15v2h16v-2l-2-3.4V8a6 6 0 0 0-6-6Zm-2 17a2 2 0 0 0 4 0h-4Z" />,
};

function Icon({ d }: { d: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
      {d}
    </svg>
  );
}

const NAV = [
  { label: 'Explorar', href: '/explorar', icon: I.explore },
  { label: 'Drops', href: '/drops', icon: I.drops },
  { label: 'Mercado', href: '/mercado', icon: I.market },
  { label: 'Jogar', href: '/jogar/desafios', icon: I.play, badge: 'MATCHDAY' },
  { label: 'Check-in', href: '/checkin', icon: I.checkin },
  { label: 'Coleção', href: '/colecao', icon: I.collection },
];

const MOBILE_ITEMS = [
  ...NAV.map((n) => ({ label: n.label, href: n.href })),
  { label: 'Pacotes', href: '/pacotes' },
  { label: 'Vitrines', href: '/vitrines' },
];

export default function NavClient({
  me,
  searchPopular,
  searchCategories,
}: {
  me: { username: string; balanceCents: number; isAdmin: boolean } | null;
  searchPopular: TemplateDTO[];
  searchCategories: { label: string; q: string }[];
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/mercado'
      ? pathname.startsWith('/mercado') || pathname.startsWith('/momento') || pathname.startsWith('/lance')
      : href === '/jogar/desafios'
        ? pathname.startsWith('/jogar')
        : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#050505]/95 backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <MobileNav items={MOBILE_ITEMS} />
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="bg-sunset bg-clip-text font-display text-[22px] uppercase leading-none tracking-tight text-transparent">
              wefans
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted">beta</span>
          </Link>
        </div>

        <nav className="hidden h-full items-stretch gap-1 lg:flex" aria-label="principal">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative flex items-center gap-2 px-3 text-[13px] font-semibold transition-colors ${
                  active ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon d={n.icon} />
                {n.label}
                {'badge' in n && n.badge && (
                  <span className="bg-accent2 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
                    {n.badge}
                  </span>
                )}
                {active && <span className="absolute inset-x-2 bottom-0 h-[3px]  bg-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          {me?.isAdmin && (
            <Link
              href="/admin"
              className="mr-1 hidden  border border-accent2/40 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-accent2 sm:block"
            >
              Admin
            </Link>
          )}
          <SearchOverlay popular={searchPopular} categories={searchCategories} />
          {me && <NotificationsBell />}
          {me ? (
            <>
              <Link
                href="/perfil"
                className="hidden rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-xs text-accent3 sm:block"
              >
                {brl(me.balanceCents)}
              </Link>
              <Link
                href="/perfil"
                aria-label={`Perfil de ${me.username}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset text-sm font-bold uppercase text-white"
              >
                {me.username[0]}
              </Link>
            </>
          ) : (
            <Link
              href="/entrar"
              className="bg-accent px-4 py-1.5 text-[13px] font-bold uppercase tracking-wide text-white"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
