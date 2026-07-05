'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MobileNav from './MobileNav';
import SearchOverlay from './SearchOverlay';
import NotificationsBell from './NotificationsBell';
import ProfileDrawer from './ProfileDrawer';
import CountUp from './CountUp';
import Icon, { type IconName } from './Icon';
import type { TemplateDTO } from '@/lib/types';

// Top bar no padrão do Top Shot: nav central com ícone+texto e sublinhado no ativo,
// busca/sino/carteira/avatar à direita (seção 11.12a).
// Ícones do set central (padrão X): outline por padrão, preenchido no ativo.

const NAV: { label: string; href: string; icon: IconName; badge?: string }[] = [
  { label: 'Explorar', href: '/explorar', icon: 'explore' },
  { label: 'Drops', href: '/drops', icon: 'drops' },
  { label: 'Mercado', href: '/mercado', icon: 'market' },
  { label: 'Jogar', href: '/jogar', icon: 'play', badge: 'MATCHDAY' },
  { label: 'Check-in', href: '/checkin', icon: 'checkin' },
  { label: 'Coleção', href: '/colecao', icon: 'collection' },
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
  me: { username: string; balanceCents: number; topShotScore: number; isAdmin: boolean } | null;
  searchPopular: TemplateDTO[];
  searchCategories: { label: string; q: string }[];
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/mercado'
      ? pathname.startsWith('/mercado') || pathname.startsWith('/momento') || pathname.startsWith('/lance')
      : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#050505]/95 backdrop-blur">
      <div className="flex h-[72px] w-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <MobileNav items={MOBILE_ITEMS} />
          <Link href="/" className="flex items-center gap-2">
            <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
              <defs>
                <linearGradient id="wfmark" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ff2e88" />
                  <stop offset=".55" stopColor="#9d4edd" />
                  <stop offset="1" stopColor="#3a1e6e" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="26" fill="url(#wfmark)" />
              <path d="M10 42 Q30 8 54 28" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
              <circle cx="10" cy="42" r="4" fill="#fff" />
            </svg>
            <span className="bg-sunset bg-clip-text font-display text-[26px] uppercase leading-none tracking-tight text-transparent">
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
                className={`relative flex items-center gap-2 px-4 text-[15px] font-semibold transition-colors ${
                  active ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon name={n.icon} filled={active} size={22} />
                {n.label}
                {'badge' in n && n.badge && (
                  <span className="bg-accent2 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
                    {n.badge}
                  </span>
                )}
                {active && <span className="absolute inset-x-2 bottom-0 h-[3px] bg-ink" />}
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
                title="Saldo de teste — nenhum dinheiro real é movimentado"
                className="hidden rounded-full border border-line bg-panel px-3 py-1.5 tabular-nums text-xs text-accent3 sm:block"
              >
                <CountUp value={me.balanceCents} money />
              </Link>
              <ProfileDrawer me={me} />
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
